"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Settings2,
  ShieldCheck,
  Users,
  UserPlus,
} from "lucide-react";
import type { Course } from "@/types/course";
import type { AdminCourseAnalytics } from "@/types/admin-analytics";

const number = new Intl.NumberFormat("en-PH");

type AdminCourseSetupPanelProps = {
  course: Course;
  courseId: number;
  analytics?: AdminCourseAnalytics;
  analyticsLoading?: boolean;
};

function enrollmentLabel(course: Course): string {
  if (!course.isActive) return "Paused — hidden from new student joins";
  if (course.requireEnrollmentApproval) return "Self-enrollment gated by approval";
  if (course.allowSelfEnrollment === false) return "Invite-only membership";
  return "Students can join with the course code";
}

export default function AdminCourseSetupPanel({
  course,
  courseId,
  analytics,
  analyticsLoading = false,
}: AdminCourseSetupPanelProps) {
  const topicCount = course.topics?.length ?? 0;
  const enrolled = analytics?.totalEnrolled;
  const assessedCount = analytics
    ? analytics.studentsByStatus.excellent +
      analytics.studentsByStatus.onTrack +
      analytics.studentsByStatus.atRisk +
      analytics.studentsByStatus.needsHelp
    : 0;
  const evidenceCoverage =
    (enrolled ?? 0) > 0 ? Math.round((assessedCount / (enrolled ?? 1)) * 100) : 0;

  const nextStep = !course.isActive
    ? {
        title: "Reopen this course when you are ready for students",
        description:
          "Paused courses stay out of new joins. Update availability in settings when teaching resumes.",
        href: `/admin/course/${courseId}/manage?tab=settings`,
        action: "Open Settings",
      }
    : topicCount === 0
      ? {
          title: "Add topics before building assessments",
          description:
            "Topics organize practice and review. Create your first topic structure in course management.",
          href: `/admin/course/${courseId}/manage`,
          action: "Manage Topics",
        }
      : analyticsLoading
        ? {
            title: "Checking enrollment and assessment evidence…",
            description:
              "Student counts and attempt data will appear here once analytics finish loading.",
            href: `/admin/course/${courseId}/manage?tab=members`,
            action: "Manage Members",
          }
        : (enrolled ?? 0) === 0
          ? {
              title: "Invite students or share the course code",
              description: enrollmentLabel(course),
              href: `/admin/course/${courseId}/manage?tab=members`,
              action: "Manage Members",
            }
          : assessedCount === 0
            ? {
                title: "Publish an assessment to collect learning evidence",
                description: `${number.format(enrolled ?? 0)} student${(enrolled ?? 0) === 1 ? " is" : "s are"} enrolled, but no scored attempts are available yet.`,
                href: `/admin/course/${courseId}/assessments`,
                action: "Open Assessments",
              }
            : {
                title: "Review student results and keep topics current",
                description: `${number.format(assessedCount)} student${assessedCount === 1 ? " has" : "s have"} scored assessment evidence. Use Students and Insights to decide who needs support.`,
                href: `#course-workspace`,
                action: "View Students",
              };

  return (
    <aside
      aria-labelledby="continue-setup-heading"
      className="relative isolate overflow-hidden rounded-3xl bg-ink p-6 text-canvas shadow-[0_20px_45px_-30px_rgb(24_36_58_/_0.8)] sm:p-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-7 -top-7 size-40 rounded-full border border-brass/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-[39%] h-px w-48 bg-gradient-to-r from-transparent via-brass/40 to-transparent"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brass">
              Continue course setup
            </p>
            {course.code ? (
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.12em] text-[#d8e0ea]">
                {course.code}
              </span>
            ) : null}
          </div>
          <h2
            id="continue-setup-heading"
            className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none text-white text-balance"
          >
            {nextStep.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#c9d1dc]">{nextStep.description}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 pl-4 lg:min-w-72">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#aeb8c7]">
              Evidence coverage
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {analyticsLoading
                ? "Checking learning signals"
                : (enrolled ?? 0) === 0
                  ? "Waiting for students"
                  : `${number.format(assessedCount)} of ${number.format(enrolled ?? 0)} students assessed`}
            </p>
            {!analyticsLoading && (enrolled ?? 0) > 0 ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-brass transition-[width] duration-500"
                  style={{ width: `${evidenceCoverage}%` }}
                />
              </div>
            ) : null}
          </div>
          <Link
            href={nextStep.href}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
          >
            {nextStep.action}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>

      <div className="relative mt-7 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition-colors hover:bg-white/[0.09]">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#aeb8c7]">
            <ShieldCheck aria-hidden="true" className="size-3.5 text-brass" />
            Access
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {course.isActive ? "Live" : "Paused"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#c9d1dc]">{enrollmentLabel(course)}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition-colors hover:bg-white/[0.09]">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#aeb8c7]">
            <BookOpen aria-hidden="true" className="size-3.5 text-brass" />
            Topics
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none tabular-nums text-white">
            {number.format(topicCount)}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#c9d1dc]">
            {topicCount === 0 ? "No topics authored yet" : "Ready to organize practice"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition-colors hover:bg-white/[0.09]">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#aeb8c7]">
            <Users aria-hidden="true" className="size-3.5 text-brass" />
            Students
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none tabular-nums text-white">
            {analyticsLoading ? "…" : number.format(enrolled ?? course.stats?.totalStudents ?? 0)}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#c9d1dc]">
            {course.allowSelfEnrollment === false ? (
              <span className="inline-flex items-center gap-1">
                <UserPlus aria-hidden="true" className="size-3" />
                Invite only
              </span>
            ) : course.requireEnrollmentApproval ? (
              "Approval required"
            ) : (
              "Self-enroll enabled"
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition-colors hover:bg-white/[0.09]">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#aeb8c7]">
            <ClipboardList aria-hidden="true" className="size-3.5 text-brass" />
            Evidence
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none tabular-nums text-white">
            {analyticsLoading ? "…" : number.format(assessedCount)}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#c9d1dc]">
            {analyticsLoading
              ? "Loading assessment evidence…"
              : assessedCount === 0
                ? "Not assessed yet"
                : "Students with scored attempts"}
          </p>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        <Link
          href={`/admin/course/${courseId}/manage`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
        >
          <Settings2 aria-hidden="true" className="size-4" />
          Manage Course
        </Link>
        <Link
          href={`/admin/course/${courseId}/manage?tab=members`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
        >
          <Users aria-hidden="true" className="size-4" />
          Members
        </Link>
        <Link
          href={`/admin/course/${courseId}/assessments`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
        >
          <ClipboardList aria-hidden="true" className="size-4" />
          Assessments
        </Link>
      </div>
    </aside>
  );
}
