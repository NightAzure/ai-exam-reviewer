"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdminDashboardAnalytics } from "@/types/admin-analytics";

const number = new Intl.NumberFormat("en-PH");

function Metric({
  label,
  value,
  context,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  context: string;
  icon: typeof Users;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-ink/10 bg-surface p-5 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood motion-reduce:transform-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate">{label}</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-none tabular-nums text-ink">
            {number.format(value)}
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-ink/6 text-ink">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 flex items-center gap-1 text-xs font-medium text-slate">
        {context}<ArrowRight className="size-3 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
      </p>
    </Link>
  );
}

export function AdminDashboardOverview({ analytics }: { analytics: AdminDashboardAnalytics }) {
  const enrolledCourses = analytics.coursePerformanceData.filter((course) => course.students > 0);
  const coursesWithoutEvidence = enrolledCourses.filter((course) => course.completedAttempts === 0);
  const attentionItems = [
    analytics.atRiskStudents > 0
      ? {
          icon: AlertTriangle,
          title: `${number.format(analytics.atRiskStudents)} student${analytics.atRiskStudents === 1 ? "" : "s"} need review`,
          description: "Their completed assessment average is below 60%. Review course results and support options.",
          action: "Review courses",
          href: "/admin/courses",
          tone: "warning" as const,
        }
      : null,
    coursesWithoutEvidence.length > 0
      ? {
          icon: ClipboardList,
          title: `${number.format(coursesWithoutEvidence.length)} enrolled course${coursesWithoutEvidence.length === 1 ? "" : "s"} lack assessment evidence`,
          description: "Students are enrolled but no completed attempts are available for those courses.",
          action: "Manage courses",
          href: "/admin/courses",
          tone: "info" as const,
        }
      : null,
    analytics.assessments === 0
      ? {
          icon: ClipboardList,
          title: "No assessments are available",
          description: "Create an assessment to begin collecting reliable learning evidence.",
          action: "Open courses",
          href: "/admin/courses",
          tone: "warning" as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    icon: typeof AlertTriangle;
    title: string;
    description: string;
    action: string;
    href: string;
    tone: "warning" | "info";
  }>;

  const latestActivity = analytics.weeklyActivityData.at(-1);
  const maxActivity = Math.max(...analytics.weeklyActivityData.map((point) => point.activeUsers), 1);
  const evidenceCoverage =
    analytics.totalUsers > 0
      ? Math.min(Math.round((analytics.completedAttempts / analytics.totalUsers) * 100), 100)
      : 0;

  return (
    <main className="space-y-8">
      <header className="relative isolate overflow-hidden rounded-3xl bg-ink p-6 text-canvas shadow-[0_20px_45px_-30px_rgb(24_36_58_/_0.8)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-4 size-40 rounded-full border border-brass/20" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-[34%] h-px w-52 bg-gradient-to-r from-transparent via-brass/40 to-transparent" />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brass">Administration</p>
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d8e0ea]">Platform pulse</span>
            </div>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-none tracking-tight text-white sm:text-5xl">Operations overview</h1>
            <p className="mt-3 text-sm leading-6 text-[#c9d1dc]">Resolve what needs attention, then move into course management with confidence.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:min-w-72">
              <div className="bg-ink/35 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#aeb8c7]">Active today</p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none tabular-nums text-white">{number.format(analytics.activeUsersToday)}</p>
              </div>
              <div className="bg-ink/35 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#aeb8c7]">Evidence</p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none tabular-nums text-white">{evidenceCoverage}%</p>
              </div>
            </div>
            <Button asChild className="min-h-11 gap-2 bg-white text-ink hover:bg-canvas sm:self-center">
              <Link href="/admin/courses"><Plus className="size-4" aria-hidden="true" />Create Course</Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-7 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#aeb8c7]">Course network</p>
            <p className="mt-1 text-sm font-semibold text-white">{number.format(analytics.totalCourses)} active course{analytics.totalCourses === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#aeb8c7]">Learning evidence</p>
            <p className="mt-1 text-sm font-semibold text-white">{number.format(analytics.completedAttempts)} completed attempts</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#aeb8c7]">Priority queue</p>
            <p className="mt-1 text-sm font-semibold text-white">{attentionItems.length ? `${number.format(attentionItems.length)} item${attentionItems.length === 1 ? "" : "s"} need attention` : "No immediate issues"}</p>
          </div>
        </div>
      </header>

      <section aria-labelledby="at-a-glance">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate">At a glance</p>
            <h2 id="at-a-glance" className="mt-1 text-xl font-bold text-ink">Operational signals</h2>
          </div>
          <Link href="/admin/courses" className="text-sm font-semibold text-oxblood underline-offset-4 hover:underline">Manage courses</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active today" value={analytics.activeUsersToday} context="View course activity" icon={Activity} href="/admin/courses" />
          <Metric label="Enrolled students" value={analytics.totalUsers} context={`${analytics.totalUsersGrowth >= 0 ? "+" : ""}${analytics.totalUsersGrowth}% since last month`} icon={Users} href="/admin/courses" />
          <Metric label="Published assessments" value={analytics.assessments} context={`${analytics.completedAttempts} completed attempts`} icon={ClipboardList} href="/admin/courses" />
          <Metric label="Active courses" value={analytics.totalCourses} context={`${analytics.totalCoursesGrowth >= 0 ? "+" : ""}${analytics.totalCoursesGrowth}% since last month`} icon={BookOpen} href="/admin/courses" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]" aria-label="Attention and navigation">
        <Card className="rounded-3xl border-ink/10 py-0">
          <CardContent className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-oxblood">Needs attention</p>
                <h2 className="mt-1 text-xl font-bold text-ink">Decisions waiting on you</h2>
              </div>
              <Badge variant={attentionItems.length ? "oxblood" : "proficient"}>{attentionItems.length ? `${attentionItems.length} items` : "All clear"}</Badge>
            </div>
            <div className="mt-5 divide-y divide-ink/10">
              {attentionItems.length ? attentionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-start">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.tone === "warning" ? "bg-building-confidence/15 text-building-confidence" : "bg-evidence/10 text-evidence"}`}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-ink">{item.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-slate">{item.description}</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0"><Link href={item.href}>{item.action}</Link></Button>
                  </div>
                );
              }) : (
                <div className="flex items-start gap-3 py-1">
                  <CheckCircle2 className="mt-0.5 size-5 text-proficient" aria-hidden="true" />
                  <p className="text-sm leading-6 text-slate">No current course-health issues are supported by the available data. Continue monitoring enrollment and assessment activity.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <aside className="rounded-3xl bg-ink p-6 text-canvas sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brass">Quick navigation</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none text-white">Continue admin work</h2>
          <div className="mt-6 space-y-2">
            <Link href="/admin/courses" className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]">Course library <ArrowRight className="size-4" /></Link>
            <Link href="/admin/courses" className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]">Create assessment <ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-7 border-t border-white/10 pt-5">
            <p className="text-xs leading-5 text-[#c9d1dc]"><MessageCircle className="mr-1 inline size-3.5" aria-hidden="true" />{number.format(analytics.messages)} learner messages recorded across the platform.</p>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <Card className="rounded-3xl border-ink/10 py-0">
          <CardContent className="p-6 sm:p-7">
            <div className="flex items-baseline justify-between gap-4">
              <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate">Activity trend</p><h2 className="mt-1 text-xl font-bold text-ink">Weekly active users</h2></div>
              <span className="text-sm font-semibold tabular-nums text-ink">{latestActivity ? number.format(latestActivity.activeUsers) : "—"} latest</span>
            </div>
            <div className="mt-8 flex h-36 items-end gap-3" aria-label="Active users over the past four weeks">
              {analytics.weeklyActivityData.map((point) => (
                <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold tabular-nums text-ink">{number.format(point.activeUsers)}</span>
                  <div className="flex h-24 w-full items-end rounded-t-lg bg-ink/5">
                    <div className="w-full rounded-t-lg bg-oxblood transition-[height] duration-200 motion-reduce:transition-none" style={{ height: `${Math.max((point.activeUsers / maxActivity) * 100, point.activeUsers ? 8 : 0)}%` }} />
                  </div>
                  <span className="text-[11px] font-medium text-slate">{point.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-ink/10 py-0">
          <CardContent className="p-6 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate">Recent evidence</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Course assessment activity</h2>
            <div className="mt-5 space-y-3">
              {enrolledCourses.slice(0, 4).map((course) => (
                <Link key={course.courseId} href={`/admin/course/${course.courseId}`} className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 p-3 transition-[background-color,border-color] hover:border-ink/20 hover:bg-ink/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood">
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{course.topic}</span><span className="mt-0.5 block text-xs text-slate">{number.format(course.students)} enrolled · {number.format(course.completedAttempts)} completed attempts</span></span>
                  <ArrowRight className="size-4 shrink-0 text-slate" aria-hidden="true" />
                </Link>
              ))}
              {enrolledCourses.length === 0 && <p className="rounded-xl bg-ink/[0.04] p-4 text-sm leading-5 text-slate">Course assessment activity will appear after students enroll and complete attempts.</p>}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
