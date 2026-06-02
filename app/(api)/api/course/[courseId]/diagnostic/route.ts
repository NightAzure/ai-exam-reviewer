import { NextResponse } from "next/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { requireCourseMember } from "@/utils/supabase/course-auth";
import { recalculateSubjectMasteryForCourse } from "@/utils/supabase/mastery";
import {
  choicesFromBankRow,
  QUESTION_BANK_TABLE,
  BANK_SELECT,
  type QuestionBankDbRow,
} from "@/utils/supabase/question-bank";

export const DIAGNOSTIC_TITLE = "__diagnostic__";
const QUESTIONS_PER_TOPIC = 3;

export type DiagnosticQuestion = {
  id: number;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topicId: number;
  topicName: string;
};

type AnswerInput = {
  questionId: number | null;
  questionText: string;
  options: string[];
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  subject: string;
  topicId?: number | null;
};

const describeDiagnosticError = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [
      typeof candidate.message === "string" ? candidate.message : null,
      typeof candidate.details === "string" ? candidate.details : null,
      typeof candidate.hint === "string" ? candidate.hint : null,
      typeof candidate.code === "string" ? `code: ${candidate.code}` : null,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
  }
  if (typeof error === "string") return error;
  return fallback;
};

const parseCourseId = async (params: Promise<{ courseId: string }>) => {
  const { courseId } = await params;
  const parsed = Number(courseId);
  if (!Number.isFinite(parsed)) throw new Error("Invalid course id");
  return parsed;
};

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  void request;
  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseMember(courseId);
    if (auth.error) return auth.error;

    const { data: topicsData, error: topicsError } = await adminSupabase
      .from("topics")
      .select("id, name")
      .eq("course_id", courseId)
      .order("id", { ascending: true });

    if (topicsError) throw topicsError;
    const topics = (topicsData ?? []) as Array<{ id: number; name: string }>;

    if (topics.length === 0) {
      return NextResponse.json({ questions: [], topics: [] });
    }

    const { data: rows, error: rowsError } = await adminSupabase
      .from(QUESTION_BANK_TABLE)
      .select(BANK_SELECT)
      .eq("course_id", courseId);

    if (rowsError) throw rowsError;
    const allRows = (rows ?? []) as QuestionBankDbRow[];

    const perTopicQuestions: DiagnosticQuestion[] = [];

    for (const topic of topics) {
      // Prefer topic_id FK match; fall back to subject string for unlinked rows
      let matched = allRows.filter((row) => row.topic_id === topic.id);
      if (matched.length === 0) {
        matched = allRows.filter(
          (row) => row.topic_id == null && row.subject?.toLowerCase() === topic.name.toLowerCase(),
        );
      }
      const selected = shuffle(matched).slice(0, QUESTIONS_PER_TOPIC);

      for (const row of selected) {
        perTopicQuestions.push({
          id: row.id,
          text: row.question ?? "",
          options: choicesFromBankRow(row),
          correctAnswer: row.correct_answer ?? "",
          explanation: row.explanation ?? "",
          topicId: topic.id,
          topicName: topic.name,
        });
      }
    }

    const questions = shuffle(perTopicQuestions);

    return NextResponse.json({ questions, topics: topics.map((t) => t.name) });
  } catch (error) {
    console.error("[diagnostic] load failed", error);
    const message = describeDiagnosticError(error, "Unable to load diagnostic questions");
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseMember(courseId);
    if (auth.error) return auth.error;
    if (!auth.userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as { answers: AnswerInput[]; timeSpentSeconds?: number };
    const answers = body.answers ?? [];
    const timeSpentSeconds = typeof body.timeSpentSeconds === "number" ? body.timeSpentSeconds : null;

    if (answers.length === 0) {
      return NextResponse.json({ message: "No answers provided" }, { status: 400 });
    }

    // Find or create the hidden diagnostic assessment for this course
    const { data: existingAssessment } = await adminSupabase
      .from("assessments")
      .select("id")
      .eq("course_id", courseId)
      .eq("title", DIAGNOSTIC_TITLE)
      .maybeSingle();

    let assessmentId: number;

    if (existingAssessment) {
      assessmentId = (existingAssessment as { id: number }).id;
    } else {
      const { data: newAssessment, error: createError } = await adminSupabase
        .from("assessments")
        .insert({
          course_id: courseId,
          title: DIAGNOSTIC_TITLE,
          description: "Auto-generated diagnostic assessment",
          max_attempts: 999,
          randomize_questions: true,
          shuffle_answers: true,
          is_enabled: false,
          question_mode: "manual",
          created_by: auth.userId,
        })
        .select("id")
        .single();

      if (createError || !newAssessment) {
        throw createError ?? new Error("Failed to create diagnostic assessment");
      }
      assessmentId = (newAssessment as { id: number }).id;
    }

    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctAnswers / answers.length) * 100);
    const now = new Date().toISOString();

    const { data: rpcId, error: attemptError } = await adminSupabase.rpc(
      "insert_assessment_attempt",
      {
        p_assessment_id: assessmentId,
        p_student_id: auth.userId,
        p_status: "completed",
        p_score: score,
        p_total_questions: answers.length,
        p_answered_questions: answers.length,
        p_correct_answers: correctAnswers,
        p_time_spent_seconds: timeSpentSeconds,
        p_started_at: now,
        p_submitted_at: now,
      },
    );

    if (attemptError || rpcId == null) {
      throw attemptError ?? new Error("Failed to create attempt");
    }
    const attemptId = Number(rpcId);

    const answerRows = answers.map((answer, index) => ({
      attempt_id: attemptId,
      // Diagnostic questions come from question_bank, while question_id references assessment_questions.
      question_id: null,
      question_position: index + 1,
      question_text: answer.questionText,
      question_type: "multiple-choice",
      options: answer.options,
      selected_answer: answer.selectedAnswer,
      correct_answer: answer.correctAnswer,
      explanation: answer.explanation,
      subject: answer.subject,
      topic_id: answer.topicId ?? null,
      is_correct: answer.isCorrect,
    }));

    const { error: answersError } = await adminSupabase
      .from("assessment_attempt_answers")
      .insert(answerRows);

    if (answersError) throw answersError;

    const masteryUpdated = await recalculateSubjectMasteryForCourse(
      adminSupabase,
      courseId,
      auth.userId,
    );

    return NextResponse.json({
      success: true,
      attemptId,
      score,
      total: answers.length,
      masteryUpdated,
    });
  } catch (error) {
    console.error("[diagnostic] save failed", error);
    const message = describeDiagnosticError(error, "Unable to save diagnostic results");
    return NextResponse.json({ message }, { status: 500 });
  }
}
