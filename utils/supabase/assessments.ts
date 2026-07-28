import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AssessmentFull,
  CreateAssessmentRequest,
  Question,
  RandomSubjectSelection,
  UpdateAssessmentRequest,
} from "@/types/assessment";

type AssessmentRow = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  duration?: number | null;
  max_attempts?: number | null;
  randomize_questions?: boolean | null;
  shuffle_answers?: boolean | null;
  is_enabled?: boolean | null;
  allow_hints?: boolean | null;
  release_date?: string | null;
  deadline?: string | null;
  question_mode?: "manual" | "random" | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
};

type AssessmentQuestionRow = {
  id: number | string;
  assessment_id: number;
  question_text?: string | null;
  text?: string | null;
  question_type?: string | null;
  type?: string | null;
  options?: unknown;
  correct_answer?: string | null;
  explanation?: string | null;
  subject?: string | null;
  position?: number | null;
};

type AssessmentRandomRuleRow = {
  id: number | string;
  assessment_id: number;
  subject: string;
  count: number;
};

const normalizeOptions = (options: unknown): string[] => {
  if (!Array.isArray(options)) return [];
  return options.filter((option): option is string => typeof option === "string");
};

export const isMissingRelationError = (message?: string) => {
  if (!message) return false;
  return (
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("Could not find the table")
  );
};

export const mapQuestionRow = (row: AssessmentQuestionRow): Question => ({
  id: String(row.id),
  text: row.question_text ?? row.text ?? "",
  type: "multiple-choice",
  options: normalizeOptions(row.options),
  correctAnswer: row.correct_answer ?? undefined,
  explanation: row.explanation ?? undefined,
  subject: row.subject ?? undefined,
});

const mapAssessmentRow = (
  assessment: AssessmentRow,
  questions: Question[],
  randomSubjectSelections: RandomSubjectSelection[],
): AssessmentFull => ({
  id: assessment.id,
  courseId: assessment.course_id,
  title: assessment.title,
  description: assessment.description ?? "",
  duration: assessment.duration ?? undefined,
  maxAttempts: assessment.max_attempts ?? 1,
  randomizeQuestions: Boolean(assessment.randomize_questions),
  shuffleAnswers: Boolean(assessment.shuffle_answers),
  isEnabled: Boolean(assessment.is_enabled),
  allowHints: assessment.allow_hints !== false,
  releaseDate: assessment.release_date ?? undefined,
  deadline: assessment.deadline ?? undefined,
  questionMode: assessment.question_mode ?? "manual",
  questions,
  randomSubjectSelections,
  createdAt: assessment.created_at ?? new Date(0).toISOString(),
  updatedAt: assessment.updated_at ?? new Date(0).toISOString(),
  createdBy: assessment.created_by ?? undefined,
});

const assessmentSelect = `
  id,
  course_id,
  title,
  description,
  duration,
  max_attempts,
  randomize_questions,
  shuffle_answers,
  is_enabled,
  release_date,
  deadline,
  question_mode,
  created_at,
  updated_at,
  created_by
`;

const loadAssessmentRelations = async (
  supabase: SupabaseClient,
  assessmentIds: number[],
) => {
  if (assessmentIds.length === 0) {
    return {
      questionsByAssessment: new Map<number, Question[]>(),
      randomRulesByAssessment: new Map<number, RandomSubjectSelection[]>(),
    };
  }

  const [{ data: questionRows, error: questionsError }, { data: randomRuleRows, error: randomRulesError }] =
    await Promise.all([
      supabase
        .from("assessment_questions")
        .select("id, assessment_id, question_text, question_type, options, correct_answer, explanation, subject, position")
        .in("assessment_id", assessmentIds)
        .order("position", { ascending: true }),
      supabase
        .from("assessment_random_rules")
        .select("id, assessment_id, subject, count")
        .in("assessment_id", assessmentIds),
    ]);

  if (questionsError) throw questionsError;
  if (randomRulesError) throw randomRulesError;

  const questionsByAssessment = new Map<number, Question[]>();
  ((questionRows ?? []) as AssessmentQuestionRow[]).forEach((questionRow) => {
    const current = questionsByAssessment.get(questionRow.assessment_id) ?? [];
    current.push(mapQuestionRow(questionRow));
    questionsByAssessment.set(questionRow.assessment_id, current);
  });

  const randomRulesByAssessment = new Map<number, RandomSubjectSelection[]>();
  ((randomRuleRows ?? []) as AssessmentRandomRuleRow[]).forEach((rule) => {
    const current = randomRulesByAssessment.get(rule.assessment_id) ?? [];
    current.push({
      subject: rule.subject,
      count: rule.count,
    });
    randomRulesByAssessment.set(rule.assessment_id, current);
  });

  return { questionsByAssessment, randomRulesByAssessment };
};

