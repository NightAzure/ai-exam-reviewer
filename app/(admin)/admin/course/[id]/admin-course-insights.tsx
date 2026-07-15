"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardList,
  Target,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminCourseAnalytics } from "@/hooks/use-admin-course-analytics";
import type { Course } from "@/types/course";
import { cn } from "@/lib/utils";

const number = new Intl.NumberFormat("en-PH");

interface AdminCourseInsightsProps {
  course: Course;
  courseId: number;
}

export default function AdminCourseInsights({
  course,
  courseId,
}: AdminCourseInsightsProps) {
  const { analytics, error, isLoading } = useAdminCourseAnalytics(course.id);

  const studentsByStatus = analytics?.studentsByStatus ?? {
    excellent: 0,
    onTrack: 0,
    atRisk: 0,
    needsHelp: 0,
  };
  const recentActivity = analytics?.recentActivity ?? [];
  const assessedCount =
    studentsByStatus.excellent +
    studentsByStatus.onTrack +
    studentsByStatus.atRisk +
    studentsByStatus.needsHelp;
  const hasScoreEvidence = assessedCount > 0;

  const distribution = [
    {
      key: "excellent",
      label: "Proficient (90%+)",
      count: studentsByStatus.excellent,
      icon: Award,
      tone: "bg-proficient/10 border-proficient/20 text-proficient",
      valueClass: "text-proficient",
    },
    {
      key: "onTrack",
      label: "Building Confidence (70–89%)",
      count: studentsByStatus.onTrack,
      icon: Target,
      tone: "bg-evidence/10 border-evidence/20 text-evidence",
      valueClass: "text-evidence",
    },
    {
      key: "atRisk",
      label: "Needs Focus (50–69%)",
      count: studentsByStatus.atRisk,
      icon: AlertTriangle,
      tone: "bg-building-confidence/10 border-building-confidence/25 text-building-confidence",
      valueClass: "text-building-confidence",
    },
    {
      key: "needsHelp",
      label: "Needs Focus (below 50%)",
      count: studentsByStatus.needsHelp,
      icon: AlertTriangle,
      tone: "bg-needs-focus/8 border-needs-focus/20 text-needs-focus",
      valueClass: "text-needs-focus",
    },
  ];

  return (
    <div className="space-y-5">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-3xl border-ink/10 bg-surface shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-oxblood">
              Insights
            </p>
            <h2 className="mt-1 text-xl font-bold text-ink">Assessment Evidence</h2>
            <p className="mt-1 text-sm text-slate">
              Distribution is based on completed scored attempts only. Missing evidence is never
              shown as zero performance.
            </p>
          </div>

          {isLoading ? (
            <div
              className="grid gap-3 sm:grid-cols-2"
              aria-busy="true"
              aria-label="Loading assessment evidence"
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-ink/10 p-4 space-y-3"
                >
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>
          ) : !hasScoreEvidence ? (
            <div className="rounded-2xl border border-dashed border-ink/20 bg-canvas/50 px-5 py-10 text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-evidence/15 text-evidence">
                <ClipboardList aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl text-ink">
                Not Assessed Yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate">
                No scored assessment attempts are available for this course. Publish an assessment
                and wait for completed attempts before judging student performance.
              </p>
              <Link
                href={`/admin/course/${courseId}/assessments`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-ink-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/50"
              >
                Open Assessments
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-2xl border border-proficient/20 bg-proficient/10 px-4 py-3 text-sm text-ink">
                <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-proficient" />
                <span>
                  <span className="font-semibold tabular-nums">
                    {number.format(assessedCount)}
                  </span>{" "}
                  student{assessedCount === 1 ? "" : "s"} with scored assessment evidence.
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {distribution.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className={cn("rounded-2xl border p-4", item.tone)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold">{item.label}</p>
                          <p
                            className={cn(
                              "mt-2 font-[family-name:var(--font-display)] text-3xl leading-none tabular-nums",
                              item.valueClass,
                            )}
                          >
                            {number.format(item.count)}
                          </p>
                        </div>
                        <Icon aria-hidden="true" className="size-5 opacity-40" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-ink/10 bg-surface shadow-sm">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate">
              Recent activity
            </p>
            <h2 className="mt-1 text-xl font-bold text-ink">Latest Assessment Events</h2>
            <p className="mt-1 text-sm text-slate">
              Starts and submissions from this course&apos;s assessments.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-2xl border border-ink/10 p-3"
                >
                  <Skeleton className="size-9 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/18 bg-canvas/40 px-4 py-8 text-center">
              <Activity aria-hidden="true" className="mx-auto size-5 text-oxblood" />
              <h3 className="mt-3 text-base font-semibold text-ink">No Recent Activity</h3>
              <p className="mt-1 text-sm text-slate">
                Assessment starts and submissions will appear here once students begin work.
              </p>
            </div>
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-y-auto">
              {recentActivity.map((activity, index) => {
                const iconWrap =
                  activity.type === "success"
                    ? "bg-proficient/15 text-proficient"
                    : activity.type === "warning"
                      ? "bg-building-confidence/15 text-building-confidence"
                      : "bg-evidence/15 text-evidence";
                const Icon =
                  activity.type === "success"
                    ? Award
                    : activity.type === "warning"
                      ? AlertTriangle
                      : Activity;

                return (
                  <li
                    key={`${activity.student}-${activity.time}-${index}`}
                    className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-canvas/40 p-3.5"
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        iconWrap,
                      )}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-ink">
                        <span className="font-semibold">{activity.student}</span>{" "}
                        <span className="text-slate">{activity.action}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate">{activity.time}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
