"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BookOpenCheck,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { DashboardHeader } from "./dashboard-header";
import { CourseRecommendation } from "./course-recommendation";
import { StudentCourseCard } from "@/components/course/student-course-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getRecommendedCourse,
  isCourseAvailableForStudy,
  type StudentCourseSummary,
} from "@/lib/student-course-summary";
import { useMyCourses } from "@/hooks/use-my-courses";
import { cn } from "@/lib/utils";

type CourseFilter =
  | "all"
  | "in-progress"
  | "needs-focus"
  | "not-assessed"
  | "ended";

const filterOptions: Array<{ value: CourseFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "in-progress", label: "In Progress" },
  { value: "needs-focus", label: "Needs Focus" },
  { value: "not-assessed", label: "Not Assessed" },
  { value: "ended", label: "Ended" },
];

function parseFilter(value: string | null): CourseFilter {
  return filterOptions.some((option) => option.value === value)
    ? (value as CourseFilter)
    : "all";
}

function matchesFilter(course: StudentCourseSummary, filter: CourseFilter): boolean {
  switch (filter) {
    case "in-progress":
      return isCourseAvailableForStudy(course) && course.study.masteryScore !== null;
    case "needs-focus":
      return course.study.status === "needs_focus";
    case "not-assessed":
      return course.study.status === "not_assessed";
    case "ended":
      return course.study.status === "ended";
    default:
      return true;
  }
}

function CourseGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm"
        >
          <div className="h-36 animate-pulse bg-ink/8 motion-reduce:animate-none" />
          <div className="space-y-4 p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
            <div className="h-7 w-3/4 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
            <div className="h-20 animate-pulse rounded-xl bg-ink/6 motion-reduce:animate-none" />
            <div className="h-11 animate-pulse rounded-xl bg-ink/8 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: courses, error, mutate } = useMyCourses();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseFilter(searchParams.get("filter"));
  const searchQuery = searchParams.get("q") ?? "";

  const updateSearchParams = useCallback(
    (updates: { filter?: CourseFilter; query?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.filter !== undefined) {
        if (updates.filter === "all") params.delete("filter");
        else params.set("filter", updates.filter);
      }

      if (updates.query !== undefined) {
        const normalizedQuery = updates.query.trim();
        if (normalizedQuery) params.set("q", normalizedQuery);
        else params.delete("q");
      }

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    const normalizedQuery = searchQuery.toLocaleLowerCase();

    return courses.filter((course) => {
      const instructor = [course.instructor?.first_name, course.instructor?.second_name]
        .filter(Boolean)
        .join(" ");
      const matchesSearch =
        !normalizedQuery ||
        [course.title, instructor]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));

      return matchesSearch && matchesFilter(course, filter);
    });
  }, [courses, filter, searchQuery]);

  const recommendation = useMemo(
    () => (courses ? getRecommendedCourse(courses) : null),
    [courses],
  );
  const hasActiveFilters = filter !== "all" || Boolean(searchQuery);

  return (
    <main className="space-y-8 pb-6">
      <DashboardHeader
        courseCount={courses?.length ?? 0}
        isLoading={courses === undefined && !error}
      />

      {error ? (
        <section
          aria-labelledby="courses-error-heading"
          className="rounded-3xl border border-needs-focus/15 bg-white p-8 text-center shadow-sm"
        >
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-needs-focus/8 text-oxblood">
            <AlertCircle aria-hidden="true" className="size-5" />
          </span>
          <h2 id="courses-error-heading" className="mt-4 font-[family-name:var(--font-display)] text-2xl text-ink">
            We Couldn’t Load Your Courses
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate">
            Check your connection, then try loading your review space again.
          </p>
          <Button
            type="button"
            onClick={() => mutate()}
            className="mt-5 h-11 rounded-xl bg-ink px-4 hover:bg-ink-raised"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Try Again
          </Button>
        </section>
      ) : courses === undefined ? (
        <CourseGridSkeleton />
      ) : courses.length === 0 ? (
        <section
          aria-labelledby="empty-courses-heading"
          className="rounded-3xl border border-dashed border-ink/20 bg-white px-6 py-14 text-center shadow-sm"
        >
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-ink text-canvas shadow-sm">
            <BookOpenCheck aria-hidden="true" className="size-6" />
          </span>
          <h2 id="empty-courses-heading" className="mt-5 font-[family-name:var(--font-display)] text-3xl tracking-[-0.025em] text-ink">
            Your Review Studio Starts Here
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate">
            Join a class with the code from your instructor. It will appear here with a personal study signal once you begin.
          </p>
        </section>
      ) : (
        <>
          {recommendation && <CourseRecommendation course={recommendation} />}

          <section aria-labelledby="course-collection-heading" className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-oxblood">Your Courses</p>
                <h2 id="course-collection-heading" className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-[-0.025em] text-ink">
                  Continue Your Review
                </h2>
                <p className="mt-1 text-sm text-slate">Choose a course, or follow the recommendation above.</p>
              </div>
              <label className="relative block w-full lg:max-w-xs">
                <span className="sr-only">Search courses</span>
                <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#718097]" />
                <Input
                  type="search"
                  name="course-search"
                  value={searchQuery}
                  onChange={(event) => updateSearchParams({ query: event.target.value })}
                  placeholder="Search courses…"
                  autoComplete="off"
                  className="h-11 rounded-xl border-ink/15 bg-white pl-10 text-sm shadow-sm placeholder:text-slate"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 border-y border-ink/10 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate">
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                <span>{filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"}</span>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:pb-0" aria-label="Filter courses">
                {filterOptions.map((option) => {
                  const isActive = option.value === filter;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => updateSearchParams({ filter: option.value })}
                      className={cn(
                        "h-10 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-[background-color,border-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/50",
                        isActive
                          ? "border-ink bg-ink text-white shadow-sm"
                          : "border-ink/12 bg-white text-slate hover:border-ink/25 hover:text-ink",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredCourses.map((course) => (
                  <StudentCourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-ink/18 bg-white px-6 py-12 text-center">
                <Search aria-hidden="true" className="mx-auto size-5 text-oxblood" />
                <h3 className="mt-3 text-base font-semibold text-ink">No Courses Match That View</h3>
                <p className="mt-1 text-sm text-slate">Try a different search or return to all of your courses.</p>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => updateSearchParams({ filter: "all", query: "" })}
                    className="mt-4 h-10 rounded-xl border-ink/15 bg-white"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