export const loadAssessmentsFromSupabase = async (
  supabase: SupabaseClient,
  courseId?: number,
): Promise<AssessmentFull[]> => {
  const assessmentsQuery = supabase
    .from("assessments")
    .select(assessmentSelect)
    .order("created_at", { ascending: false });

  const scopedAssessmentsQuery =
    typeof courseId === "number"
      ? assessmentsQuery.eq("course_id", courseId)
      : assessmentsQuery;

  const { data: assessmentsData, error: assessmentsError } = await scopedAssessmentsQuery;

  if (assessmentsError) throw assessmentsError;

  const assessmentRows = (assessmentsData ?? []) as AssessmentRow[];
  const assessmentIds = assessmentRows.map((assessment) => assessment.id);
  const { questionsByAssessment, randomRulesByAssessment } =
    await loadAssessmentRelations(supabase, assessmentIds);

  return assessmentRows.map((assessment) =>
    mapAssessmentRow(
      assessment,
      questionsByAssessment.get(assessment.id) ?? [],
      randomRulesByAssessment.get(assessment.id) ?? [],
    ),
  );
};

const fetchAssessmentById = async (
  supabase: SupabaseClient,
  assessmentId: number,
): Promise<AssessmentFull> => {
  const { data: assessmentData, error: assessmentError } = await supabase
    .from("assessments")
    .select(assessmentSelect)
    .eq("id", assessmentId)
    .single();

  if (assessmentError) throw assessmentError;

  const { questionsByAssessment, randomRulesByAssessment } =
    await loadAssessmentRelations(supabase, [assessmentId]);

  return mapAssessmentRow(
    assessmentData as AssessmentRow,
    questionsByAssessment.get(assessmentId) ?? [],
    randomRulesByAssessment.get(assessmentId) ?? [],
  );
};

const getCurrentUserId = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) {
    throw new Error("You must be signed in to manage assessments.");
  }
  return data.user.id;
};

const validateAssessmentPayload = (
  data: Pick<
    CreateAssessmentRequest,
    | "title"
    | "maxAttempts"
    | "questionMode"
    | "questions"
    | "randomSubjectSelections"
    | "releaseDate"
    | "deadline"
  >,
) => {
  if (!data.title.trim()) {
    throw new Error("Assessment title is required.");
  }

  if (!Number.isFinite(data.maxAttempts) || data.maxAttempts < 1) {
    throw new Error("Max attempts must be at least 1.");
  }

  if (data.releaseDate && data.deadline) {
    const releaseAt = new Date(data.releaseDate).getTime();
    const deadlineAt = new Date(data.deadline).getTime();

    if (Number.isFinite(releaseAt) && Number.isFinite(deadlineAt) && deadlineAt < releaseAt) {
      throw new Error("Deadline must be later than the release date.");
    }
  }

  if (data.questionMode === "manual" && data.questions.length === 0) {
    throw new Error("Manual assessments must include at least one question.");
  }

  if (data.questionMode === "random" && data.randomSubjectSelections.length === 0) {
    throw new Error("Random assessments must include at least one subject rule.");
  }
};

const syncAssessmentChildren = async (
  supabase: SupabaseClient,
  assessmentId: number,
  questionMode: "manual" | "random",
  questions: Question[],
  randomSubjectSelections: RandomSubjectSelection[],
) => {
  const [deleteQuestionsResult, deleteRandomRulesResult] = await Promise.all([
    supabase.from("assessment_questions").delete().eq("assessment_id", assessmentId),
    supabase.from("assessment_random_rules").delete().eq("assessment_id", assessmentId),
  ]);

  if (deleteQuestionsResult.error) throw deleteQuestionsResult.error;
  if (deleteRandomRulesResult.error) throw deleteRandomRulesResult.error;

  if (questionMode === "manual" && questions.length > 0) {
    const questionRows = questions.map((question, index) => ({
      assessment_id: assessmentId,
      position: index,
      question_text: question.text,
      question_type: question.type,
      options: question.options,
      correct_answer: question.correctAnswer ?? null,
      explanation: question.explanation ?? null,
      subject: question.subject ?? null,
    }));

    const { error } = await supabase.from("assessment_questions").insert(questionRows);
    if (error) throw error;
  }

  if (questionMode === "random" && randomSubjectSelections.length > 0) {
    const randomRuleRows = randomSubjectSelections.map((selection) => ({
      assessment_id: assessmentId,
      subject: selection.subject,
      count: selection.count,
    }));

    const { error } = await supabase.from("assessment_random_rules").insert(randomRuleRows);
    if (error) throw error;
  }
};

