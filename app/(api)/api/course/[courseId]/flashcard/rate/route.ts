import { NextResponse } from "next/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { requireCourseMember } from "@/utils/supabase/course-auth";

type Params = { params: Promise<{ courseId: string }> };
type Rating = "hard" | "medium" | "easy";

function sm2(
  easeFactor: number,
  intervalDays: number,
  repetitions: number,
  rating: Rating,
): { easeFactor: number; intervalDays: number; repetitions: number; nextReview: string } {
  const q = rating === "easy" ? 5 : rating === "medium" ? 3 : 1;
  const newEF = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  let newInterval: number;
  let newReps: number;
  if (q < 3) {
    newReps = 0;
    newInterval = 1;
  } else {
    newReps = repetitions + 1;
    newInterval =
      repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.round(intervalDays * newEF);
  }

  const next = new Date();
  next.setDate(next.getDate() + newInterval);

  return {
    easeFactor: Math.round(newEF * 100) / 100,
    intervalDays: newInterval,
    repetitions: newReps,
    nextReview: next.toISOString().slice(0, 10),
  };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { courseId: courseIdStr } = await params;
    const courseId = Number(courseIdStr);
    if (!Number.isFinite(courseId)) {
      return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
    }

    const auth = await requireCourseMember(courseId);
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      questionId?: number;
      rating?: string;
      easeFactor?: number;
      intervalDays?: number;
      repetitions?: number;
    };

    const { questionId, rating, easeFactor = 2.5, intervalDays = 1, repetitions = 0 } = body;
    if (!questionId || !["hard", "medium", "easy"].includes(rating ?? "")) {
      return NextResponse.json({ message: "Invalid questionId or rating" }, { status: 400 });
    }

    const { data: question, error: questionError } = await adminSupabase
      .from("question_bank")
      .select("id")
      .eq("id", questionId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (questionError) throw questionError;
    if (!question) {
      return NextResponse.json({ message: "Question not found for this course" }, { status: 404 });
    }

    const updated = sm2(easeFactor, intervalDays, repetitions, rating as Rating);

    const { error: upsertError } = await adminSupabase
      .from("flashcard_reviews")
      .upsert(
        {
          user_id: auth.userId,
          course_id: courseId,
          question_id: questionId,
          ease_factor: updated.easeFactor,
          interval_days: updated.intervalDays,
          repetitions: updated.repetitions,
          next_review: updated.nextReview,
          last_rating: rating,
        },
        { onConflict: "user_id,question_id" },
      );

    if (upsertError) throw upsertError;

    return NextResponse.json({ updated });
  } catch (err) {
    console.error("[flashcard/rate]", err instanceof Error ? err.message : err);
    return NextResponse.json({ message: "Failed to rate flashcard" }, { status: 500 });
  }
}
