"use client";
import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import useSWR from "swr";

type Thread = {
  id: number;
  title: string | null;
};

const THREADS_KEY = "sidebar-threads";

export function useSidebarThreads() {
  const pathname = usePathname();
  const router = useRouter();

  // Extract courseId from any /course/[id] path (course page or chat)
  const match = pathname.match(/^\/course\/(\d+)/);
  const courseId = match ? Number(match[1]) : null;

  // Extract active chatId from /course/[id]/chat/[chatId]
  const chatMatch = pathname.match(/^\/course\/\d+\/chat\/(.+)$/);
  const activeChatId = chatMatch ? chatMatch[1] : null;

  const { data: threads = [], mutate } = useSWR<Thread[]>(
    courseId !== null ? [THREADS_KEY, courseId] : null,
    async ([, cid]: [string, number]) => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      const { data } = await supabase
        .from("chat_threads")
        .select("id, title")
        .eq("course_id", cid)
        .eq("user_id", userData.user.id)
        .eq("archived", false)
        .order("updated_at", { ascending: false });
      return (data ?? []) as Thread[];
    },
    {
      // Always fetch fresh data on mount but serve cache instantly in the meantime.
      revalidateOnMount: true,
    },
  );

  const navigateTo = useCallback(
    (threadId: number) => {
      router.push(`/course/${courseId}/chat/${threadId}`);
    },
    [router, courseId],
  );

  const newThread = useCallback(() => {
    router.push(`/course/${courseId}/chat`);
  }, [router, courseId]);

  const deleteThread = useCallback(
    async (threadId: number) => {
      // Optimistic update — remove immediately so the UI feels instant.
      mutate((prev = []) => prev.filter((t) => t.id !== threadId), {
        revalidate: false,
      });
      await fetch(`/api/threads/${threadId}`, { method: "DELETE" });
    },
    [mutate],
  );

  /** Call after a new thread is created so the sidebar refreshes. */
  const refreshThreads = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    threads,
    courseId,
    activeChatId,
    navigateTo,
    newThread,
    deleteThread,
    refreshThreads,
  };
}
