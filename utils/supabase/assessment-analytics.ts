import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/utils/supabase/enrollment-statuses";

export type AssessmentAnalytics = {
  assessmentId: number;
  totalStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  averageScore: number;
  completionRate: number;
};

export type QuestionInsight = {
  assessmentId: number;
  questionPosition: number;
  questionText: string;
  subject?: string;
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  correctRate: number;
};

type AttemptAnalyticsRow = {
  assessment_id: number;
  student_id: string;
  status: "in_progress" | "completed" | "abandoned";
  score?: number | null;
};

type QuestionAnalyticsRow = {
  question_position: number;
  question_text: string;
  subject?: string | null;
  is_correct: boolean;
  assessment_attempts: Array<{
    assessment_id: number;
    status: "in_progress" | "completed" | "abandoned";
  }>;
};

export const loadAssessmentAnalyticsForCourse = async (
  supabase: SupabaseClient,
  courseId: number,
): Promise<Map<number, AssessmentAnalytics>> => {
  const [{ data: attemptsData, error: attemptsError }, { count: enrolledCount, error: enrollmentsError }] =
    await Promise.all([
      supabase
        .from("assessment_attempts")
        .select("assessment_id, student_id, status, score, assessments!inner(course_id)")
        .eq("assessments.course_id", courseId),
      supabase
        .from("enrollments")
        .select("student_id", { count: "exact", head: true })
        .eq("course_id", courseId)
        .in("status", [...ACTIVE_ENROLLMENT_STATUSES]),
    ]);

  if (attemptsError) throw attemptsError;
  if (enrollmentsError) throw enrollmentsError;

  const totalStudents = enrolledCount ?? 0;
  const byAssessment = new Map<
    number,
    {
      completedStudents: Set<string>;
      inProgressStudents: Set<string>;
      scores: number[];
    }
  >();

  ((attemptsData ?? []) as AttemptAnalyticsRow[]).forEach((row) => {
    const current = byAssessment.get(row.assessment_id) ?? {
      completedStudents: new Set<string>(),
      inProgressStudents: new Set<string>(),
      scores: [],
    };

    if (row.status === "completed") {
      current.completedStudents.add(row.student_id);
      if (typeof row.score === "number") {
        current.scores.push(row.score);
      }
    }

    if (row.status === "in_progress") {
      current.inProgressStudents.add(row.student_id);
    }

    byAssessment.set(row.assessment_id, current);
  });

  const analytics = new Map<number, AssessmentAnalytics>();

  byAssessment.forEach((value, assessmentId) => {
    const completedStudents = value.completedStudents.size;
    const inProgressStudents = value.inProgressStudents.size;
    const averageScore =
      value.scores.length > 0
        ? value.scores.reduce((sum, score) => sum + score, 0) / value.scores.length
        : 0;

    analytics.set(assessmentId, {
      assessmentId,
      totalStudents,
      completedStudents,
      inProgressStudents,
      averageScore,
      completionRate: totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0,
    });
  });

  return analytics;
};

export const loadQuestionInsightsForCourse = async (
  supabase: SupabaseClient,
  courseId: number,
): Promise<QuestionInsight[]> => {
  const { data, error } = await supabase
    .from("assessment_attempt_answers")
    .select(
      "question_position, question_text, subject, is_correct, assessment_attempts!inner(assessment_id, status, assessments!inner(course_id))",
    )
    .eq("assessment_attempts.assessments.course_id", courseId)
    .eq("assessment_attempts.status", "completed");

  if (error) throw error;

  const byQuestion = new Map<
    string,
    {
      assessmentId: number;
      questionPosition: number;
      questionText: string;
      subject?: string;
      totalAttempts: number;
      correctAttempts: number;
    }
  >();

  ((data ?? []) as unknown as QuestionAnalyticsRow[]).forEach((row) => {
    const attempt = row.assessment_attempts?.[0];
    if (!attempt?.assessment_id) return;

    const key = `${attempt.assessment_id}:${row.question_position}:${row.question_text}`;
    const current = byQuestion.get(key) ?? {
      assessmentId: attempt.assessment_id,
      questionPosition: row.question_position,
      questionText: row.question_text,
      subject: row.subject ?? undefined,
      totalAttempts: 0,
      correctAttempts: 0,
    };

    current.totalAttempts += 1;
    if (row.is_correct) {
      current.correctAttempts += 1;
    }

    byQuestion.set(key, current);
  });

  return Array.from(byQuestion.values())
    .map((question) => {
      const incorrectAttempts = question.totalAttempts - question.correctAttempts;
      return {
        ...question,
        incorrectAttempts,
        correctRate:
          question.totalAttempts > 0
            ? (question.correctAttempts / question.totalAttempts) * 100
            : 0,
      };
    })
    .sort((left, right) => {
      if (left.correctRate !== right.correctRate) return left.correctRate - right.correctRate;
      return right.totalAttempts - left.totalAttempts;
    });
};
