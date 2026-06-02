import type { SupabaseClient } from "@supabase/supabase-js";

export const QUESTION_BANK_TABLE =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SUPABASE_QUESTION_BANK_TABLE?.trim()) ||
  "question_bank";

export type QuestionBankEntry = {
  id: string;
  text: string;
  type: "multiple-choice";
  subject: string;
  topic: string;
  options: string[];
  choiceSlots: string[];
  correctAnswer?: string;
  explanation?: string;
  difficultyLevel: number;
  usedCount: number;
  isComplete: boolean;
};

export type QuestionBankDbRow = {
  id: number;
  course_id?: number | null;
  question: string;
  subject?: string | null;
  topic?: string | null;
  topic_id?: number | null;
  subtopic_id?: number | null;
  choice_a?: string | null;
  choice_b?: string | null;
  choice_c?: string | null;
  choice_d?: string | null;
  choice_e?: string | null;
  correct_answer?: string | null;
  explanation?: string | null;
  difficulty_level?: number | null;
  source?: "manual" | "ai_generated" | null;
  ai_generation_job_id?: number | null;
  cognitive_skill?: string | null;
};

export type QuestionBankUsageRow = {
  subject?: string | null;
  question_text: string;
};

export type QuestionBankMutationInput = {
  text: string;
  type: "multiple-choice";
  subject?: string;
  topic?: string;
  topic_id?: number | null;
  subtopic_id?: number | null;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
  difficultyLevel?: number;
  source?: "manual" | "ai_generated";
  ai_generation_job_id?: number | null;
  cognitive_skill?: string | null;
};

const CHOICE_KEYS = ["choice_a", "choice_b", "choice_c", "choice_d", "choice_e"] as const;

export const choicesFromBankRow = (row: Partial<QuestionBankDbRow>): string[] => {
  return CHOICE_KEYS.map((k) => (row[k]?.toString() ?? "").trim()).filter(Boolean);
};

const optionsToChoiceColumns = (options: string[]) => {
  const padded = [...options, "", "", "", "", ""].slice(0, 5);
  const e = (padded[4] ?? "").trim();
  return {
    choice_a: (padded[0] ?? "").trim(),
    choice_b: (padded[1] ?? "").trim(),
    choice_c: (padded[2] ?? "").trim(),
    choice_d: (padded[3] ?? "").trim(),
    choice_e: e.length > 0 ? e : null,
  };
};

const isCompleteQuestion = (question: {
  text: string;
  options: string[];
  correctAnswer?: string;
}) => {
  const validOptions = question.options.filter((option) => option.trim().length > 0);
  return (
    question.text.trim().length > 0 &&
    validOptions.length >= 2 &&
    Boolean(question.correctAnswer) &&
    validOptions.includes(question.correctAnswer ?? "")
  );
};

const getCurrentUserId = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
};

export const BANK_SELECT =
  "id, question, subject, topic, topic_id, subtopic_id, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, explanation, difficulty_level";

export function usageMapFromAssessmentQuestionRows(
  usageRows: QuestionBankUsageRow[],
): Map<string, number> {
  const usageByKey = new Map<string, number>();
  for (const row of usageRows) {
    const key = `${row.subject ?? "General"}::${row.question_text.trim().toLowerCase()}`;
    usageByKey.set(key, (usageByKey.get(key) ?? 0) + 1);
  }
  return usageByKey;
}

export function mapQuestionBankRowsToEntries(
  rows: QuestionBankDbRow[],
  usageByKey: Map<string, number>,
): QuestionBankEntry[] {
  return rows.map((row) => {
    const subject = row.subject?.trim() || "General";
    const topic = row.topic?.trim() || "";
    const text = row.question ?? "";
    const choiceSlots = CHOICE_KEYS.map((k) => (row[k]?.toString() ?? "").trim());
    const options = choiceSlots.filter(Boolean);
    const correctAnswer = row.correct_answer ?? undefined;
    const difficultyLevel =
      row.difficulty_level != null && row.difficulty_level >= 1 && row.difficulty_level <= 5
        ? row.difficulty_level
        : 3;

    return {
      id: String(row.id),
      text,
      type: "multiple-choice",
      subject,
      topic,
      options,
      choiceSlots,
      correctAnswer,
      explanation: row.explanation ?? undefined,
      difficultyLevel,
      usedCount: usageByKey.get(`${subject}::${text.trim().toLowerCase()}`) ?? 0,
      isComplete: isCompleteQuestion({ text, options, correctAnswer }),
    };
  });
}

