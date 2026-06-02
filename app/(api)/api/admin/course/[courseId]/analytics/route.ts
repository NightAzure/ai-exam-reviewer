import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import type { AdminCourseAnalytics } from "@/types/admin-analytics";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/utils/supabase/enrollment-statuses";

const formatRelativeTime = (isoDate: string) => {
  const target = new Date(isoDate).getTime();
  const diffMs = Date.now() - target;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const requireCourseEditor = async (courseId: number) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: isEditor, error: editorError } = await supabase.rpc("is_course_editor", {
    _course_id: courseId,
    _user_id: user.id,
  });

  if (editorError || !isEditor) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return null;
};

const parseCourseId = async (params: Promise<{ courseId: string }>) => {
  const { courseId } = await params;
  const parsed = Number(courseId);

  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid course id");
  }

  return parsed;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  void request;

  try {
    const courseId = await parseCourseId(params);
    const authError = await requireCourseEditor(courseId);
    if (authError) return authError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { data: enrollmentsData, error: enrollmentsError },
      { data: attemptsData, error: attemptsError },
      { data: threadsData, error: threadsError },
    ] = await Promise.all([
      adminSupabase
        .from("enrollments")
        .select("student_id, status")
        .eq("course_id", courseId)
        .in("status", [...ACTIVE_ENROLLMENT_STATUSES]),
      adminSupabase
        .from("assessment_attempts")
        .select(
          "student_id, status, score, started_at, submitted_at, updated_at, assessments!inner(title, course_id)",
        )
        .eq("assessments.course_id", courseId),
      adminSupabase
        .from("chat_threads")
        .select("user_id, updated_at")
        .eq("course_id", courseId)
        .gte("updated_at", today.toISOString()),
    ]);

    if (enrollmentsError) throw enrollmentsError;
    if (attemptsError) throw attemptsError;
    if (threadsError) throw threadsError;

    const courseUserIds = Array.from(
      new Set([
        ...(enrollmentsData ?? []).map((r) => r.student_id),
        ...(attemptsData ?? []).map((r) => (r as { student_id: string }).student_id),
      ].filter(Boolean))
    );

    const { data: profilesData, error: profilesError } = courseUserIds.length > 0
      ? await adminSupabase
          .from("profiles")
          .select("id, first_name, second_name, username")
          .in("id", courseUserIds)
      : { data: [], error: null };

    if (profilesError) throw profilesError;

    const profileMap = new Map(
      (profilesData ?? []).map((profile) => [
        profile.id,
        {
          first_name: profile.first_name,
          second_name: profile.second_name,
          username: profile.username,
        },
      ]),
    );

    const enrolledStudents = new Set((enrollmentsData ?? []).map((row) => row.student_id));
    const attempts = (attemptsData ?? []) as Array<{
      student_id: string;
      status: "in_progress" | "completed" | "abandoned";
      score: number | null;
      started_at?: string | null;
      submitted_at?: string | null;
      updated_at?: string | null;
      assessments: { title: string; course_id: number }[] | { title: string; course_id: number } | null;
    }>;

    const scoresByStudent = new Map<string, number[]>();
    const completedStudents = new Set<string>();
    const activeToday = new Set<string>();

    attempts.forEach((attempt) => {
      const startedAt = attempt.started_at ? new Date(attempt.started_at) : null;
      const submittedAt = attempt.submitted_at ? new Date(attempt.submitted_at) : null;
      const updatedAt = attempt.updated_at ? new Date(attempt.updated_at) : null;

      if (
        (startedAt && startedAt >= today) ||
        (submittedAt && submittedAt >= today) ||
        (updatedAt && updatedAt >= today)
      ) {
        activeToday.add(attempt.student_id);
      }

      if (attempt.status === "completed") {
        completedStudents.add(attempt.student_id);
        if (typeof attempt.score === "number") {
          const current = scoresByStudent.get(attempt.student_id) ?? [];
          current.push(attempt.score);
          scoresByStudent.set(attempt.student_id, current);
        }
      }
    });

    (threadsData ?? []).forEach((thread) => {
      if (thread.user_id) {
        activeToday.add(thread.user_id);
      }
    });

    let excellent = 0;
    let onTrack = 0;
    let atRisk = 0;
    let needsHelp = 0;
    let totalAverageScore = 0;
    let scoreSamples = 0;

    scoresByStudent.forEach((scores) => {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      totalAverageScore += average;
      scoreSamples += 1;

      if (average >= 90) {
        excellent += 1;
      } else if (average >= 70) {
        onTrack += 1;
      } else if (average >= 50) {
        atRisk += 1;
      } else {
        needsHelp += 1;
      }
    });

    const recentActivity = attempts
      .slice()
      .sort((left, right) => {
        const leftTime = new Date(left.submitted_at ?? left.updated_at ?? left.started_at ?? 0).getTime();
        const rightTime = new Date(right.submitted_at ?? right.updated_at ?? right.started_at ?? 0).getTime();
        return rightTime - leftTime;
      })
      .slice(0, 8)
      .map((attempt) => {
        const profile = profileMap.get(attempt.student_id);
        const assessment = Array.isArray(attempt.assessments) ? attempt.assessments[0] : attempt.assessments;
        const student =
          [profile?.first_name, profile?.second_name].filter(Boolean).join(" ").trim() ||
          profile?.username ||
          "Student";
        const time = attempt.submitted_at ?? attempt.updated_at ?? attempt.started_at ?? new Date().toISOString();

        if (attempt.status === "completed" && typeof attempt.score === "number") {
          return {
            student,
            action: `scored ${attempt.score}% on ${assessment?.title ?? "an assessment"}`,
            time: formatRelativeTime(time),
            type: attempt.score >= 75 ? ("success" as const) : ("warning" as const),
          };
        }

        return {
          student,
          action: `started ${assessment?.title ?? "an assessment"}`,
          time: formatRelativeTime(time),
          type: "info" as const,
        };
      });

    const analytics: AdminCourseAnalytics = {
      totalEnrolled: enrolledStudents.size,
      averageScore: scoreSamples > 0 ? Math.round(totalAverageScore / scoreSamples) : 0,
      completionRate:
        enrolledStudents.size > 0
          ? Math.round((completedStudents.size / enrolledStudents.size) * 100)
          : 0,
      activeToday: activeToday.size,
      studentsByStatus: {
        excellent,
        onTrack,
        atRisk,
        needsHelp,
      },
      recentActivity,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load course analytics";
    return NextResponse.json({ message }, { status: 500 });
  }
}
