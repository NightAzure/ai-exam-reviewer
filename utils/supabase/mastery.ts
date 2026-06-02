import type { SupabaseClient } from "@supabase/supabase-js";

const MASTERY_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

function scoreToLevel(
  score: number,
): "needs_work" | "getting_there" | "almost_there" | "proficient" | "mastered" {
  if (score >= 90) return "mastered";
  if (score >= 75) return "proficient";
  if (score >= 60) return "almost_there";
  if (score >= 40) return "getting_there";
  return "needs_work";
}

export async function recalculateSubjectMasteryForCourse(
  supabase: SupabaseClient,
  courseId: number,
  userId: string,
): Promise<number> {
  const { data: attempts, error: attemptsError } = await supabase
    .from("assessment_attempts")
    .select("id, submitted_at, assessments!inner(course_id)")
    .eq("student_id", userId)
    .eq("status", "completed")
    .eq("assessments.course_id", courseId);

  if (attemptsError) throw attemptsError;
  if (!attempts || attempts.length === 0) return 0;

  const attemptIdToSubmittedAt = new Map(
    (attempts as Array<{ id: number; submitted_at: string | null }>).map((attempt) => [
      attempt.id,
      attempt.submitted_at ?? "",
    ]),
  );
  const attemptIds = [...attemptIdToSubmittedAt.keys()];

  const { data: answers, error: answersError } = await supabase
    .from("assessment_attempt_answers")
    .select("attempt_id, subject, is_correct")
    .in("attempt_id", attemptIds);

  if (answersError) throw answersError;
  if (!answers || answers.length === 0) return 0;

  type AttemptStats = { submittedAt: string; total: number; correct: number };
  const subjectMap = new Map<string, Map<number, AttemptStats>>();

  for (const row of answers as Array<{
    attempt_id: number;
    subject: string | null;
    is_correct: boolean;
  }>) {
    const subject = row.subject ?? "General";
    if (!subjectMap.has(subject)) subjectMap.set(subject, new Map());

    const byAttempt = subjectMap.get(subject)!;
    const existing = byAttempt.get(row.attempt_id) ?? {
      submittedAt: attemptIdToSubmittedAt.get(row.attempt_id) ?? "",
      total: 0,
      correct: 0,
    };
    existing.total += 1;
    if (row.is_correct) existing.correct += 1;
    byAttempt.set(row.attempt_id, existing);
  }

  const upserts = [];
  for (const [subject, byAttempt] of subjectMap) {
    const sorted = [...byAttempt.values()].sort((a, b) =>
      b.submittedAt.localeCompare(a.submittedAt),
    );
    const last10 = sorted.slice(0, 10);

    let weightedSum = 0;
    let weightTotal = 0;
    let totalSeen = 0;
    let totalCorrect = 0;

    last10.forEach((attempt, index) => {
      const weight = MASTERY_WEIGHTS[index] ?? 1;
      weightedSum += (attempt.total === 0 ? 0 : attempt.correct / attempt.total) * weight;
      weightTotal += weight;
      totalSeen += attempt.total;
      totalCorrect += attempt.correct;
    });

    const masteryScore = weightTotal === 0 ? 0 : Math.round((weightedSum / weightTotal) * 100);

    upserts.push({
      user_id: userId,
      course_id: courseId,
      subject,
      mastery_score: masteryScore,
      level: scoreToLevel(masteryScore),
      total_questions_seen: totalSeen,
      correct_answers: totalCorrect,
      last_updated: new Date().toISOString(),
    });
  }

  const { error: upsertError } = await supabase
    .from("subject_mastery")
    .upsert(upserts, { onConflict: "user_id,course_id,subject" });

  if (upsertError) throw upsertError;
  return upserts.length;
}
