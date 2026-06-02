"use client";

import useSWR from "swr";
import type { CourseAnalytics } from "@/types/course";

export type { CourseAnalytics };

const fetcher = async (url: string): Promise<CourseAnalytics> => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Unable to load course analytics",
    );
  }

  return payload as CourseAnalytics;
};

export function useCourseAnalytics(courseId: number) {
  const { data, error, isLoading } = useSWR(
    courseId ? `/api/course/${courseId}/analytics` : null,
    fetcher,
  );

  return {
    analytics: data,
    error: error instanceof Error ? error.message : null,
    isLoading,
  };
}
