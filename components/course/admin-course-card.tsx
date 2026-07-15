"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CirclePause,
  EllipsisVertical,
  Settings2,
  ShieldCheck,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Course } from "@/types/new_course";

const fallbackThemes = [
  "from-[#16233b] via-[#253a5d] to-[#8a3039]",
  "from-[#1d3041] via-[#286065] to-[#b77e38]",
  "from-[#2b233a] via-[#53406e] to-[#9e343c]",
  "from-[#193942] via-[#35625d] to-[#9b6538]",
];

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function getInstructorName(course: Course): string {
  const instructor = course.instructor;
  if (!instructor) return "Unassigned";
  return (
    [instructor.first_name, instructor.second_name].filter(Boolean).join(" ") ||
    "Unassigned"
  );
}

function getEnrollmentSummary(course: Course): string {
  if (!course.is_active) {
    return "Paused courses stay hidden from new student joins until you reopen them.";
  }
  if (course.require_enrollment_approval) {
    return "Self-enrollment is gated — review requests before students get access.";
  }
  if (course.allow_self_enrollment === false) {
    return "Students must be added manually. Open member management to invite them.";
  }
  return "Students can join with the course code and begin reviewing right away.";
}

export function AdminCourseCard({ course }: { course: Course }) {
  const overviewHref = `/admin/course/${course.id}`;
  const manageHref = `/admin/course/${course.id}/manage`;
  const membersHref = `/admin/course/${course.id}/manage?tab=members`;
  const fallbackTheme = fallbackThemes[Math.abs(course.id) % fallbackThemes.length];
  const courseInitials = course.title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_1px_2px_rgb(24_34_52/0.05)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_16px_36px_rgb(24_34_52/0.12)] motion-reduce:transform-none motion-reduce:transition-none",
        !course.is_active && "opacity-[0.96]",
      )}
    >
      <div className="relative h-36 overflow-hidden">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={`${course.title} course artwork`}
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn("absolute inset-0 bg-gradient-to-br", fallbackTheme)}
          >
            <div className="absolute -right-6 -top-8 h-36 w-36 rounded-full border border-white/20" />
            <div className="absolute bottom-4 left-5 font-[family-name:var(--font-display)] text-5xl leading-none text-white/20">
              {courseInitials}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink/65 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-md">
            {course.is_active ? (
              <CheckCircle2 aria-hidden="true" className="size-3.5 text-emerald-300" />
            ) : (
              <CirclePause aria-hidden="true" className="size-3.5 text-stone-200" />
            )}
            {course.is_active ? "Live for students" : "Paused"}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quick actions for ${course.title}`}
                className="size-10 shrink-0 rounded-full border border-white/15 bg-ink/65 text-white shadow-sm backdrop-blur-md hover:bg-white hover:text-oxblood"
              >
                <EllipsisVertical aria-hidden="true" className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52 rounded-xl">
              <DropdownMenuItem asChild>
                <Link href={membersHref} className="gap-2">
                  <Users aria-hidden="true" className="size-4" />
                  Member Management
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={manageHref} className="gap-2">
                  <Settings2 aria-hidden="true" className="size-4" />
                  Manage Course
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={overviewHref} className="gap-2">
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                  Open Course
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate">{getInstructorName(course)}</p>
            <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-[1.55rem] leading-[1.08] tracking-[-0.025em] text-ink">
              <Link
                href={overviewHref}
                className="line-clamp-2 rounded-sm outline-none transition-colors hover:text-oxblood focus-visible:ring-2 focus-visible:ring-oxblood/50"
              >
                {course.title}
              </Link>
            </h2>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
              course.is_active
                ? "border-emerald-700/20 bg-emerald-700/10 text-emerald-950"
                : "border-stone-600/15 bg-stone-600/8 text-stone-700",
            )}
          >
            {course.is_active ? "Active" : "Paused"}
          </span>
        </div>

        <div className="mt-5 border-y border-ink/8 py-4">
          {course.is_active ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#69758a]">
                Enrollment
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-ink/8 bg-canvas/80 px-2.5 py-1.5 text-[11px] font-semibold text-ink">
                  <UserPlus aria-hidden="true" className="size-3.5 text-oxblood" />
                  {course.allow_self_enrollment === false ? "Invite only" : "Self-enroll"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-ink/8 bg-canvas/80 px-2.5 py-1.5 text-[11px] font-semibold text-ink">
                  <ShieldCheck aria-hidden="true" className="size-3.5 text-oxblood" />
                  {course.require_enrollment_approval ? "Approval on" : "Instant join"}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#657187]">
                {getEnrollmentSummary(course)}
              </p>
            </>
          ) : (
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-stone-600/10 text-stone-700">
                <CirclePause aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Paused for Students</p>
                <p className="mt-0.5 text-xs leading-5 text-[#657187]">
                  {getEnrollmentSummary(course)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#657187]">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            {course.require_enrollment_approval ? (
              <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0" />
            ) : course.allow_self_enrollment === false ? (
              <Users aria-hidden="true" className="size-3.5 shrink-0" />
            ) : (
              <UserPlus aria-hidden="true" className="size-3.5 shrink-0" />
            )}
            <span className="truncate">
              {course.is_active
                ? course.require_enrollment_approval
                  ? "Requests need review"
                  : course.allow_self_enrollment === false
                    ? "Manual membership"
                    : "Self-enroll enabled"
                : "Not accepting joins"}
            </span>
          </span>
          {course.updated_at ? (
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <CalendarClock aria-hidden="true" className="size-3.5" />
              <time dateTime={course.updated_at}>
                {dateFormatter.format(new Date(course.updated_at))}
              </time>
            </span>
          ) : (
            <span className="shrink-0">No updates yet</span>
          )}
        </div>

        <Button
          asChild
          className="mt-5 h-11 w-full justify-between rounded-xl bg-ink px-4 text-sm text-white hover:bg-ink-raised"
        >
          <Link href={overviewHref}>
            Open Course
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
