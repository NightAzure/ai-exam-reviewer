'use client'

import useSWR from 'swr';
import { createClient } from '@/utils/supabase/client';
import type { DetailedCourse } from '@/types/course';

type CourseRow = {
  id: number;
  title: string;
  description: string | null;
};

type TopicRow = {
  id: number;
  name: string;
  description?: string | null;
};

const createEmptyDetailedCourse = (courseId: number): DetailedCourse => ({
  id: courseId,
  title: 'Loading course...',
  description: '',
  overallProgress: 0,
  strengths: [],
  weaknesses: [],
  suggestions: [],
  topics: [],
  assessments: [],
  notes: [],
});

export function useChatCourse(courseId: number) {
  const supabase = createClient();

  return useSWR(
    Number.isFinite(courseId) ? ['chat-course', courseId] : null,
    async (): Promise<DetailedCourse> => {
      const [{ data: course, error: courseError }, { data: topics, error: topicsError }] =
        await Promise.all([
          supabase
            .from('courses')
            .select('id, title, description')
            .eq('id', courseId)
            .single(),
          supabase
            .from('topics')
            .select('id, name, description')
            .eq('course_id', courseId)
            .order('id', { ascending: true }),
        ]);

      if (courseError) throw courseError;
      if (topicsError) throw topicsError;

      const courseRow = course as CourseRow | null;
      if (!courseRow) {
        return createEmptyDetailedCourse(courseId);
      }

      return {
        id: courseRow.id,
        title: courseRow.title,
        description: courseRow.description ?? '',
        overallProgress: 0,
        strengths: [],
        weaknesses: [],
        suggestions: [],
        topics: ((topics ?? []) as TopicRow[]).map((topic) => ({
          id: topic.id,
          name: topic.name,
          description: topic.description ?? undefined,
          progress: 0,
        })),
        assessments: [],
        notes: [],
      };
    },
    {
      fallbackData: createEmptyDetailedCourse(courseId),
      revalidateOnFocus: false,
    },
  );
}
