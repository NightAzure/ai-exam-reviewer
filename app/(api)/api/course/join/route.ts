import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { ACTIVE_ENROLLMENT_STATUSES, isActiveEnrollmentStatus } from "@/utils/supabase/enrollment-statuses";
import { rateLimit } from "@/utils/rate-limit";

type JoinPayload = {
  classCode?: string;
};

export async function POST(request: NextRequest) {
  // 10 join attempts per hour per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`join:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as JoinPayload;
    const classCode = body.classCode?.trim().toUpperCase();

    if (!classCode) {
      return NextResponse.json({ message: "Class code is required" }, { status: 400 });
    }

    const { data: course, error: courseError } = await adminSupabase
      .from("courses")
      .select("id, code, title, is_active, allow_self_enrollment, enrollment_limit, require_enrollment_approval")
      .eq("code", classCode)
      .maybeSingle();

    if (courseError) throw courseError;
    if (!course) {
      return NextResponse.json({ message: "Invalid class code." }, { status: 404 });
    }

    if (!course.is_active) {
      return NextResponse.json(
        { message: "This course is currently disabled." },
        { status: 403 },
      );
    }

    if (!course.allow_self_enrollment) {
      return NextResponse.json(
        { message: "This course does not allow self-enrollment." },
        { status: 403 },
      );
    }

    if (typeof course.enrollment_limit === "number") {
      const { count, error: countError } = await adminSupabase
        .from("enrollments")
        .select("student_id", { count: "exact", head: true })
        .eq("course_id", course.id)
        .in("status", [...ACTIVE_ENROLLMENT_STATUSES]);

      if (countError) throw countError;
      if ((count ?? 0) >= course.enrollment_limit) {
        return NextResponse.json({ message: "This course is full." }, { status: 409 });
      }
    }

    const { data: existingEnrollment, error: existingError } = await adminSupabase
      .from("enrollments")
      .select("student_id, status")
      .eq("course_id", course.id)
      .eq("student_id", user.id)
      .maybeSingle();

    if (existingError) throw existingError;

    const enrollmentStatus = course.require_enrollment_approval ? "pending" : "active";

    if (existingEnrollment) {
      if (isActiveEnrollmentStatus(existingEnrollment.status)) {
        return NextResponse.json({ message: "You are already enrolled in this course." }, { status: 409 });
      }

      if (existingEnrollment.status === "pending") {
        return NextResponse.json({ message: "Your request is already pending approval." }, { status: 409 });
      }

      const { error } = await adminSupabase
        .from("enrollments")
        .update({ status: enrollmentStatus })
        .eq("course_id", course.id)
        .eq("student_id", user.id);

      if (error) throw error;
    } else {
      const { error } = await adminSupabase.from("enrollments").insert({
        course_id: course.id,
        student_id: user.id,
        status: enrollmentStatus,
      });

      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      courseId: course.id,
      title: course.title,
      status: enrollmentStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to join class";
    return NextResponse.json({ message }, { status: 500 });
  }
}