export const createAssessmentInSupabase = async (
  supabase: SupabaseClient,
  data: CreateAssessmentRequest,
): Promise<AssessmentFull> => {
  validateAssessmentPayload(data);
  const userId = await getCurrentUserId(supabase);

  const { data: assessmentData, error: assessmentError } = await supabase
    .from("assessments")
    .insert({
      course_id: data.courseId,
      title: data.title,
      description: data.description,
      duration: data.duration ?? null,
      max_attempts: data.maxAttempts,
      randomize_questions: data.randomizeQuestions,
      shuffle_answers: data.shuffleAnswers,
      is_enabled: data.isEnabled,
      allow_hints: data.allowHints,
      release_date: data.releaseDate ?? null,
      deadline: data.deadline ?? null,
      question_mode: data.questionMode,
      created_by: userId,
    })
    .select("id")
    .single();

  if (assessmentError) throw assessmentError;

  const assessmentId = Number(assessmentData.id);
  await syncAssessmentChildren(
    supabase,
    assessmentId,
    data.questionMode,
    data.questions,
    data.randomSubjectSelections,
  );

  return fetchAssessmentById(supabase, assessmentId);
};

export const updateAssessmentInSupabase = async (
  supabase: SupabaseClient,
  data: UpdateAssessmentRequest,
): Promise<AssessmentFull> => {
  const updatePayload: Record<string, unknown> = {};

  if (data.courseId !== undefined) updatePayload.course_id = data.courseId;
  if (data.title !== undefined) updatePayload.title = data.title;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.duration !== undefined) updatePayload.duration = data.duration ?? null;
  if (data.maxAttempts !== undefined) updatePayload.max_attempts = data.maxAttempts;
  if (data.randomizeQuestions !== undefined) updatePayload.randomize_questions = data.randomizeQuestions;
  if (data.shuffleAnswers !== undefined) updatePayload.shuffle_answers = data.shuffleAnswers;
  if (data.isEnabled !== undefined) updatePayload.is_enabled = data.isEnabled;
  if (data.allowHints !== undefined) updatePayload.allow_hints = data.allowHints;
  if (data.releaseDate !== undefined) updatePayload.release_date = data.releaseDate ?? null;
  if (data.deadline !== undefined) updatePayload.deadline = data.deadline ?? null;
  if (data.questionMode !== undefined) updatePayload.question_mode = data.questionMode;

  const { error: assessmentError } = await supabase
    .from("assessments")
    .update(updatePayload)
    .eq("id", data.id);

  if (assessmentError) throw assessmentError;

  const current = await fetchAssessmentById(supabase, data.id);
  const nextQuestionMode = data.questionMode ?? current.questionMode;
  const nextQuestions = data.questions ?? current.questions;
  const nextRandomRules = data.randomSubjectSelections ?? current.randomSubjectSelections;
  const nextTitle = data.title ?? current.title;
  const nextMaxAttempts = data.maxAttempts ?? current.maxAttempts;
  const nextReleaseDate = data.releaseDate ?? current.releaseDate;
  const nextDeadline = data.deadline ?? current.deadline;

  validateAssessmentPayload({
    title: nextTitle,
    maxAttempts: nextMaxAttempts,
    questionMode: nextQuestionMode,
    questions: nextQuestions,
    randomSubjectSelections: nextRandomRules,
    releaseDate: nextReleaseDate,
    deadline: nextDeadline,
  });

  await syncAssessmentChildren(
    supabase,
    data.id,
    nextQuestionMode,
    nextQuestions,
    nextRandomRules,
  );

  return fetchAssessmentById(supabase, data.id);
};

export const deleteAssessmentInSupabase = async (
  supabase: SupabaseClient,
  assessmentId: number,
) => {
  const { error } = await supabase.from("assessments").delete().eq("id", assessmentId);
  if (error) throw error;
};
