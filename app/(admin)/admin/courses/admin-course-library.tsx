"use client";

import type { Dispatch, SetStateAction } from "react";
import { BookOpenCheck, Search, SlidersHorizontal } from "lucide-react";
import { AdminCourseCard } from "@/components/course/admin-course-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Course } from "@/types/new_course";
import AdminCoursesHeader from "./admin-courses-header";
import type { FilterOptions } from "./admin-courses-view";

type AvailabilityFilter = "all" | "enabled" | "disabled";

const availabilityOptions: Array<{ value: AvailabilityFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "enabled", label: "Active" },
  { value: "disabled", label: "Paused" },
];

export function AdminCourseLibrary({
  courses,
  filters,
  setFilters,
}: {
  courses: Course[];
  filters: FilterOptions;
  setFilters: Dispatch<SetStateAction<FilterOptions>>;
}) {
  const active = courses.filter((course) => course.is_active).length;

  const filteredCourses = courses
    .filter((course) => {
      if (filters.enabledStatus === "enabled" && !course.is_active) return false;
      if (filters.enabledStatus === "disabled" && course.is_active) return false;
      const query = filters.searchQuery.trim().toLocaleLowerCase();
      return (
        !query ||
        course.title.toLocaleLowerCase().includes(query) ||
        course.code.toLocaleLowerCase().includes(query)
      );
    })
    .sort((left, right) => {
      if (filters.sortBy === "code") return left.code.localeCompare(right.code);
      if (filters.sortBy === "updated") {
        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
      }
      return left.title.localeCompare(right.title);
    });

  const hasActiveFilters =
    filters.enabledStatus !== "all" || Boolean(filters.searchQuery.trim());

  const clearFilters = () => {
    setFilters({
      status: "all",
      instructor: "all",
      searchQuery: "",
      sortBy: filters.sortBy,
      enabledStatus: "all",
    });
  };

  return (
    <main className="space-y-8 pb-6">
      <AdminCoursesHeader total={courses.length} active={active} />

      {courses.length === 0 ? (
        <section
          aria-labelledby="empty-courses-heading"
          className="rounded-3xl border border-dashed border-ink/20 bg-white px-6 py-14 text-center shadow-sm"
        >
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-ink text-canvas shadow-sm">
            <BookOpenCheck aria-hidden="true" className="size-6" />
          </span>
          <h2
            id="empty-courses-heading"
            className="mt-5 font-[family-name:var(--font-display)] text-3xl tracking-[-0.025em] text-ink"
          >
            Your Course Library Starts Here
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate">
            Create a course to begin setting up topics, members, documents, and assessments for your students.
          </p>
        </section>
      ) : (
        <section aria-labelledby="course-collection-heading" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-oxblood">
                Course Library
              </p>
              <h2
                id="course-collection-heading"
                className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-[-0.025em] text-ink"
              >
                Manage Learning Spaces
              </h2>
              <p className="mt-1 text-sm text-slate">
                Open a course to manage members, topics, documents, and assessments.
              </p>
            </div>
            <label className="relative block w-full lg:max-w-xs">
              <span className="sr-only">Search courses</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#718097]"
              />
              <Input
                type="search"
                name="course-search"
                value={filters.searchQuery}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, searchQuery: event.target.value }))
                }
                placeholder="Search by name or code…"
                autoComplete="off"
                className="h-11 rounded-xl border-ink/15 bg-white pl-10 text-sm shadow-sm placeholder:text-slate"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 border-y border-ink/10 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate">
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                <span>
                  {filteredCourses.length}{" "}
                  {filteredCourses.length === 1 ? "course" : "courses"}
                </span>
              </div>
              <Select
                value={filters.sortBy}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, sortBy: value }))
                }
              >
                <SelectTrigger className="h-10 w-[170px] rounded-full border-ink/12 bg-white text-xs font-semibold">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                  <SelectItem value="code">Course Code</SelectItem>
                  <SelectItem value="updated">Recently Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:pb-0"
              aria-label="Filter courses by availability"
            >
              {availabilityOptions.map((option) => {
                const isActive = option.value === filters.enabledStatus;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        enabledStatus: option.value,
                      }))
                    }
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
                <AdminCourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-ink/18 bg-white px-6 py-12 text-center">
              <Search aria-hidden="true" className="mx-auto size-5 text-oxblood" />
              <h3 className="mt-3 text-base font-semibold text-ink">
                No Courses Match That View
              </h3>
              <p className="mt-1 text-sm text-slate">
                Try a different search or return to all of your courses.
              </p>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4 h-10 rounded-xl border-ink/15 bg-white"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
