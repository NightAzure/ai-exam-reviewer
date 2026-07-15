"use client";

import { useState } from "react";
import AdminCoursesHeader from "./admin-courses-header";
import { useCourses } from "@/hooks/use-courses";
import { AdminCourseLibrary } from "./admin-course-library";

export type FilterOptions = {
  status: string;
  instructor: string;
  searchQuery: string;
  sortBy: string;
  enabledStatus: string;
};

function AdminCourseGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_1px_2px_rgb(24_34_52/0.05)]"
        >
          <div className="relative h-36 animate-pulse bg-ink/8 motion-reduce:animate-none">
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
              <div className="h-6 w-28 rounded-full bg-ink/20" />
              <div className="size-10 rounded-full bg-ink/20" />
            </div>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
                <div className="h-7 w-3/4 animate-pulse rounded bg-ink/10 motion-reduce:animate-none" />
              </div>
              <div className="h-6 w-16 shrink-0 animate-pulse rounded-full bg-ink/8 motion-reduce:animate-none" />
            </div>
            <div className="mt-5 space-y-3 border-y border-ink/8 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="h-3 w-20 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
                <div className="h-6 w-16 animate-pulse rounded bg-ink/10 motion-reduce:animate-none" />
              </div>
              <div className="flex gap-2">
                <div className="h-7 w-24 animate-pulse rounded-lg bg-ink/8 motion-reduce:animate-none" />
                <div className="h-7 w-24 animate-pulse rounded-lg bg-ink/8 motion-reduce:animate-none" />
              </div>
              <div className="h-3 w-4/5 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="h-3 w-28 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
              <div className="h-3 w-20 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
            </div>
            <div className="mt-5 h-11 animate-pulse rounded-xl bg-ink/10 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminCoursesView() {
  const { data: courses } = useCourses();
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    instructor: "all",
    searchQuery: "",
    sortBy: "name",
    enabledStatus: "all",
  });

  if (courses !== undefined) {
    return (
      <AdminCourseLibrary
        courses={courses}
        filters={filters}
        setFilters={setFilters}
      />
    );
  }

  return (
    <main className="space-y-8 pb-6">
      <AdminCoursesHeader total={0} active={0} isLoading />
      <AdminCourseGridSkeleton />
    </main>
  );
}
