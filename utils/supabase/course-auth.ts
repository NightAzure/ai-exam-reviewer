import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type CourseAuthSuccess = {
  supabase: ServerSupabaseClient;
  user: User;
  userId: string;
  error: null;
};

type CourseAuthFailure = {
  supabase: ServerSupabaseClient | null;
  user: null;
  userId: null;
  error: NextResponse;
};

export type CourseAuthResult = CourseAuthSuccess | CourseAuthFailure;

const requireCourseRole = async (
  courseId: number,
  rpcName: "is_course_member" | "is_course_editor",
): Promise<CourseAuthResult> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      userId: null,
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: allowed, error: roleError } = await supabase.rpc(rpcName, {
    _course_id: courseId,
    _user_id: user.id,
  });

  if (roleError || !allowed) {
    return {
      supabase,
      user: null,
      userId: null,
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, user, userId: user.id, error: null };
};

export const requireCourseMember = (courseId: number) =>
  requireCourseRole(courseId, "is_course_member");

export const requireCourseEditor = (courseId: number) =>
  requireCourseRole(courseId, "is_course_editor");
