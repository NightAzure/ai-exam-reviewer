"use client";

import useSWR from "swr";
import { useCallback, useMemo, useState } from "react";
import type {
  CourseMember,
  CourseMemberRole,
  CourseMembersResponse,
} from "@/types/course-member";

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Request failed";
    throw new Error(message);
  }

  return payload as T;
};

export function useCourseMembers(courseId: number | string | undefined) {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const key = useMemo(
    () => (courseId ? `/api/admin/course/${courseId}/members` : null),
    [courseId],
  );

  const { data, error, isLoading, mutate } = useSWR<CourseMembersResponse>(
    key,
    fetchJson<CourseMembersResponse>,
  );

  const runMutation = useCallback(
    async <T,>(executor: () => Promise<T>) => {
      setIsMutating(true);
      setMutationError(null);

      try {
        const result = await executor();
        await mutate();
        return result;
      } catch (mutation) {
        const message =
          mutation instanceof Error ? mutation.message : "Unable to update members";
        setMutationError(message);
        throw mutation;
      } finally {
        setIsMutating(false);
      }
    },
    [mutate],
  );

  const addMembers = useCallback(
    async (emails: string[], role: CourseMemberRole) => {
      if (!key) return;

      return runMutation(async () =>
        fetchJson<{ members: CourseMember[]; warnings?: string[] }>(key, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails, role }),
        }),
      );
    },
    [key, runMutation],
  );

  const updateMemberRole = useCallback(
    async (userId: string, role: CourseMemberRole) => {
      if (!key) return;

      return runMutation(async () =>
        fetchJson<{ members: CourseMember[] }>(key, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role }),
        }),
      );
    },
    [key, runMutation],
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!key) return;

      return runMutation(async () =>
        fetchJson<{ members: CourseMember[] }>(key, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }),
      );
    },
    [key, runMutation],
  );

  return {
    members: data?.members ?? [],
    isLoading,
    isMutating,
    error: mutationError ?? (error instanceof Error ? error.message : null),
    addMembers,
    updateMemberRole,
    removeMember,
    mutate,
  };
}
