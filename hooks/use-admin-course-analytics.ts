"use client";

import useSWR from "swr";
import type { AdminCourseAnalytics } from "@/types/admin-analytics";

const fetcher = async (url: string): Promise<AdminCourseAnalytics> => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Unable to load course analytics",
    );
  }

  return payload as AdminCourseAnalytics;
};

export function useAdminCourseAnalytics(courseId: number) {
  const { data, error, isLoading } = useSWR(
    courseId ? `/api/admin/course/${courseId}/analytics` : null,
    fetcher,
  );

  return {
    analytics: data,
    error: error instanceof Error ? error.message : null,
    isLoading,
  };
}
