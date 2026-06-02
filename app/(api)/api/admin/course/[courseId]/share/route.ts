import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/utils/supabase/enrollment-statuses";
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const MAX_CODE_GENERATION_ATTEMPTS = 12;

const parseCourseId = async (params: Promise<{ courseId: string }>) => {
  const { courseId } = await params;
  const parsed = Number(courseId);

  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid course id");
  }

  return parsed;
};

const requireCourseEditor = async (courseId: number) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      userId: null as string | null,
    };
  }

  const { data: isEditor, error: editorError } = await supabase.rpc("is_course_editor", {
    _course_id: courseId,
    _user_id: user.id,
  });

  if (editorError || !isEditor) {
    return {
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
    };
  }

  return { error: null, userId: user.id };
};

const generateCourseCode = () => {
  let code = "";

  for (let index = 0; index < CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * CODE_CHARSET.length);
    code += CODE_CHARSET[randomIndex];
  }

  return code;
};

const getSharePayload = async (courseId: number) => {
  const [{ data: course, error: courseError }, { count, error: enrollmentError }] = await Promise.all([
    adminSupabase.from("courses").select("code").eq("id", courseId).maybeSingle(),
    adminSupabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId)
      .in("status", [...ACTIVE_ENROLLMENT_STATUSES]),
  ]);

  if (courseError) throw courseError;
  if (!course) {
    throw new Error("Course not found");
  }
  if (enrollmentError) throw enrollmentError;

  return {
    code: course.code,
    usageCount: count ?? 0,
  };
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  void request;

  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;

    return NextResponse.json(await getSharePayload(courseId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load course share data";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  void request;

  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;

    let nextCode: string | null = null;

    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const candidate = generateCourseCode();
      const { data: conflict, error: conflictError } = await adminSupabase
        .from("courses")
        .select("id")
        .eq("code", candidate)
        .neq("id", courseId)
        .maybeSingle();

      if (conflictError) throw conflictError;
      if (!conflict) {
        nextCode = candidate;
        break;
      }
    }

    if (!nextCode) {
      throw new Error("Unable to generate a unique course code");
    }

    const { error: updateError } = await adminSupabase
      .from("courses")
      .update({ code: nextCode })
      .eq("id", courseId);

    if (updateError) throw updateError;

    return NextResponse.json(await getSharePayload(courseId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to regenerate course code";
    return NextResponse.json({ message }, { status: 500 });
  }
}
