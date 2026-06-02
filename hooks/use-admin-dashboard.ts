"use client";

import useSWR from "swr";
import type { AdminDashboardAnalytics } from "@/types/admin-analytics";

const fetcher = async (url: string): Promise<AdminDashboardAnalytics> => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Unable to load dashboard analytics",
    );
  }

  return payload as AdminDashboardAnalytics;
};

export function useAdminDashboard() {
  const { data, error, isLoading } = useSWR("/api/admin/dashboard", fetcher);

  return {
    analytics: data,
    error: error instanceof Error ? error.message : null,
    isLoading,
  };
}
