import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import {
  choicesFromBankRow,
  QUESTION_BANK_TABLE,
  BANK_SELECT,
  type QuestionBankDbRow,
} from "@/utils/supabase/question-bank";

type PracticeQuestion = {
  id: number;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

const parseCourseId = async (params: Promise<{ courseId: string; topicId: string }>) => {
  const { courseId } = await params;
  const parsed = Number(courseId);
  if (!Number.isFinite(parsed)) throw new Error("Invalid course id");
  return parsed;
};

const parseTopicId = async (params: Promise<{ courseId: string; topicId: string }>) => {
  const { topicId } = await params;
  const parsed = Number(topicId);
  if (!Number.isFinite(parsed)) throw new Error("Invalid topic id");
  return parsed;
};

const requireCourseMember = async (courseId: number) => {
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

  const { data: isMember, error: memberError } = await supabase.rpc("is_course_member", {
    _course_id: courseId,
    _user_id: user.id,
  });

  if (memberError || !isMember) {
    return {
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
    };
  }

  return { error: null, userId: user.id };
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
  { params }: { params: Promise<{ courseId: string; topicId: string }> },
) {
  try {
    const courseId = await parseCourseId(params);
    const topicId = await parseTopicId(params);

    const auth = await requireCourseMember(courseId);
    if (auth.error) return auth.error;

    const rawCount = new URL(request.url).searchParams.get("count");
    const count = Math.min(Math.max(1, Number(rawCount) || 10), 50);

    // Load topic to validate it belongs to this course
    const { data: topicRow, error: topicError } = await adminSupabase
      .from("topics")
      .select("name")
      .eq("id", topicId)
      .eq("course_id", courseId)
      .single();

    if (topicError || !topicRow) {
      return NextResponse.json({ message: "Topic not found" }, { status: 404 });
    }

    const topicName = (topicRow as { name: string }).name;

    // Prefer topic_id FK match; fall back to subject string match for unlinked rows
    const { data: byId, error: byIdError } = await adminSupabase
      .from(QUESTION_BANK_TABLE)
      .select(BANK_SELECT)
      .eq("course_id", courseId)
      .eq("topic_id", topicId);

    if (byIdError) throw byIdError;

    let matched = (byId ?? []) as QuestionBankDbRow[];

    if (matched.length === 0) {
      // Fallback: subject string match for rows not yet linked via topic_id
      const { data: bySubject, error: bySubjectError } = await adminSupabase
        .from(QUESTION_BANK_TABLE)
        .select(BANK_SELECT)
        .eq("course_id", courseId)
        .is("topic_id", null);

      if (bySubjectError) throw bySubjectError;

      matched = ((bySubject ?? []) as QuestionBankDbRow[]).filter(
        (row) => row.subject?.toLowerCase() === topicName.toLowerCase(),
      );
    }

    const selected = shuffle(matched).slice(0, count);

    const questions: PracticeQuestion[] = selected.map((row) => ({
      id: row.id,
      text: row.question ?? "",
      options: choicesFromBankRow(row),
      correctAnswer: row.correct_answer ?? "",
      explanation: row.explanation ?? "",
    }));

    return NextResponse.json({ questions, topic: topicName, total: questions.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load practice questions";
    return NextResponse.json({ message }, { status: 500 });
  }
}
