"use client";

import useSWR from "swr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { Course } from "@/types/new_course";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/utils/supabase/enrollment-statuses";

type CourseRow = Course & {
  instructor:
    | {
        id: number;
        first_name: string;
        second_name: string;
      }
    | {
        id: number;
        first_name: string;
        second_name: string;
      }[];
};

const instructorSelect = `
  *,
  instructor:profiles!instructor_id(id, first_name, second_name)
`;

/** Load courses by id with instructor embed (avoids PostgREST 400 on nested enrollments→courses→profiles). */
async function fetchCoursesByIds(supabase: SupabaseClient, courseIds: number[]) {
  const unique = [...new Set(courseIds.filter((id) => Number.isFinite(id)))];
  if (unique.length === 0) return [] as CourseRow[];
  const { data, error } = await supabase
    .from("courses")
    .select(instructorSelect)
    .in("id", unique);
  if (error) throw error;
  return (data ?? []) as CourseRow[];
}

export function useMyCourses() {
  return useSWR("my-courses", async () => {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) return [] as Course[];

    const [
      { data: enrollmentLinks, error: enrolledError },
      { data: staffLinks, error: staffError },
      { data: instructorRows, error: instructorError },
    ] = await Promise.all([
      supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id)
        .in("status", [...ACTIVE_ENROLLMENT_STATUSES]),
      supabase
        .from("course_staff")
        .select(
          `
            course:courses(
              *,
              instructor:profiles!instructor_id(id, first_name, second_name)
            )
          `,
        )
        .eq("user_id", user.id),
      supabase
        .from("courses")
        .select(
          `
            *,
            instructor:profiles!instructor_id(id, first_name, second_name)
          `,
        )
        .eq("instructor_id", user.id),
    ]);

    if (enrolledError) throw enrolledError;
    if (staffError) throw staffError;
    if (instructorError) throw instructorError;

    const linkCourseIds = [
      ...((enrollmentLinks ?? []) as { course_id: number }[]).map((r) => r.course_id),
      ...((staffLinks ?? []) as { course_id: number }[]).map((r) => r.course_id),
    ];
    const linkedCourses = await fetchCoursesByIds(supabase, linkCourseIds);

    const allCourses = [
      ...linkedCourses,
      ...((instructorRows ?? []) as CourseRow[]),
    ] as CourseRow[];

    const deduped = new Map<number, Course>();
    allCourses.forEach((course) => {
      const instructor = Array.isArray(course.instructor)
        ? course.instructor[0]
        : course.instructor;

      deduped.set(course.id, {
        ...course,
        instructor: instructor ?? course.instructor,
      });
    });

    return Array.from(deduped.values()).sort((left, right) =>
      left.title.localeCompare(right.title),
    );
  });
}
