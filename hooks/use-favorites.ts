"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";

const FAVORITES_KEY = "course-favorites";

async function fetchFavorites(): Promise<number[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("course_favorites")
    .select("course_id")
    .eq("user_id", user.id);

  if (error) throw error;
  return (data ?? []).map((row: { course_id: number }) => row.course_id);
}

export function useFavorites() {
  const { data: favoriteIds = [], mutate } = useSWR(FAVORITES_KEY, fetchFavorites);

  const isFavorited = useCallback(
    (courseId: number) => favoriteIds.includes(courseId),
    [favoriteIds],
  );

  const toggle = useCallback(
    async (courseId: number) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const alreadyFavorited = favoriteIds.includes(courseId);

      // Optimistic update
      const next = alreadyFavorited
        ? favoriteIds.filter((id) => id !== courseId)
        : [...favoriteIds, courseId];
      mutate(next, false);

      if (alreadyFavorited) {
        await supabase
          .from("course_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("course_id", courseId);
      } else {
        await supabase
          .from("course_favorites")
          .insert({ user_id: user.id, course_id: courseId });
      }

      mutate(); // revalidate from server
    },
    [favoriteIds, mutate],
  );

  return { isFavorited, toggle };
}
