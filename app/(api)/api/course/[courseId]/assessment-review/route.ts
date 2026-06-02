import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { buildFastApiHeaders } from "@/utils/fastapi-auth";
import type { AssessmentReviewItem } from "@/types/assessment-review";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

type Params = { params: Promise<{ courseId: string }> };

async function requireCourseAccess(courseId: number) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { user: null, error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };

  const { data: isMember } = await supabase.rpc("is_course_member", {
    _course_id: courseId,
    _user_id: user.id,
  });
  if (!isMember) return { user: null, error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };

  return { supabase, user, error: null };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { courseId: courseIdStr } = await params;
    const courseId = Number(courseIdStr);
    if (!Number.isFinite(courseId)) {
      return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
    }

    const { supabase, user, error: authError } = await requireCourseAccess(courseId);
    if (authError || !user) return authError!;

    const body = (await request.json()) as { attemptId?: number };
    const attemptId = body.attemptId;
    if (!attemptId || !Number.isFinite(attemptId)) {
      return NextResponse.json({ message: "attemptId is required" }, { status: 400 });
    }

    // Verify attempt belongs to this user + course
    const { data: attempt, error: attemptError } = await adminSupabase
      .from("assessment_attempts")
      .select("id, student_id, assessments!inner(course_id)")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json({ message: "Attempt not found" }, { status: 404 });
    }
    const attemptCourseId = (attempt.assessments as unknown as { course_id: number }).course_id;
    if (attemptCourseId !== courseId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Return cached review if it exists
    const { data: cached } = await adminSupabase
      .from("assessment_reviews")
      .select("review_data")
      .eq("attempt_id", attemptId)
      .maybeSingle();

    if (cached) {
      return NextResponse.json({ reviews: cached.review_data as AssessmentReviewItem[] });
    }

    // Fetch wrong answers
    const { data: answers, error: answersError } = await adminSupabase
      .from("assessment_attempt_answers")
      .select("question_text, selected_answer, correct_answer, explanation, subject")
      .eq("attempt_id", attemptId)
      .eq("is_correct", false);

    if (answersError) throw answersError;
    if (!answers || answers.length === 0) {
      return NextResponse.json({ reviews: [] });
    }

    // Fetch course title
    const { data: course } = await adminSupabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .maybeSingle();

    // Call FastAPI
    const headers = await buildFastApiHeaders(supabase, { "Content-Type": "application/json" });

    const fastapiRes = await fetch(`${FASTAPI_URL}/ai/assessment-review`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        wrong_answers: answers.map((a) => ({
          question_text: a.question_text,
          student_answer: a.selected_answer ?? "",
          correct_answer: a.correct_answer ?? "",
          subject: a.subject ?? "General",
          explanation: a.explanation ?? "",
        })),
        course_title: course?.title ?? "Engineering Board Exam",
        course_id: courseId,
      }),
    });

    if (!fastapiRes.ok) {
      throw new Error(`FastAPI returned ${fastapiRes.status}`);
    }

    const { reviews } = (await fastapiRes.json()) as { reviews: AssessmentReviewItem[] };

    // Cache in assessment_reviews
    await adminSupabase.from("assessment_reviews").upsert({
      attempt_id: attemptId,
      course_id: courseId,
      student_id: user.id,
      review_data: reviews,
      model_version: "ollama",
    }, { onConflict: "attempt_id" });

    return NextResponse.json({ reviews });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate review";
    console.error("[assessment-review]", message);
    return NextResponse.json({ message: "Failed to generate review" }, { status: 500 });
  }
}
