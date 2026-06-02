"use client";
import { useCourseStore } from "@/stores/course-store";
import { useCourseInit } from "@/hooks/use-course-init";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import AdminCourseHeader from "./admin-course-header";
import AdminCourseStats from "./admin-course-stats";
import AdminCourseTopics from "./admin-course-topics";
import AdminCourseStudents from "./admin-course-students";
import AdminCourseInsights from "./admin-course-insights";

interface AdminCoursePageProps {
  id: number;
}

export default function AdminCoursePage({ id }: AdminCoursePageProps) {
  // Initialize course store
  useCourseInit(id);

  // Get course from store
  const course = useCourseStore((state) => state.getCourse(id));

  // Handle loading/not found
  if (!course) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Skeleton className="size-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-lg" />
              <Skeleton className="h-4 w-2/3 max-w-sm" />
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
          {/* Left column */}
          <div className="space-y-5">
            {/* Stats card */}
            <div className="rounded-2xl border border-gray-200 bg-white/90 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              {[
                "bg-blue-50",
                "bg-purple-50",
                "bg-green-50",
                "bg-orange-50",
              ].map((bg, i) => (
                <div key={i} className={`p-3 rounded-xl ${bg} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-lg" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                  {i === 1 && <Skeleton className="h-2 w-full rounded-full" />}
                </div>
              ))}
            </div>

            {/* Topics card */}
            <div className="rounded-2xl border border-gray-200 bg-white/90 shadow-sm p-5 space-y-4">
              <div className="space-y-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-28" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Tabs bar */}
            <Skeleton className="h-10 w-full rounded-xl" />

            {/* Table header */}
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-9 flex-1 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>

            {/* Table rows */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3.5 border-b border-gray-50 last:border-0 grid grid-cols-4 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminCourseHeader course={course} courseId={id} />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
        {/* Left Column  */}
        <div className="space-y-5 min-w-0">
          <AdminCourseStats course={course} />
          <AdminCourseTopics course={course} />
        </div>

        {/* Right Column  */}
        <div className="space-y-6 min-w-0">
          <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-4 rounded-xl bg-gray-100 p-1 h-auto">
              <TabsTrigger value="students" className="rounded-lg py-2.5 text-sm font-medium text-gray-500 transition-all duration-150 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                Students
              </TabsTrigger>
              <TabsTrigger value="insights" className="rounded-lg py-2.5 text-sm font-medium text-gray-500 transition-all duration-150 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students">
              <AdminCourseStudents course={course} />
            </TabsContent>

            <TabsContent value="insights">
              <AdminCourseInsights course={course} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
