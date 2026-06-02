import { NextResponse } from "next/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { requireCourseMember } from "@/utils/supabase/course-auth";
import type { CourseAnalytics } from "@/types/course";

const parseCourseId = async (params: Promise<{ courseId: string }>) => {
  const { courseId } = await params;
  const parsed = Number(courseId);

  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid course id");
  }

  return parsed;
};

const confidenceForEvidence = (evidenceCount: number): "none" | "low" | "medium" | "high" => {
  if (evidenceCount <= 0) return "none";
  if (evidenceCount < 3) return "low";
  if (evidenceCount < 8) return "medium";
  return "high";
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  void request;

  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseMember(courseId);
    if (auth.error) return auth.error;
    if (!auth.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const [{ data: topicsData, error: topicsError }, { data: answerRows, error: answersError }] =
      await Promise.all([
        adminSupabase
          .from("topics")
          .select("id, name")
          .eq("course_id", courseId)
          .order("id", { ascending: true }),
        adminSupabase
          .from("assessment_attempt_answers")
          .select(
            "subject, topic_id, is_correct, assessment_attempts!inner(student_id, status, submitted_at, assessments!inner(course_id))",
          )
          .eq("assessment_attempts.student_id", auth.userId)
          .eq("assessment_attempts.status", "completed")
          .eq("assessment_attempts.assessments.course_id", courseId),
      ]);

    if (topicsError) throw topicsError;
    if (answersError) throw answersError;

    // Stats keyed by topic_id (preferred) or subject string (fallback for old answers)
    type TopicStats = { total: number; correct: number; lastPracticedAt: string | null };
    type AnswerAnalyticsRow = {
      subject?: string | null;
      topic_id?: number | null;
      is_correct: boolean;
      assessment_attempts?: { submitted_at?: string | null } | Array<{ submitted_at?: string | null }> | null;
    };

    const topicIdStats = new Map<number, TopicStats>();
    const subjectStats = new Map<string, TopicStats>();

    const touchStats = (stats: TopicStats, row: AnswerAnalyticsRow) => {
      stats.total += 1;
      if (row.is_correct) stats.correct += 1;
      const attempt = Array.isArray(row.assessment_attempts)
        ? row.assessment_attempts[0]
        : row.assessment_attempts;
      const submittedAt = attempt?.submitted_at ?? null;
      if (submittedAt && (!stats.lastPracticedAt || submittedAt > stats.lastPracticedAt)) {
        stats.lastPracticedAt = submittedAt;
      }
    };

    ((answerRows ?? []) as AnswerAnalyticsRow[]).forEach((row) => {
      if (row.topic_id != null) {
        const current = topicIdStats.get(row.topic_id) ?? { total: 0, correct: 0, lastPracticedAt: null };
        touchStats(current, row);
        topicIdStats.set(row.topic_id, current);
      } else {
        const subject = row.subject?.trim();
        if (!subject) return;
        const key = subject.toLowerCase();
        const current = subjectStats.get(key) ?? { total: 0, correct: 0, lastPracticedAt: null };
        touchStats(current, row);
        subjectStats.set(key, current);
      }
    });

    const topics = (topicsData ?? []) as Array<{ id: number; name: string }>;

    const topicProgress = topics.map((topic) => {
      // Prefer ID-keyed stats; fall back to subject string match
      const stats = topicIdStats.get(topic.id) ?? subjectStats.get(topic.name.toLowerCase());
      const progress =
        stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      return {
        topicId: topic.id,
        progress,
        evidenceCount: stats?.total ?? 0,
        correctAnswers: stats?.correct ?? 0,
        confidence: confidenceForEvidence(stats?.total ?? 0),
        lastPracticedAt: stats?.lastPracticedAt ?? null,
      };
    });

    // Build ranked subjects from both stat maps, merging by topic
    const rankedTopics = topics
      .map((topic) => {
        const stats = topicIdStats.get(topic.id) ?? subjectStats.get(topic.name.toLowerCase());
        return {
          subject: topic.name.toLowerCase(),
          score: stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : -1,
        };
      })
      .filter((t) => t.score >= 0)
      .sort((left, right) => right.score - left.score);

    const strengths = rankedTopics
      .filter((t) => t.score >= 75)
      .slice(0, 3)
      .map((t) => t.subject);

    const weaknesses = rankedTopics
      .filter((t) => t.score < 60)
      .slice(0, 3)
      .map((t) => t.subject);

    const evidenceCount = topicProgress.reduce((sum, topic) => sum + topic.evidenceCount, 0);
    const lastPracticedAt = topicProgress.reduce<string | null>((latest, topic) => {
      if (!topic.lastPracticedAt) return latest;
      return !latest || topic.lastPracticedAt > latest ? topic.lastPracticedAt : latest;
    }, null);

    const topicsWithEvidence = topicProgress.filter((topic) => topic.evidenceCount > 0);
    const averageProgress =
      topicProgress.length > 0
        ? Math.round(topicProgress.reduce((sum, topic) => sum + topic.progress, 0) / topicProgress.length)
        : 0;

    const suggestions =
      weaknesses.length > 0
        ? [`Focus next on ${weaknesses[0]} and review missed assessment questions there.`]
        : strengths.length > 0
          ? [`You are doing well in ${strengths[0]}. Keep that momentum with another practice round.`]
          : ["Complete an assessment to generate personalized insights."];

    if (topicsWithEvidence.length > 0 && topicsWithEvidence.length < topicProgress.length) {
      suggestions.unshift("Finish a baseline for the remaining topics so recommendations reflect the full course.");
    }

    const analytics: CourseAnalytics = {
      averageProgress,
      evidenceCount,
      lastPracticedAt,
      strengths,
      weaknesses,
      suggestions,
      topicProgress,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load course analytics";
    return NextResponse.json({ message }, { status: 500 });
  }
}
