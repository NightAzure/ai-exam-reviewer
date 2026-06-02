"use client";

import useSWR from "swr";
import { useCallback, useMemo, useState } from "react";
import type { CourseNote } from "@/types/course";

type CourseNotesResponse = {
  notes: CourseNote[];
};

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

export function useCourseNotes(courseId: number | string | undefined) {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const key = useMemo(
    () => (courseId ? `/api/course/${courseId}/notes` : null),
    [courseId],
  );

  const { data, error, isLoading, mutate } = useSWR<CourseNotesResponse>(
    key,
    fetchJson<CourseNotesResponse>,
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
          mutation instanceof Error ? mutation.message : "Unable to update notes";
        setMutationError(message);
        throw mutation;
      } finally {
        setIsMutating(false);
      }
    },
    [mutate],
  );

  const createNote = useCallback(
    async (input: { title: string; content: string; topicId?: number | null }) => {
      if (!key) return;
      return runMutation(async () =>
        fetchJson<CourseNotesResponse>(key, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    [key, runMutation],
  );

  const updateNote = useCallback(
    async (noteId: number, input: { title: string; content: string; topicId?: number | null }) => {
      if (!courseId) return;
      return runMutation(async () =>
        fetchJson<CourseNotesResponse>(`/api/course/${courseId}/notes/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    [courseId, runMutation],
  );

  const deleteNote = useCallback(
    async (noteId: number) => {
      if (!courseId) return;
      return runMutation(async () =>
        fetchJson<CourseNotesResponse>(`/api/course/${courseId}/notes/${noteId}`, {
          method: "DELETE",
        }),
      );
    },
    [courseId, runMutation],
  );

  return {
    notes: data?.notes ?? [],
    isLoading,
    isMutating,
    error: mutationError ?? (error instanceof Error ? error.message : null),
    createNote,
    updateNote,
    deleteNote,
  };
}
