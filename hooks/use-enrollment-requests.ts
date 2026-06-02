"use client";

import useSWR from "swr";
import { useCallback, useMemo, useState } from "react";

export type EnrollmentRequest = {
  studentId: string;
  name: string;
  email: string | null;
  requestedAt: string;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Request failed";
    throw new Error(message);
  }
  return payload as T;
};

export function useEnrollmentRequests(courseId: number | string | undefined) {
  const [isMutating, setIsMutating] = useState(false);

  const key = useMemo(
    () => (courseId ? `/api/admin/course/${courseId}/enrollment-requests` : null),
    [courseId],
  );

  const { data, error, isLoading, mutate } = useSWR<{ requests: EnrollmentRequest[] }>(
    key,
    fetchJson<{ requests: EnrollmentRequest[] }>,
  );

  const act = useCallback(
    async (studentId: string, action: "approve" | "reject") => {
      if (!key) return;
      setIsMutating(true);
      try {
        const res = await fetch(key, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, action }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null) as { message?: string } | null;
          throw new Error(payload?.message ?? "Failed");
        }
        await mutate();
      } finally {
        setIsMutating(false);
      }
    },
    [key, mutate],
  );

  return {
    requests: data?.requests ?? [],
    count: data?.requests.length ?? 0,
    isLoading,
    isMutating,
    error: error instanceof Error ? error.message : null,
    approve: (studentId: string) => act(studentId, "approve"),
    reject: (studentId: string) => act(studentId, "reject"),
  };
}
