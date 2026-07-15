"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCourseStore } from "@/stores/course-store";
import { useCourseInit } from "@/hooks/use-course-init";
import { useAdminCourseAnalytics } from "@/hooks/use-admin-course-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  segmentedTabsListClass,
  segmentedTabsTriggerClass,
  workspaceGridClass,
} from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import AdminCourseHeader from "./admin-course-header";
import AdminCourseSetupPanel from "./admin-course-setup-panel";
import AdminCourseStats from "./admin-course-stats";
import AdminCourseTopics from "./admin-course-topics";
import AdminCourseStudents from "./admin-course-students";
import AdminCourseInsights from "./admin-course-insights";

const workspaceTabs = ["students", "insights"] as const;
type WorkspaceTab = (typeof workspaceTabs)[number];

function parseWorkspaceTab(value: string | null): WorkspaceTab {
  return workspaceTabs.includes(value as WorkspaceTab)
    ? (value as WorkspaceTab)
    : "students";
}

interface AdminCoursePageProps {
  id: number;
}

function AdminCourseSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading course">
      <header className="flex flex-col gap-5 border-b border-ink/10 pb-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-xl" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-12 w-72 max-w-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-11 w-full rounded-xl sm:w-32" />
            <Skeleton className="h-11 w-full rounded-xl sm:w-32" />
            <Skeleton className="h-11 w-full rounded-xl sm:w-36" />
          </div>
        </div>
      </header>

      <div className="rounded-3xl bg-ink p-6 sm:p-7">
        <Skeleton className="h-3 w-40 bg-white/20" />
        <Skeleton className="mt-3 h-9 w-80 max-w-full bg-white/25" />
        <Skeleton className="mt-3 h-4 w-full max-w-lg bg-white/15" />
        <div className="mt-7 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
            >
              <Skeleton className="h-3 w-16 bg-white/20" />
              <Skeleton className="h-8 w-12 bg-white/25" />
              <Skeleton className="h-3 w-28 bg-white/15" />
            </div>
          ))}
        </div>
      </div>

      <div className={workspaceGridClass}>
        <div className="space-y-5 min-w-0">
          <div className="rounded-3xl border border-ink/10 bg-surface p-5 sm:p-6 space-y-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-40" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
          <div className="rounded-3xl border border-ink/10 bg-surface p-5 sm:p-6 space-y-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-44" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>

        <div className="space-y-5 min-w-0">
          <div className={cn(segmentedTabsListClass, "grid-cols-2")}>
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
          <div className="rounded-3xl border border-ink/10 bg-surface p-5 sm:p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCoursePage({ id }: AdminCoursePageProps) {
  useCourseInit(id);
  const course = useCourseStore((state) => state.getCourse(id));
  const { analytics, isLoading: analyticsLoading } = useAdminCourseAnalytics(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() =>
    parseWorkspaceTab(searchParams.get("tab")),
  );

  useEffect(() => {
    setActiveTab(parseWorkspaceTab(searchParams.get("tab")));
  }, [searchParams]);

  if (!course) {
    return <AdminCourseSkeleton />;
  }

  const handleTabChange = (value: string) => {
    const nextTab = parseWorkspaceTab(value);
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "students") params.delete("tab");
    else params.set("tab", nextTab);
    const query = params.toString();
    router.replace(
      `/admin/course/${id}${query ? `?${query}` : ""}`,
      { scroll: false },
    );
  };

  return (
    <main className="space-y-8 pb-6">
      <AdminCourseHeader course={course} courseId={id} />

      <AdminCourseSetupPanel
        course={course}
        courseId={id}
        analytics={analytics}
        analyticsLoading={analyticsLoading}
      />

      <div className={workspaceGridClass}>
        <div className="min-w-0 space-y-5">
          <AdminCourseStats course={course} courseId={id} />
          <AdminCourseTopics course={course} courseId={id} />
        </div>

        <section
          id="course-workspace"
          aria-labelledby="course-workspace-heading"
          className="min-w-0 space-y-5 scroll-mt-24"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate">
              Teaching workspace
            </p>
            <h2 id="course-workspace-heading" className="mt-1 text-xl font-bold text-ink">
              Students & Insights
            </h2>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className={cn(segmentedTabsListClass, "mb-1 grid-cols-2")}>
              <TabsTrigger value="students" className={segmentedTabsTriggerClass}>
                Students
              </TabsTrigger>
              <TabsTrigger value="insights" className={segmentedTabsTriggerClass}>
                Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="mt-4 focus-visible:outline-none">
              <AdminCourseStudents course={course} />
            </TabsContent>

            <TabsContent value="insights" className="mt-4 focus-visible:outline-none">
              <AdminCourseInsights course={course} courseId={id} />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  );
}
