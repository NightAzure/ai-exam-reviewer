import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AssessmentAttempt,
  AssessmentAttemptAnswer,
  AssessmentAttemptSummary,
  AssessmentFull,
  ResolvedAssessmentQuestion,
} from "@/types/assessment";
import { mapQuestionRow } from "@/utils/supabase/assessments";
import { choicesFromBankRow } from "@/utils/supabase/question-bank";

type AttemptRow = {
  id: number;
  assessment_id: number;
  student_id: string;
  attempt_number: number;
  status: "in_progress" | "completed" | "abandoned";
  score?: number | null;
  total_questions?: number | null;
  answered_questions?: number | null;
  correct_answers?: number | null;
  time_spent_seconds?: number | null;
  started_at: string;
  submitted_at?: string | null;
};

type AttemptAnswerRow = {
  id: number;
  attempt_id: number;
  question_id?: number | null;
  question_position: number;
  question_text: string;
  question_type?: string | null;
  options?: unknown;
  selected_answer?: string | null;
  correct_answer?: string | null;
  explanation?: string | null;
  subject?: string | null;
  is_correct: boolean;
  created_at: string;
};

type CourseQuestionRow = {
  id: number;
  question: string;
  question_type: string;
  subject?: string | null;
  choice_a?: string | null;
  choice_b?: string | null;
  choice_c?: string | null;
  choice_d?: string | null;
  choice_e?: string | null;
  correct_answer?: string | null;
  explanation?: string | null;
};

type SubmitAssessmentAttemptInput = {
  attemptId?: number;
  assessment: AssessmentFull;
  questions: ResolvedAssessmentQuestion[];
  selectedAnswers: Array<string | null>;
  startedAt: string;
  timeSpentSeconds: number;
};

type SaveAssessmentDraftInput = {
  attemptId: number;
  assessment: AssessmentFull;
  questions: ResolvedAssessmentQuestion[];
  selectedAnswers: Array<string | null>;
  startedAt: string;
  timeSpentSeconds: number;
};

type AssessmentAccessRow = {
  id: number;
  course_id: number;
  is_enabled?: boolean | null;
  release_date?: string | null;
  deadline?: string | null;
  max_attempts?: number | null;
  course?: { is_active?: boolean | null } | Array<{ is_active?: boolean | null }> | null;
};

const normalizeOptions = (options: unknown): string[] => {
  if (!Array.isArray(options)) return [];
  return options.filter((option): option is string => typeof option === "string");
};

const mapAttemptRow = (row: AttemptRow): AssessmentAttemptSummary => ({
  id: row.id,
  assessmentId: row.assessment_id,
  studentId: row.student_id,
  attemptNumber: row.attempt_number,
  startedAt: row.started_at,
  submittedAt: row.submitted_at ?? undefined,
  score: row.score ?? undefined,
  totalQuestions: row.total_questions ?? 0,
  answeredQuestions: row.answered_questions ?? 0,
  correctAnswers: row.correct_answers ?? 0,
  timeSpentSeconds: row.time_spent_seconds ?? undefined,
  status: row.status,
});

const mapAttemptAnswerRow = (row: AttemptAnswerRow): AssessmentAttemptAnswer => ({
  id: row.id,
  attemptId: row.attempt_id,
  questionId: row.question_id != null ? String(row.question_id) : undefined,
  questionPosition: row.question_position,
  questionText: row.question_text,
  questionType: "multiple-choice",
  options: normalizeOptions(row.options),
  selectedAnswer: row.selected_answer ?? undefined,
  correctAnswer: row.correct_answer ?? undefined,
  explanation: row.explanation ?? undefined,
  subject: row.subject ?? undefined,
  isCorrect: row.is_correct,
  createdAt: row.created_at,
});

const getCurrentUserId = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) {
    throw new Error("You must be signed in to take assessments.");
  }
  return data.user.id;
};

const unwrapCourse = (
  course: AssessmentAccessRow["course"],
): { is_active?: boolean | null } | null => {
  if (Array.isArray(course)) return course[0] ?? null;
  return course ?? null;
};

