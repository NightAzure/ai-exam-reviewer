"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Course } from "@/types/new_course";
import {
  Star,
  BookOpen,
  BarChart3,
  EllipsisVertical,
  Share2,
  Users,
  Settings,
  Ban,
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import ShareCourseDialog from "./share-course-dialog";
import ViewMembersDialog from "./view-members-dialog";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

const FALLBACK_COURSE_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect width='800' height='400' fill='%2318243a'/%3E%3Cpath d='M0 300c120-40 200-60 320-40s180 50 280 36 120-48 200-72v176H0Z' fill='%238e3039' fill-opacity='0.35'/%3E%3C/svg%3E";

type CourseCardCourse = Course & {
  stats?: {
    averageProgress?: number | null;
    proficient?: number;
    needsReview?: number;
  };
};

interface CourseCardProps {
  variant?: "main" | "admin";
  course: CourseCardCourse;
}

export default function CourseCard({
  variant = "main",
  course,
}: CourseCardProps) {
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [viewMembersOpen, setViewMembersOpen] = useState(false);

  if (!course || !course.id) {
    return null;
  }

  const isDisabled = !course.is_active;
  const hasProgressEvidence =
    course.stats?.averageProgress != null &&
    !Number.isNaN(course.stats.averageProgress);
  const progressValue = hasProgressEvidence
    ? course.stats!.averageProgress!
    : null;
  const courseHref =
    variant === "admin"
      ? `/admin/course/${course.id}`
      : `/course/${course.id}`;

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_16px_36px_rgb(24_34_52/0.12)] motion-reduce:transform-none motion-reduce:transition-none",
        isDisabled && "opacity-90",
      )}
    >
      <div className="relative h-36 w-full">
        <Image
          src={course.thumbnail_url || FALLBACK_COURSE_THUMBNAIL}
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />

        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
          {variant === "admin" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink/70 px-2.5 py-1 text-xs font-semibold text-canvas backdrop-blur-sm">
              <BookOpen aria-hidden="true" className="size-3.5" />
              <span className="font-mono tracking-wide">{course.code}</span>
            </span>
          ) : null}
          {isDisabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/90 px-2.5 py-1 text-xs font-semibold text-white">
              <Ban aria-hidden="true" className="size-3.5" />
              Disabled
            </span>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isFavorited(course.id) ? "Unpin course" : "Pin course"}
          className="absolute right-3 top-3 size-10 min-h-10 min-w-10 rounded-full border border-white/15 bg-ink/65 text-white hover:bg-white hover:text-oxblood"
          onClick={() => toggleFavorite(course.id)}
        >
          <Star
            aria-hidden="true"
            className={cn(
              "size-4",
              isFavorited(course.id) && "fill-current text-brass",
            )}
          />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-xl leading-snug tracking-tight text-ink">
              <Link
                href={courseHref}
                className="rounded-sm outline-none transition-colors hover:text-oxblood focus-visible:ring-2 focus-visible:ring-oxblood/50"
              >
                {course.title}
              </Link>
            </h3>
            <p className="text-xs font-medium text-slate">
              Instructor:{" "}
              {[course.instructor?.first_name, course.instructor?.second_name]
                .filter(Boolean)
                .join(" ") || "Not listed"}
            </p>
          </div>

          {variant === "admin" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 min-h-10 min-w-10 shrink-0"
                  aria-label="Open course menu"
                >
                  <EllipsisVertical aria-hidden="true" className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                  <Share2 className="mr-2 size-4" />
                  Share Course Code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMembersOpen(true)}>
                  <Users className="mr-2 size-4" />
                  View Members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/admin/course/${course.id}/manage`}>
                    <Settings className="mr-2 size-4" />
                    Manage Course
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <div className="rounded-xl border border-ink/10 bg-canvas/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">
              Class Progress
            </p>
            {hasProgressEvidence ? (
              <p className="text-sm font-semibold tabular-nums text-ink">
                {progressValue}%
              </p>
            ) : (
              <p className="text-xs font-medium text-evidence">Not Assessed</p>
            )}
          </div>
          {hasProgressEvidence ? (
            <>
              <Progress
                value={progressValue ?? undefined}
                aria-label={`${course.title} average progress`}
                className="mt-3 h-1.5"
              />
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate">
                <span className="inline-flex items-center gap-1.5">
                  <BarChart3
                    aria-hidden="true"
                    className="size-3.5 text-proficient"
                  />
                  <span className="tabular-nums">
                    {course.stats?.proficient ?? 0}
                  </span>{" "}
                  proficient
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BarChart3
                    aria-hidden="true"
                    className="size-3.5 text-needs-focus"
                  />
                  <span className="tabular-nums">
                    {course.stats?.needsReview ?? 0}
                  </span>{" "}
                  need review
                </span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs leading-5 text-slate">
              Average progress appears after students complete assessed work.
            </p>
          )}
        </div>

        {isDisabled ? (
          <Button className="mt-auto w-full" disabled>
            Course Disabled
          </Button>
        ) : (
          <Button asChild className="mt-auto w-full">
            <Link href={courseHref}>
              {variant === "admin" ? "Open Course" : "Go to Course"}
            </Link>
          </Button>
        )}
      </div>

      <ShareCourseDialog
        isOpen={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        courseName={course.title}
        courseId={course.id.toString()}
      />
      <ViewMembersDialog
        isOpen={viewMembersOpen}
        onOpenChange={setViewMembersOpen}
        courseName={course.title}
        courseId={course.id.toString()}
      />
    </article>
  );
}
