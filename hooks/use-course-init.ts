'use client'

import { useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useCourseStore } from '@/stores/course-store';
import type { Course, Topic, TopicSubtopic } from '@/types/course';

type CourseRow = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url?: string | null;
  is_active?: boolean | null;
  allow_self_enrollment?: boolean | null;
  require_enrollment_approval?: boolean | null;
  start_date?: string | null;
  end_date?: string | null;
  enrollment_limit?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  instructor?:
    | {
        id: string;
        first_name?: string | null;
        second_name?: string | null;
      }
    | {
    id: string;
    first_name?: string | null;
    second_name?: string | null;
      }[]
    | null;
};

type TopicRow = {
  id: number;
  course_id: number;
  name: string;
  description?: string | null;
};

type SubtopicRow = {
  id: number;
  course_id: number;
  topic_id: number;
  name: string;
  description?: string | null;
  order_index?: number | null;
};

const emptyInsights = {
  strengths: [] as string[],
  weaknesses: [] as string[],
  suggestions: [] as string[],
};

const createDefaultStats = (topics: Topic[]) => {
  if (topics.length === 0) {
    return {
      totalStudents: 0,
      proficient: 0,
      needsReview: 0,
      averageProgress: 0,
    };
  }

  const totalProgress = topics.reduce((sum, topic) => sum + topic.progress, 0);
  return {
    totalStudents: 0,
    proficient: 0,
    needsReview: 0,
    averageProgress: Math.round(totalProgress / topics.length),
  };
};

const mapCourseRow = (course: CourseRow, topics: Topic[]): Course => {
  const instructor = Array.isArray(course.instructor)
    ? course.instructor[0]
    : course.instructor;

  const instructorName = [instructor?.first_name, instructor?.second_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    id: course.id,
    // Join codes are deliberately never sent to the learner workspace.
    code: "",
    title: course.title,
    description: course.description ?? '',
    thumbnail: course.thumbnail_url ?? undefined,
    instructor: {
      id: instructor?.id ?? '',
      name: instructorName || 'Unknown Instructor',
      email: undefined,
    },
    isActive: Boolean(course.is_active),
    allowSelfEnrollment: course.allow_self_enrollment ?? true,
    requireEnrollmentApproval: course.require_enrollment_approval ?? false,
    startDate: course.start_date ?? undefined,
    endDate: course.end_date ?? undefined,
    enrollmentLimit: course.enrollment_limit ?? undefined,
    topics,
    stats: createDefaultStats(topics),
    insights: emptyInsights,
    createdAt: course.created_at ?? new Date(0).toISOString(),
    updatedAt: course.updated_at ?? new Date(0).toISOString(),
    createdBy: course.created_by ?? undefined,
  };
};

export function useCourseInit(courseId?: number) {
  const setCourses = useCourseStore((state) => state.setCourses);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      const coursesQuery = supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          is_active,
          allow_self_enrollment,
          require_enrollment_approval,
          start_date,
          end_date,
          enrollment_limit,
          created_at,
          updated_at,
          created_by,
          instructor:profiles!instructor_id(id, first_name, second_name)
        `)
        .order('id', { ascending: true });

      const scopedCoursesQuery =
        typeof courseId === 'number' ? coursesQuery.eq('id', courseId) : coursesQuery;

      const [
        { data: coursesData, error: coursesError },
        { data: topicsData, error: topicsError },
        { data: subtopicsData, error: subtopicsError },
      ] =
        await Promise.all([
          scopedCoursesQuery,
          supabase
            .from('topics')
            .select('id, course_id, name, description')
            .order('id', { ascending: true }),
          supabase
            .from('topic_subtopics')
            .select('id, course_id, topic_id, name, description, order_index')
            .order('order_index', { ascending: true }),
        ]);

      if (coursesError) {
        console.error('Failed to load courses from Supabase:', coursesError);
        return;
      }

      if (topicsError) {
        console.error('Failed to load topics from Supabase:', topicsError);
        return;
      }
      if (subtopicsError) {
        console.error('Failed to load subtopics from Supabase:', subtopicsError);
        return;
      }

      if (cancelled) return;

      const topicsByCourse = new Map<number, Topic[]>();
      const subtopicsByTopic = new Map<number, TopicSubtopic[]>();

      ((subtopicsData ?? []) as SubtopicRow[]).forEach((subtopic) => {
        if (typeof courseId === 'number' && subtopic.course_id !== courseId) return;

        const current = subtopicsByTopic.get(subtopic.topic_id) ?? [];
        current.push({
          id: subtopic.id,
          courseId: subtopic.course_id,
          topicId: subtopic.topic_id,
          name: subtopic.name,
          description: subtopic.description ?? undefined,
          orderIndex: subtopic.order_index ?? current.length,
        });
        subtopicsByTopic.set(subtopic.topic_id, current);
      });

      ((topicsData ?? []) as TopicRow[]).forEach((topic) => {
        if (typeof courseId === 'number' && topic.course_id !== courseId) return;

        const current = topicsByCourse.get(topic.course_id) ?? [];
        current.push({
          id: topic.id,
          name: topic.name,
          description: topic.description ?? undefined,
          progress: 0,
          subtopics: subtopicsByTopic.get(topic.id) ?? [],
        });
        topicsByCourse.set(topic.course_id, current);
      });

      const mappedCourses = ((coursesData ?? []) as CourseRow[]).map((course) =>
        mapCourseRow(course, topicsByCourse.get(course.id) ?? []),
      );

      setCourses(mappedCourses);
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, [courseId, setCourses, supabase]);
}