const assertAssessmentAttemptRules = async (
  supabase: SupabaseClient,
  assessmentId: number,
  userId: string,
  attemptId?: number,
) => {
  const { data: assessmentRow, error: assessmentError } = await supabase
    .from("assessments")
    .select(
      "id, course_id, is_enabled, release_date, deadline, max_attempts, course:courses!inner(is_active)",
    )
    .eq("id", assessmentId)
    .single();

  if (assessmentError) throw assessmentError;

  const assessment = assessmentRow as AssessmentAccessRow;
  const course = unwrapCourse(assessment.course);
  const now = Date.now();

  if (course?.is_active === false) {
    throw new Error("This course is currently disabled.");
  }

  if (!assessment.is_enabled) {
    throw new Error("This assessment is currently disabled.");
  }

  if (assessment.release_date && new Date(assessment.release_date).getTime() > now) {
    throw new Error("This assessment is not available yet.");
  }

  if (assessment.deadline && new Date(assessment.deadline).getTime() < now) {
    throw new Error("The deadline for this assessment has already passed.");
  }

  const { data: attemptRows, error: attemptsError } = await supabase
    .from("assessment_attempts")
    .select("id, status, attempt_number")
    .eq("assessment_id", assessmentId)
    .eq("student_id", userId);

  if (attemptsError) throw attemptsError;

  const attempts = (attemptRows ?? []) as Array<{
    id: number;
    status: "in_progress" | "completed" | "abandoned";
    attempt_number: number;
  }>;

  const completedAttempts = attempts.filter((row) => row.status === "completed").length;
  const inProgressAttempt = attempts.find((row) => row.status === "in_progress") ?? null;

  if (attemptId != null) {
    const matchingAttempt = attempts.find((row) => row.id === attemptId);
    if (!matchingAttempt) {
      throw new Error("This assessment attempt could not be found.");
    }

    if (matchingAttempt.status !== "in_progress") {
      throw new Error("This assessment attempt is no longer editable.");
    }

    return;
  }

  if (inProgressAttempt) {
    return;
  }

  const maxAttempts = assessment.max_attempts ?? 1;
  if (completedAttempts >= maxAttempts) {
    throw new Error("You have already used all available attempts for this assessment.");
  }
};

const attemptSelect = `
  id,
  assessment_id,
  student_id,
  attempt_number,
  status,
  score,
  total_questions,
  answered_questions,
  correct_answers,
  time_spent_seconds,
  started_at,
  submitted_at
`;

const computeAttemptMetrics = (
  questions: ResolvedAssessmentQuestion[],
  selectedAnswers: Array<string | null>,
) => {
  const answeredQuestions = selectedAnswers.filter((answer) => answer !== null).length;
  const correctAnswers = questions.reduce((count, question, index) => {
    const selectedAnswer = selectedAnswers[index];
    return selectedAnswer != null && selectedAnswer === question.correctAnswer ? count + 1 : count;
  }, 0);
  const totalQuestions = questions.length;
  const score = totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100);

  return {
    answeredQuestions,
    correctAnswers,
    totalQuestions,
    score,
  };
};

const buildAnswerRows = (
  attemptId: number,
  questions: ResolvedAssessmentQuestion[],
  selectedAnswers: Array<string | null>,
) =>
  questions.map((question, index) => ({
    attempt_id: attemptId,
    question_id:
      question.sourceQuestionTable === "question_bank"
        ? null
        : question.sourceQuestionId
          ? Number(question.sourceQuestionId) || null
          : null,
    question_position: index,
    question_text: question.text,
    question_type: question.type,
    options: question.options,
    selected_answer: selectedAnswers[index],
    correct_answer: question.correctAnswer ?? null,
    explanation: question.explanation ?? null,
    subject: question.subject ?? null,
    is_correct:
      selectedAnswers[index] != null &&
      selectedAnswers[index] === (question.correctAnswer ?? null),
  }));

const syncAttemptAnswers = async (
  supabase: SupabaseClient,
  attemptId: number,
  questions: ResolvedAssessmentQuestion[],
  selectedAnswers: Array<string | null>,
) => {
  const answerRows = buildAnswerRows(attemptId, questions, selectedAnswers);
  const { error } = await supabase
    .from("assessment_attempt_answers")
    .upsert(answerRows, {
      onConflict: "attempt_id,question_position",
    });

  if (error) throw error;
};

