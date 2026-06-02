import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";

const requireCourseEditor = async (courseId: number) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  const { data: isEditor, error: editorError } = await supabase.rpc("is_course_editor", {
    _course_id: courseId,
    _user_id: user.id,
  });

  if (editorError || !isEditor) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { error: null };
};

const parseCourseId = async (params: Promise<{ courseId: string }>) => {
  const { courseId } = await params;
  return parseInt(courseId, 10);
};

const getEmailMap = async (userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const results = await Promise.all(
    uniqueIds.map(async (userId) => {
      const { data, error } = await adminSupabase.auth.admin.getUserById(userId);
      if (error || !data.user) return [userId, null] as const;
      return [userId, data.user.email ?? null] as const;
    }),
  );
  return new Map<string, string | null>(results);
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;

    const { data: enrollments, error } = await adminSupabase
      .from("enrollments")
      .select("student_id, requested_at")
      .eq("course_id", courseId)
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    if (error) throw error;

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ requests: [] });
    }

    const studentIds = enrollments.map((e) => e.student_id);

    const [{ data: profiles }, emailMap] = await Promise.all([
      adminSupabase
        .from("profiles")
        .select("id, first_name, second_name, username")
        .in("id", studentIds),
      getEmailMap(studentIds),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const requests = enrollments.map((e) => {
      const profile = profileMap.get(e.student_id) ?? null;
      const email = emailMap.get(e.student_id) ?? null;
      const first = profile?.first_name?.trim() ?? "";
      const second = profile?.second_name?.trim() ?? "";
      const fullName = [first, second].filter(Boolean).join(" ").trim();
      const name =
        fullName ||
        profile?.username?.trim() ||
        (email ? email.split("@")[0] : `User ${e.student_id.slice(0, 8)}`);

      return {
        studentId: e.student_id,
        name,
        email,
        requestedAt: e.requested_at,
      };
    });

    return NextResponse.json({ requests });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch requests";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;

    const body = (await request.json()) as { studentId: string; action: "approve" | "reject" };
    const { studentId, action } = body;

    if (!studentId || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    if (action === "approve") {
      const { error } = await adminSupabase
        .from("enrollments")
        .update({ status: "active" })
        .eq("course_id", courseId)
        .eq("student_id", studentId)
        .eq("status", "pending");

      if (error) throw error;
    } else {
      const { error } = await adminSupabase
        .from("enrollments")
        .delete()
        .eq("course_id", courseId)
        .eq("student_id", studentId)
        .eq("status", "pending");

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process request";
    return NextResponse.json({ message }, { status: 500 });
  }
}
