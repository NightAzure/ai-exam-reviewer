"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  ClipboardList,
  Users,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminCourseAnalytics } from "@/hooks/use-admin-course-analytics";
import type { Course } from "@/types/course";

const number = new Intl.NumberFormat("en-PH");

interface AdminCourseStatsProps {
  course: Course;
  courseId: number;
}

function HealthRow({
  label,
  value,
  context,
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  context: string;
  href: string;
  icon: typeof Users;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-ink/10 bg-canvas/60 p-3.5 transition-[border-color,background-color,box-shadow] duration-150 hover:border-ink/20 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink/6 text-ink">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate">
            {label}
          </p>
          <ArrowRight
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-slate transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-oxblood"
          />
        </div>
        <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none tabular-nums text-ink">
          {value}
        </p>
        <p className="mt-1.5 text-xs leading-5 text-slate">{context}</p>
      </div>
    </Link>
  );
}

export default function AdminCourseStats({ course, courseId }: AdminCourseStatsProps) {
  const { analytics, isLoading, error } = useAdminCourseAnalytics(course.id);

  const assessedCount = analytics
    ? analytics.studentsByStatus.excellent +
      analytics.studentsByStatus.onTrack +
      analytics.studentsByStatus.atRisk +
      analytics.studentsByStatus.needsHelp
    : 0;
  const needsSupport = analytics
    ? analytics.studentsByStatus.atRisk + analytics.studentsByStatus.needsHelp
    : 0;
  const hasScoreEvidence = assessedCount > 0;
  const enrolled = analytics?.totalEnrolled ?? course.stats?.totalStudents ?? 0;

  return (
    <Card className="rounded-3xl border-ink/10 bg-surface shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-oxblood">
              Course health
            </p>
            <h2 className="mt-1 text-xl font-bold text-ink">Operational signals</h2>
            <p className="mt-1 text-xs leading-5 text-slate">
              Counts that change what you do next — not decorative scorecards.
            </p>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {error}{" "}
              <Button asChild variant="link" className="h-auto p-0 text-destructive underline">
                <Link href={`/admin/course/${courseId}`}>Retry by refreshing the page</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading course health">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-2xl border border-ink/10 p-3.5"
              >
                <Skeleton className="size-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <HealthRow
              label="Enrolled students"
              value={number.format(enrolled)}
              context={
                enrolled === 0
                  ? "No active enrollments yet. Invite members or share the course code."
                  : "Open the student roster to review membership and scores."
              }
              href="#course-workspace"
              icon={Users}
            />
            <HealthRow
              label="Active today"
              value={number.format(analytics?.activeToday ?? 0)}
              context="Students with assessment or chat activity since midnight."
              href="#course-workspace"
              icon={Activity}
            />
            <HealthRow
              label="Average score"
              value={hasScoreEvidence ? `${analytics?.averageScore ?? 0}%` : "Not Assessed"}
              context={
                hasScoreEvidence
                  ? `Based on ${number.format(assessedCount)} student${assessedCount === 1 ? "" : "s"} with completed scored attempts.`
                  : "Complete assessments need scored attempts before an average is shown."
              }
              href={`/admin/course/${courseId}/assessments`}
              icon={Award}
            />
            <HealthRow
              label="Assessment completion"
              value={
                enrolled === 0
                  ? "—"
                  : `${analytics?.completionRate ?? 0}%`
              }
              context={
                enrolled === 0
                  ? "Completion rate appears after students enroll."
                  : `${number.format(Math.round(((analytics?.completionRate ?? 0) / 100) * enrolled))} of ${number.format(enrolled)} enrolled students have completed at least one assessment.`
              }
              href={`/admin/course/${courseId}/assessments`}
              icon={ClipboardList}
            />
            {needsSupport > 0 ? (
              <div className="flex items-start gap-3 rounded-2xl border border-building-confidence/25 bg-building-confidence/10 p-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-building-confidence/20 text-building-confidence">
                  <AlertTriangle aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {number.format(needsSupport)} student{needsSupport === 1 ? "" : "s"} need review
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate">
                    Completed assessment averages are below 70%. Open Students to prioritize support.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