export const loadAssessmentAttemptSummariesForCourse = async (
  supabase: SupabaseClient,
  courseId: number,
): Promise<Map<number, AssessmentAttemptSummary[]>> => {
  const userId = await getCurrentUserId(supabase);
  const { data, error } = await supabase
    .from("assessment_attempts")
    .select(`assessment_id, ${attemptSelect}, assessments!inner(course_id)`)
    .eq("student_id", userId)
    .eq("assessments.course_id", courseId)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (error) throw error;

  const attemptsByAssessment = new Map<number, AssessmentAttemptSummary[]>();
  ((data ?? []) as Array<AttemptRow & { assessment_id: number }>).forEach((row) => {
    const summary = mapAttemptRow(row);
    const current = attemptsByAssessment.get(summary.assessmentId) ?? [];
    current.push(summary);
    attemptsByAssessment.set(summary.assessmentId, current);
  });

  return attemptsByAssessment;
};

export const loadAssessmentAttemptById = async (
  supabase: SupabaseClient,
  attemptId: number,
): Promise<AssessmentAttempt> => {
  const { data: attemptRow, error: attemptError } = await supabase
    .from("assessment_attempts")
    .select(attemptSelect)
    .eq("id", attemptId)
    .single();

  if (attemptError) throw attemptError;

  const { data: answerRows, error: answersError } = await supabase
    .from("assessment_attempt_answers")
    .select(
      "id, attempt_id, question_id, question_position, question_text, question_type, options, selected_answer, correct_answer, explanation, subject, is_correct, created_at",
    )
    .eq("attempt_id", attemptId)
    .order("question_position", { ascending: true });

  if (answersError) throw answersError;

  return {
    ...mapAttemptRow(attemptRow as AttemptRow),
    answers: ((answerRows ?? []) as AttemptAnswerRow[]).map(mapAttemptAnswerRow),
  };
};

export const loadInProgressAssessmentAttempt = async (
  supabase: SupabaseClient,
  assessmentId: number,
): Promise<AssessmentAttempt | null> => {
  const userId = await getCurrentUserId(supabase);
  await assertAssessmentAttemptRules(supabase, assessmentId, userId);
  const { data, error } = await supabase
    .from("assessment_attempts")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("student_id", userId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) return null;

  return loadAssessmentAttemptById(supabase, Number(data.id));
};

