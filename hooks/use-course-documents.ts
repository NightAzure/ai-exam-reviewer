"use client";

import useSWR from "swr";
import { useCallback, useMemo, useState } from "react";
import type { CourseDocument, CourseDocumentsResponse } from "@/types/course-document";

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

export function useCourseDocuments(courseId: number | string | undefined) {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [activeOperation, setActiveOperation] = useState<"upload" | "delete" | null>(null);

  const key = useMemo(
    () => (courseId ? `/api/admin/course/${courseId}/documents` : null),
    [courseId],
  );

  const { data, error, isLoading, mutate } = useSWR<CourseDocumentsResponse>(
    key,
    fetchJson<CourseDocumentsResponse>,
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
          mutation instanceof Error ? mutation.message : "Unable to update documents";
        setMutationError(message);
        throw mutation;
      } finally {
        setIsMutating(false);
      }
    },
    [mutate],
  );

  const uploadDocuments = useCallback(
    async (files: FileList | File[]) => {
      if (!key) return;
      setActiveOperation("upload");

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      try {
        return await runMutation(async () =>
          fetchJson<{ documents: CourseDocument[] }>(key, {
            method: "POST",
            body: formData,
          }),
        );
      } finally {
        setActiveOperation(null);
      }
    },
    [key, runMutation],
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (!courseId) return;
      setActiveOperation("delete");

      try {
        return await runMutation(async () =>
          fetchJson<{ documents: CourseDocument[] }>(
            `/api/admin/course/${courseId}/documents/${documentId}`,
            {
              method: "DELETE",
            },
          ),
        );
      } finally {
        setActiveOperation(null);
      }
    },
    [courseId, runMutation],
  );

  return {
    documents: data?.documents ?? [],
    isLoading,
    isMutating,
    activeOperation,
    error: mutationError ?? (error instanceof Error ? error.message : null),
    uploadDocuments,
    deleteDocument,
  };
}
