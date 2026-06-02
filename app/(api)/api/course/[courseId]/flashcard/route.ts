import { NextRequest, NextResponse } from "next/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { requireCourseMember } from "@/utils/supabase/course-auth";

type Params = { params: Promise<{ courseId: string }> };

const SESSION_SIZE = 15;

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { courseId: courseIdStr } = await params;
    const courseId = Number(courseIdStr);
    if (!Number.isFinite(courseId)) {
      return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
    }

    const topicId = request.nextUrl.searchParams.get("topicId");

    const auth = await requireCourseMember(courseId);
    if (auth.error) return auth.error;

    // Fetch all active questions for this course (with optional topic filter)
    let qbQuery = adminSupabase
      .from("question_bank")
      .select("id, question, subject, topic_id, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation")
      .eq("course_id", courseId)
      .not("correct_answer", "is", null);

    if (topicId) {
      qbQuery = qbQuery.eq("topic_id", Number(topicId));
    }

    const { data: allQuestions, error: qbError } = await qbQuery.limit(200);
    if (qbError) throw qbError;
    if (!allQuestions || allQuestions.length === 0) {
      return NextResponse.json({ cards: [] });
    }

    const questionIds = (allQuestions as Array<{ id: number }>).map((q) => q.id);

    // Fetch existing review records for this user
    const { data: reviews } = await adminSupabase
      .from("flashcard_reviews")
      .select("question_id, ease_factor, interval_days, repetitions, next_review, last_rating")
      .eq("user_id", auth.userId)
      .in("question_id", questionIds);

    const reviewMap = new Map(
      (reviews ?? []).map((r: { question_id: number; next_review: string; [key: string]: unknown }) => [r.question_id, r]),
    );

    const today = new Date().toISOString().slice(0, 10);

    // Separate due vs new
    const due: typeof allQuestions = [];
    const newCards: typeof allQuestions = [];

    for (const q of allQuestions as Array<{ id: number }>) {
      const review = reviewMap.get(q.id);
      if (!review) {
        newCards.push(q as never);
      } else if ((review as { next_review: string }).next_review <= today) {
        due.push(q as never);
      }
    }

    // Prioritize due cards, fill remainder with new
    const selected = [...due, ...newCards].slice(0, SESSION_SIZE);

    const cards = (selected as Array<{
      id: number; question: string; subject: string | null; topic_id: number | null;
      choice_a: string | null; choice_b: string | null; choice_c: string | null; choice_d: string | null;
      correct_answer: string | null; explanation: string | null;
    }>).map((q) => {
      const review = reviewMap.get(q.id) as { ease_factor: number; interval_days: number; repetitions: number; last_rating: string | null } | undefined;
      return {
        questionId: q.id,
        question: q.question,
        subject: q.subject,
        options: [q.choice_a, q.choice_b, q.choice_c, q.choice_d].filter(Boolean) as string[],
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        easeFactor: review?.ease_factor ?? 2.5,
        intervalDays: review?.interval_days ?? 1,
        repetitions: review?.repetitions ?? 0,
        lastRating: review?.last_rating ?? null,
        isNew: !review,
      };
    });

    return NextResponse.json({ cards, totalDue: due.length, totalNew: newCards.length });
  } catch (err) {
    console.error("[flashcard GET]", err instanceof Error ? err.message : err);
    return NextResponse.json({ message: "Failed to fetch flashcards" }, { status: 500 });
  }
}