export async function fetchQuestionBankForAdminCourse(
  courseId: number,
): Promise<QuestionBankEntry[]> {
  const res = await fetch(`/api/admin/course/${courseId}/question-bank`, {
    credentials: "include",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as {
    questions?: QuestionBankEntry[];
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message || `Question bank request failed (${res.status})`);
  }
  return body.questions ?? [];
}

export const loadQuestionBankForCourse = async (
  supabase: SupabaseClient,
  courseId: number,
): Promise<QuestionBankEntry[]> => {
  const { data: rows, error: rowsError } = await supabase
    .from(QUESTION_BANK_TABLE)
    .select(BANK_SELECT)
    .eq("course_id", courseId)
    .order("subject", { ascending: true })
    .order("created_at", { ascending: false });

  if (rowsError) throw rowsError;

  let usageByKey = new Map<string, number>();
  const { data: usageRows, error: usageError } = await supabase
    .from("assessment_questions")
    .select("subject, question_text, assessments!inner(course_id)")
    .eq("assessments.course_id", courseId);

  if (usageError) {
    console.warn("[question-bank] Could not load usage counts:", usageError.message);
  } else {
    usageByKey = usageMapFromAssessmentQuestionRows((usageRows ?? []) as QuestionBankUsageRow[]);
  }

  return mapQuestionBankRowsToEntries((rows ?? []) as QuestionBankDbRow[], usageByKey);
};

export const syncQuestionBankQuestionsForCourse = async (
  supabase: SupabaseClient,
  courseId: number,
  questions: QuestionBankMutationInput[],
) => {
  const normalized = questions
    .map((question) => ({
      text: question.text.trim(),
      subject: question.subject?.trim() || "General",
      topic: question.topic?.trim() || question.subject?.trim() || "General",
      topic_id: question.topic_id ?? null,
      subtopic_id: question.subtopic_id ?? null,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      difficultyLevel:
        question.difficultyLevel != null &&
        question.difficultyLevel >= 1 &&
        question.difficultyLevel <= 5
          ? question.difficultyLevel
          : 3,
    }))
    .filter((question) => question.text.length > 0);

  if (normalized.length === 0) return;

  const { data: existingRows, error: existingError } = await supabase
    .from(QUESTION_BANK_TABLE)
    .select("id, question, subject")
    .eq("course_id", courseId);

  if (existingError) throw existingError;

  const existingKeys = new Set(
    (existingRows ?? []).map(
      (row) => `${(row.subject ?? "General").trim()}::${(row.question ?? "").trim().toLowerCase()}`,
    ),
  );

  const userId = await getCurrentUserId(supabase);
  const inserts = normalized
    .filter(
      (question) =>
        !existingKeys.has(`${question.subject}::${question.text.toLowerCase()}`),
    )
    .map((question) => ({
      course_id: courseId,
      question: question.text,
      subject: question.subject,
      topic: question.topic,
      topic_id: question.topic_id ?? null,
      subtopic_id: question.subtopic_id ?? null,
      ...optionsToChoiceColumns(question.options),
      correct_answer: question.correctAnswer ?? "",
      explanation: question.explanation?.trim() ? question.explanation : null,
      difficulty_level: question.difficultyLevel,
      created_by: userId,
    }));

  if (inserts.length === 0) return;

  const { error: insertError } = await supabase.from(QUESTION_BANK_TABLE).insert(inserts);
  if (insertError) throw insertError;
};

export const createQuestionBankQuestion = async (
  supabase: SupabaseClient,
  courseId: number,
  question: QuestionBankMutationInput,
) => {
  void supabase;
  const difficulty =
    question.difficultyLevel != null &&
    question.difficultyLevel >= 1 &&
    question.difficultyLevel <= 5
      ? question.difficultyLevel
      : 3;

  const res = await fetch(`/api/admin/course/${courseId}/question-bank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      text: question.text.trim(),
      subject: question.subject?.trim() || "General",
      topic: question.topic?.trim() || question.subject?.trim() || "General",
      topic_id: question.topic_id ?? null,
      subtopic_id: question.subtopic_id ?? null,
      options: question.options,
      correctAnswer: question.correctAnswer?.trim() ?? "",
      explanation: question.explanation?.trim() ? question.explanation : null,
      difficultyLevel: difficulty,
      source: question.source ?? "manual",
      ai_generation_job_id: question.ai_generation_job_id ?? null,
      cognitive_skill: question.cognitive_skill ?? null,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to create question");
  }
};

export const updateQuestionBankQuestion = async (
  supabase: SupabaseClient,
  courseId: number,
  questionId: string,
  question: QuestionBankMutationInput,
) => {
  const difficulty =
    question.difficultyLevel != null &&
    question.difficultyLevel >= 1 &&
    question.difficultyLevel <= 5
      ? question.difficultyLevel
      : 3;

  const { error } = await supabase
    .from(QUESTION_BANK_TABLE)
    .update({
      question: question.text.trim(),
      subject: question.subject?.trim() || "General",
      topic: question.topic?.trim() || question.subject?.trim() || "General",
      topic_id: question.topic_id ?? null,
      subtopic_id: question.subtopic_id ?? null,
      ...optionsToChoiceColumns(question.options),
      correct_answer: question.correctAnswer?.trim() ?? "",
      explanation: question.explanation?.trim() ? question.explanation : null,
      difficulty_level: difficulty,
      cognitive_skill: question.cognitive_skill ?? null,
    })
    .eq("id", Number(questionId))
    .eq("course_id", courseId);

  if (error) throw error;
};

export const archiveQuestionBankQuestion = async (
  supabase: SupabaseClient,
  courseId: number,
  questionId: string,
) => {
  const { error } = await supabase
    .from(QUESTION_BANK_TABLE)
    .delete()
    .eq("id", Number(questionId))
    .eq("course_id", courseId);

  if (error) throw error;
};
