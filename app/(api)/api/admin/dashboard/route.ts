import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import type { AdminDashboardAnalytics } from "@/types/admin-analytics";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/utils/supabase/enrollment-statuses";

type AuthAdminUser = {
  id: string;
  created_at?: string | null;
  last_sign_in_at?: string | null;
};

const monthLabel = (date: Date) =>
  date.toLocaleString("en-US", { month: "short" });

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
const subMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() - months, 1);
const startOfToday = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};
const startOfWeek = (date: Date) => {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  const result = new Date(date);
  result.setDate(date.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
};
const endOfWeek = (date: Date) => {
  const start = startOfWeek(date);
  const result = new Date(start);
  result.setDate(start.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
};
const subWeeks = (date: Date, weeks: number) => {
  const result = new Date(date);
  result.setDate(date.getDate() - weeks * 7);
  return result;
};

const requireAdmin = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (profileError || !profile || profile.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return null;
};

const listAllUsers = async (): Promise<AuthAdminUser[]> => {
  const users: AuthAdminUser[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw error;

    users.push(...(data.users as AuthAdminUser[]));

    if (!data.nextPage || data.users.length === 0) break;
    page = data.nextPage;
  }

  return users;
};

const monthGrowth = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export async function GET(request: Request) {
  void request;

  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const now = new Date();
    const previousMonthEnd = endOfMonth(subMonths(now, 1));
    const todayStart = startOfToday();

    const [
      users,
      { count: assessmentsCount, error: assessmentsCountError },
      { count: previousAssessmentsTotalCount, error: previousAssessmentsTotalCountError },
      { count: messagesCount, error: messagesCountError },
      { count: previousMessagesTotalCount, error: previousMessagesTotalCountError },
      { data: attemptsData, error: attemptsError },
      { data: courseRows, error: courseRowsError },
      { data: enrollmentsData, error: enrollmentsDataError },
      { data: recentThreads, error: recentThreadsError },
    ] = await Promise.all([
      listAllUsers(),
      adminSupabase.from("assessments").select("id", { count: "exact", head: true }),
      adminSupabase
        .from("assessments")
        .select("id", { count: "exact", head: true })
        .lte("created_at", previousMonthEnd.toISOString()),
      adminSupabase.from("chat_messages").select("id", { count: "exact", head: true }),
      adminSupabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .lte("created_at", previousMonthEnd.toISOString()),
      adminSupabase
        .from("assessment_attempts")
        .select(
          "student_id, status, score, started_at, submitted_at, assessments!inner(course_id, title)",
        ),
      adminSupabase.from("courses").select("id, title, created_at, is_active"),
      adminSupabase
        .from("enrollments")
        .select("course_id, student_id, status")
        .in("status", [...ACTIVE_ENROLLMENT_STATUSES]),
      adminSupabase
        .from("chat_threads")
        .select("user_id, updated_at")
        .gte("updated_at", todayStart.toISOString()),
    ]);

    if (assessmentsCountError) throw assessmentsCountError;
    if (previousAssessmentsTotalCountError) throw previousAssessmentsTotalCountError;
    if (messagesCountError) throw messagesCountError;
    if (previousMessagesTotalCountError) throw previousMessagesTotalCountError;
    if (attemptsError) throw attemptsError;
    if (courseRowsError) throw courseRowsError;
    if (enrollmentsDataError) throw enrollmentsDataError;
    if (recentThreadsError) throw recentThreadsError;

    const previousTotalUsers = users.filter((user) => {
      const createdAt = user.created_at ? new Date(user.created_at) : null;
      return createdAt && createdAt <= previousMonthEnd;
    }).length;

    const activeUsersToday = new Set<string>();
    users.forEach((user) => {
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
      if (lastSignIn && lastSignIn >= todayStart) {
        activeUsersToday.add(user.id);
      }
    });

    (recentThreads ?? []).forEach((thread) => {
      if (thread.user_id) activeUsersToday.add(thread.user_id);
    });

    const attempts = (attemptsData ?? []) as Array<{
      student_id: string;
      status: "in_progress" | "completed" | "abandoned";
      score: number | null;
      time_spent_seconds?: number | null;
      started_at?: string | null;
      submitted_at?: string | null;
      assessments: { course_id: number; title: string }[] | { course_id: number; title: string } | null;
    }>;
    const courses = (courseRows ?? []) as Array<{ id: number; title: string; created_at?: string | null; is_active?: boolean | null }>;
    const enrollments = (enrollmentsData ?? []) as Array<{ course_id: number; student_id: string }>;
    const totalCourses = courses.length;
    const previousTotalCourses = courses.filter((course) => {
      const createdAt = course.created_at ? new Date(course.created_at) : null;
      return createdAt && createdAt <= previousMonthEnd;
    }).length;

    attempts.forEach((attempt) => {
      const startedAt = attempt.started_at ? new Date(attempt.started_at) : null;
      const submittedAt = attempt.submitted_at ? new Date(attempt.submitted_at) : null;
      if ((startedAt && startedAt >= todayStart) || (submittedAt && submittedAt >= todayStart)) {
        activeUsersToday.add(attempt.student_id);
      }
    });

    const totalEnrolled = new Set(enrollments.map((row) => row.student_id)).size;
    const completedAttempts = attempts.filter((attempt) => attempt.status === "completed");
    const inProgressAttempts = attempts.filter((attempt) => attempt.status === "in_progress");
    const notStartedStudents = Math.max(totalEnrolled - new Set(attempts.map((attempt) => attempt.student_id)).size, 0);
    const completedStudents = new Set(completedAttempts.map((attempt) => attempt.student_id)).size;

    const scoresByStudent = new Map<string, number[]>();
    let totalTimeSpent = 0;
    let timeSamples = 0;

    completedAttempts.forEach((attempt) => {
      if (typeof attempt.score === "number") {
        const current = scoresByStudent.get(attempt.student_id) ?? [];
        current.push(attempt.score);
        scoresByStudent.set(attempt.student_id, current);
      }

      if (typeof attempt.time_spent_seconds === "number" && attempt.time_spent_seconds > 0) {
        totalTimeSpent += attempt.time_spent_seconds;
        timeSamples += 1;
      }
    });

    let excellent = 0;
    let good = 0;
    let fair = 0;
    let needsHelp = 0;
    let atRiskStudents = 0;

    scoresByStudent.forEach((scores) => {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      if (average >= 90) {
        excellent += 1;
      } else if (average >= 75) {
        good += 1;
      } else if (average >= 60) {
        fair += 1;
      } else {
        needsHelp += 1;
        atRiskStudents += 1;
      }
    });

    const avgTimeSpentHours =
      timeSamples > 0 ? Number(((totalTimeSpent / timeSamples) / 3600).toFixed(1)) : 0;

    const userGrowthData = Array.from({ length: 6 }, (_, index) => {
      const monthDate = subMonths(now, 5 - index);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const total = users.filter((user) => {
        const createdAt = user.created_at ? new Date(user.created_at) : null;
        return createdAt && createdAt <= monthEnd;
      }).length;

      const active = users.filter((user) => {
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
        return lastSignIn && lastSignIn >= monthStart && lastSignIn <= monthEnd;
      }).length;

      return {
        label: monthLabel(monthDate),
        total,
        active,
      };
    });

    const enrollmentsByCourse = new Map<number, number>();
    enrollments.forEach((row) => {
      enrollmentsByCourse.set(row.course_id, (enrollmentsByCourse.get(row.course_id) ?? 0) + 1);
    });

    const attemptsByCourse = new Map<number, number[]>();
    const completedAttemptsByCourse = new Map<number, number>();
    attempts.forEach((attempt) => {
      const assessment = Array.isArray(attempt.assessments)
        ? attempt.assessments[0]
        : attempt.assessments;
      if (!assessment || attempt.status !== "completed") return;

      completedAttemptsByCourse.set(
        assessment.course_id,
        (completedAttemptsByCourse.get(assessment.course_id) ?? 0) + 1,
      );

      if (typeof attempt.score === "number") {
        const current = attemptsByCourse.get(assessment.course_id) ?? [];
        current.push(attempt.score);
        attemptsByCourse.set(assessment.course_id, current);
      }
    });

    const coursePerformanceData = courses
      .map((course) => {
        const scores = attemptsByCourse.get(course.id) ?? [];
        const avgScore =
          scores.length > 0
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
            : 0;

        return {
          courseId: course.id,
          topic: course.title,
          avgScore,
          students: enrollmentsByCourse.get(course.id) ?? 0,
          completedAttempts: completedAttemptsByCourse.get(course.id) ?? 0,
          isActive: course.is_active ?? false,
        };
      })
      .sort((left, right) => right.students - left.students)
      .slice(0, 6);

    const weeklyRanges = Array.from({ length: 4 }, (_, index) => {
      const weekDate = subWeeks(now, 3 - index);
      return {
        label: `Week ${index + 1}`,
        start: startOfWeek(weekDate),
        end: endOfWeek(weekDate),
      };
    });

    const weeklyActivityData = weeklyRanges.map((range) => {
      const activeUsers = users.filter((user) => {
        const signIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
        return signIn && signIn >= range.start && signIn <= range.end;
      }).length;

      return {
        label: range.label,
        activeUsers,
      };
    });

    const performanceTotal = excellent + good + fair + needsHelp;
    const studentPerformanceData = [
      { category: "Excellent", count: excellent, percentage: performanceTotal > 0 ? Math.round((excellent / performanceTotal) * 100) : 0 },
      { category: "Good", count: good, percentage: performanceTotal > 0 ? Math.round((good / performanceTotal) * 100) : 0 },
      { category: "Fair", count: fair, percentage: performanceTotal > 0 ? Math.round((fair / performanceTotal) * 100) : 0 },
      { category: "Needs Help", count: needsHelp, percentage: performanceTotal > 0 ? Math.round((needsHelp / performanceTotal) * 100) : 0 },
    ];

    const assessmentCompletionData = [
      {
        name: "Completed",
        value: totalEnrolled > 0 ? Math.round((completedStudents / totalEnrolled) * 100) : 0,
        fill: "#10b981",
      },
      {
        name: "In Progress",
        value: totalEnrolled > 0 ? Math.round((new Set(inProgressAttempts.map((attempt) => attempt.student_id)).size / totalEnrolled) * 100) : 0,
        fill: "#f59e0b",
      },
      {
        name: "Not Started",
        value: totalEnrolled > 0 ? Math.round((notStartedStudents / totalEnrolled) * 100) : 0,
        fill: "#ef4444",
      },
    ];

    const topCourse = coursePerformanceData
      .filter((course) => course.students > 0)
      .sort((left, right) => right.avgScore - left.avgScore)[0];
    const busiestWeek = [...weeklyActivityData].sort((left, right) => right.activeUsers - left.activeUsers)[0];
    const activeShare =
      users.length > 0 ? Math.round((activeUsersToday.size / users.length) * 100) : 0;
    const assessmentCoverage =
      totalEnrolled > 0 ? Math.round(((totalEnrolled - notStartedStudents) / totalEnrolled) * 100) : 0;

    const quickInsights = [
      {
        title: activeUsersToday.size > 0 ? "Daily Engagement" : "Quiet Day",
        description:
          users.length > 0
            ? `${activeShare}% of users were active today across sign-ins, chat, or assessments.`
            : "No users are available yet to measure daily engagement.",
        tone: activeShare >= 25 ? "success" : "info",
      },
      {
        title: "Assessment Coverage",
        description:
          totalEnrolled > 0
            ? `${assessmentCoverage}% of enrolled students have started at least one assessment.`
            : "No enrolled students yet, so assessment coverage is not available.",
        tone: assessmentCoverage >= 70 ? "success" : "warning",
      },
      {
        title: busiestWeek ? `Peak Activity: ${busiestWeek.label}` : "Weekly Activity Pending",
        description: busiestWeek
          ? `${busiestWeek.activeUsers} users signed in during the busiest tracked week.`
          : "Weekly activity will appear once users start signing in.",
        tone: busiestWeek && busiestWeek.activeUsers > 0 ? "info" : "warning",
      },
      {
        title: topCourse ? `Top Performer: ${topCourse.topic}` : "No Course Leader Yet",
        description: topCourse
          ? `${topCourse.topic} currently has the strongest average assessment score.`
          : "Once course attempts come in, the top-performing course will show here.",
        tone: "highlight",
      },
    ] as AdminDashboardAnalytics["quickInsights"];

    const analytics: AdminDashboardAnalytics = {
      totalUsers: users.length,
      totalUsersGrowth: monthGrowth(users.length, previousTotalUsers),
      totalCourses,
      totalCoursesGrowth: monthGrowth(totalCourses, previousTotalCourses),
      assessments: assessmentsCount ?? 0,
      assessmentsGrowth: monthGrowth(assessmentsCount ?? 0, previousAssessmentsTotalCount ?? 0),
      messages: messagesCount ?? 0,
      messagesGrowth: monthGrowth(messagesCount ?? 0, previousMessagesTotalCount ?? 0),
      completedAttempts: completedAttempts.length,
      atRiskStudents,
      avgTimeSpentHours,
      activeUsersToday: activeUsersToday.size,
      userGrowthData,
      weeklyActivityData,
      assessmentCompletionData,
      coursePerformanceData,
      studentPerformanceData,
      quickInsights,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("[api/admin/dashboard]", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : error instanceof Error
          ? error.message
          : "Unable to load dashboard analytics";
    const details =
      error && typeof error === "object" && "details" in error
        ? String((error as { details: unknown }).details)
        : undefined;
    return NextResponse.json({ message, ...(details ? { details } : {}) }, { status: 500 });
  }
}
