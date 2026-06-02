import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { buildFastApiHeaders } from "@/utils/fastapi-auth";
import {
  BANK_SELECT,
  QUESTION_BANK_TABLE,
  mapQuestionBankRowsToEntries,
  usageMapFromAssessmentQuestionRows,
  type QuestionBankDbRow,
  type QuestionBankUsageRow,
} from "@/utils/supabase/question-bank";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

const requireCourseEditor = async (courseId: number) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      supabase,
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
      supabase,
      userId: null as string | null,
    };
  }

  return { error: null as null, supabase, userId: user.id };
};

/**
 * GET — full question bank for admin UI (service role bypasses RLS on `question_bank`).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        message:
          "Server missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local so admin can read question_bank (RLS-safe).",
      },
      { status: 503 },
    );
  }

  const { courseId: courseIdParam } = await context.params;
  const courseId = Number(courseIdParam);
  if (!Number.isFinite(courseId)) {
    return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
  }

  const gate = await requireCourseEditor(courseId);
  if (gate.error) return gate.error;

  const { data: rows, error: rowsError } = await adminSupabase
    .from(QUESTION_BANK_TABLE)
    .select(BANK_SELECT)
    .eq("course_id", courseId)
    .order("subject", { ascending: true })
    .order("created_at", { ascending: false });

  if (rowsError) {
    console.error("[question-bank API] select error:", rowsError);
    return NextResponse.json(
      { message: rowsError.message || "Failed to load question bank" },
      { status: 500 },
    );
  }

  let usageByKey = new Map<string, number>();
  const { data: usageRows, error: usageError } = await adminSupabase
    .from("assessment_questions")
    .select("subject, question_text, assessments!inner(course_id)")
    .eq("assessments.course_id", courseId);

  if (usageError) {
    console.warn("[question-bank API] usage counts skipped:", usageError.message);
  } else {
    usageByKey = usageMapFromAssessmentQuestionRows(
      (usageRows ?? []) as QuestionBankUsageRow[],
    );
  }

  const questions = mapQuestionBankRowsToEntries((rows ?? []) as QuestionBankDbRow[], usageByKey);

  return NextResponse.json({
    questions,
    table: QUESTION_BANK_TABLE,
    count: questions.length,
  });
}

const choiceColumns = (options: string[]) => {
  const padded = [...options, "", "", "", ""].slice(0, 5);
  return {
    choice_a: padded[0]?.trim() ?? "",
    choice_b: padded[1]?.trim() ?? "",
    choice_c: padded[2]?.trim() ?? "",
    choice_d: padded[3]?.trim() ?? "",
    choice_e: padded[4]?.trim() || null,
  };
};

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const { courseId: courseIdParam } = await context.params;
  const courseId = Number(courseIdParam);
  if (!Number.isFinite(courseId)) {
    return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
  }

  const gate = await requireCourseEditor(courseId);
  if (gate.error) return gate.error;

  try {
    const body = (await request.json()) as {
      text?: string;
      subject?: string;
      topic?: string;
      topic_id?: number | null;
      subtopic_id?: number | null;
      options?: string[];
      correctAnswer?: string;
      explanation?: string;
      difficultyLevel?: number;
      source?: "manual" | "ai_generated";
      ai_generation_job_id?: number | null;
      cognitive_skill?: string | null;
    };

    const text = body.text?.trim() ?? "";
    const options = (body.options ?? []).map((option) => option.trim()).filter(Boolean);
    if (!text || options.length < 2 || !body.correctAnswer) {
      return NextResponse.json({ message: "Question text, choices, and correct answer are required" }, { status: 400 });
    }

    const difficulty =
      body.difficultyLevel != null && body.difficultyLevel >= 1 && body.difficultyLevel <= 5
        ? body.difficultyLevel
        : 3;

    const { data: inserted, error } = await adminSupabase
      .from(QUESTION_BANK_TABLE)
      .insert({
        course_id: courseId,
        question: text,
        subject: body.subject?.trim() || "General",
        topic: body.topic?.trim() || body.subject?.trim() || "General",
        topic_id: body.topic_id ?? null,
        subtopic_id: body.subtopic_id ?? null,
        ...choiceColumns(options),
        correct_answer: body.correctAnswer.trim(),
        explanation: body.explanation?.trim() || null,
        difficulty_level: difficulty,
        created_by: gate.userId,
        source: body.source ?? "manual",
        ai_generation_job_id: body.ai_generation_job_id ?? null,
        cognitive_skill: body.cognitive_skill ?? null,
      })
      .select("id")
      .single();

    if (error) {
      const duplicate = error.code === "23505";
      return NextResponse.json(
        { message: duplicate ? "A very similar question already exists in this course." : error.message },
        { status: duplicate ? 409 : 500 },
      );
    }

    if (inserted?.id && gate.supabase) {
      buildFastApiHeaders(gate.supabase, { "Content-Type": "application/json" })
        .then((headers) =>
          fetch(`${FASTAPI_URL}/ai/embed-question-bank-question`, {
            method: "POST",
            headers,
            body: JSON.stringify({ question_id: inserted.id, course_id: courseId }),
          }),
        )
        .catch((err) => console.warn("[question-bank API] embedding refresh skipped:", err));
    }

    return NextResponse.json({ id: inserted?.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create question";
    return NextResponse.json({ message }, { status: 500 });
  }
}