const shuffleArray = <T,>(input: T[]) => {
  const copy = [...input];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

export const resolveAssessmentQuestions = async (
  supabase: SupabaseClient,
  assessment: AssessmentFull,
): Promise<ResolvedAssessmentQuestion[]> => {
  if (assessment.questionMode === "manual") {
    const questions = assessment.questions.map((question, index) => ({
      ...question,
      sourceQuestionId: question.id,
      sourceQuestionTable: "assessment_questions" as const,
      position: index,
    }));

    return assessment.shuffleAnswers
      ? questions.map((question) => ({
          ...question,
          options: shuffleArray(question.options),
        }))
      : questions;
  }

  const subjects = assessment.randomSubjectSelections.map((selection) => selection.subject);
  if (subjects.length === 0) {
    throw new Error("This assessment has no random question subjects configured.");
  }

  const { data, error } = await supabase
    .from("question_bank")
    .select(
      "id, question, subject, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, explanation",
    )
    .in("subject", subjects);

  if (error) throw error;

  const questionPool = (data ?? []) as CourseQuestionRow[];

  const resolved: ResolvedAssessmentQuestion[] = [];

  assessment.randomSubjectSelections.forEach((selection) => {
    const matching = questionPool.filter((row) => row.subject === selection.subject);
    if (matching.length < selection.count) {
      throw new Error(
        `Not enough question bank items for subject "${selection.subject}". Expected ${selection.count}, found ${matching.length}.`,
      );
    }

    const picked = shuffleArray(matching).slice(0, selection.count);
    picked.forEach((row) => {
      const question = mapQuestionRow({
        id: row.id,
        assessment_id: assessment.id,
        question_text: row.question,
        options: choicesFromBankRow(row),
        correct_answer: row.correct_answer,
        explanation: row.explanation,
        subject: row.subject,
      });

      resolved.push({
        ...question,
        sourceQuestionId: String(row.id),
        sourceQuestionTable: "question_bank",
        position: resolved.length,
        options: assessment.shuffleAnswers ? shuffleArray(question.options) : question.options,
      });
    });
  });

  return assessment.randomizeQuestions ? shuffleArray(resolved).map((question, index) => ({
    ...question,
    position: index,
  })) : resolved.map((question, index) => ({
    ...question,
    position: index,
  }));
};

export const submitAssessmentAttemptInSupabase = async (
  supabase: SupabaseClient,
  input: SubmitAssessmentAttemptInput,
): Promise<AssessmentAttempt> => {
  const userId = await getCurrentUserId(supabase);
  await assertAssessmentAttemptRules(
    supabase,
    input.assessment.id,
    userId,
    input.attemptId,
  );
  const { answeredQuestions, correctAnswers, totalQuestions, score } = computeAttemptMetrics(
    input.questions,
    input.selectedAnswers,
  );

  let attemptId = input.attemptId;

  if (attemptId == null) {
    const { data: rpcId, error: insertAttemptError } = await supabase.rpc(
      "insert_assessment_attempt",
      {
        p_assessment_id: input.assessment.id,
        p_student_id: userId,
        p_status: "completed",
        p_score: score,
        p_total_questions: totalQuestions,
        p_answered_questions: answeredQuestions,
        p_correct_answers: correctAnswers,
        p_time_spent_seconds: input.timeSpentSeconds,
        p_started_at: input.startedAt,
        p_submitted_at: new Date().toISOString(),
      },
    );

    if (insertAttemptError) throw insertAttemptError;
    attemptId = Number(rpcId);
  } else {
    const { error: updateAttemptError } = await supabase
      .from("assessment_attempts")
      .update({
        status: "completed",
        score,
        total_questions: totalQuestions,
        answered_questions: answeredQuestions,
        correct_answers: correctAnswers,
        time_spent_seconds: input.timeSpentSeconds,
        started_at: input.startedAt,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", attemptId);

    if (updateAttemptError) throw updateAttemptError;
  }

  await syncAttemptAnswers(supabase, attemptId, input.questions, input.selectedAnswers);
  return loadAssessmentAttemptById(supabase, attemptId);
};

export const createAssessmentDraftInSupabase = async (
  supabase: SupabaseClient,
  input: Omit<SubmitAssessmentAttemptInput, "timeSpentSeconds" | "attemptId">,
): Promise<AssessmentAttempt> => {
  const existingAttempt = await loadInProgressAssessmentAttempt(supabase, input.assessment.id);
  if (existingAttempt) return existingAttempt;

  const userId = await getCurrentUserId(supabase);
  await assertAssessmentAttemptRules(supabase, input.assessment.id, userId);
  const { answeredQuestions, correctAnswers, totalQuestions } = computeAttemptMetrics(
    input.questions,
    input.selectedAnswers,
  );

  const { data: rpcId, error: insertAttemptError } = await supabase.rpc(
    "insert_assessment_attempt",
    {
      p_assessment_id: input.assessment.id,
      p_student_id: userId,
      p_status: "in_progress",
      p_score: 0,
      p_total_questions: totalQuestions,
      p_answered_questions: answeredQuestions,
      p_correct_answers: correctAnswers,
      p_time_spent_seconds: 0,
      p_started_at: input.startedAt,
      p_submitted_at: null,
    },
  );

  if (insertAttemptError) throw insertAttemptError;

  const attemptId = Number(rpcId);
  await syncAttemptAnswers(supabase, attemptId, input.questions, input.selectedAnswers);
  return loadAssessmentAttemptById(supabase, attemptId);
};

export const saveAssessmentDraftInSupabase = async (
  supabase: SupabaseClient,
  input: SaveAssessmentDraftInput,
): Promise<AssessmentAttempt> => {
  const userId = await getCurrentUserId(supabase);
  await assertAssessmentAttemptRules(
    supabase,
    input.assessment.id,
    userId,
    input.attemptId,
  );
  const { answeredQuestions, correctAnswers, totalQuestions, score } = computeAttemptMetrics(
    input.questions,
    input.selectedAnswers,
  );

  const { error: updateAttemptError } = await supabase
    .from("assessment_attempts")
    .update({
      status: "in_progress",
      score,
      total_questions: totalQuestions,
      answered_questions: answeredQuestions,
      correct_answers: correctAnswers,
      time_spent_seconds: input.timeSpentSeconds,
      started_at: input.startedAt,
      submitted_at: null,
    })
    .eq("id", input.attemptId);

  if (updateAttemptError) throw updateAttemptError;

  await syncAttemptAnswers(
    supabase,
    input.attemptId,
    input.questions,
    input.selectedAnswers,
  );

  return loadAssessmentAttemptById(supabase, input.attemptId);
};
