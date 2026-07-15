"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type {
  CourseStudyStatus,
  StudentCourseSummary,
} from "@/lib/student-course-summary";
import { useFavorites } from "@/hooks/use-favorites";

const statusStyles: Record<
  CourseStudyStatus,
  { label: string; className: string }
> = {
  not_assessed: {
    label: "Not Assessed",
    className: "border-sky-700/15 bg-sky-700/8 text-sky-950",
  },
  needs_focus: {
    label: "Needs Focus",
    className: "border-needs-focus/20 bg-needs-focus/8 text-[#7d252d]",
  },
  building_confidence: {
    label: "Building Confidence",
    className: "border-amber-700/20 bg-amber-700/10 text-amber-950",
  },
  proficient: {
    label: "Proficient",
    className: "border-emerald-700/20 bg-emerald-700/10 text-emerald-950",
  },
  ended: {
    label: "Ended",
    className: "border-stone-600/15 bg-stone-600/8 text-stone-700",
  },
};

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

function getInstructorName(course: StudentCourseSummary): string {
  const instructor = course.instructor;
  if (!instructor) return "Instructor not listed";
  return [instructor.first_name, instructor.second_name].filter(Boolean).join(" ") || "Instructor not listed";
}

function getActionLabel(course: StudentCourseSummary): string {
  if (course.study.status === "not_assessed") return "Take Diagnostic";
  if (course.study.status === "ended") return "View Course";
  return "Continue Reviewing";
}

export function StudentCourseCard({ course }: { course: StudentCourseSummary }) {
  const { isFavorited, toggle } = useFavorites();
  const isPinned = isFavorited(course.id);
  const status = statusStyles[course.study.status];
  const hasMastery = course.study.masteryScore !== null;
  const courseHref = `/course/${course.id}`;
  const fallbackTheme = fallbackThemes[Math.abs(course.id) % fallbackThemes.length];
  const courseInitials = course.title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_1px_2px_rgb(24_34_52/0.05)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_16px_36px_rgb(24_34_52/0.12)] motion-reduce:transform-none motion-reduce:transition-none">
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
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isPinned ? `Unpin ${course.title}` : `Pin ${course.title}`}
            aria-pressed={isPinned}
            onClick={() => toggle(course.id)}
            className="ml-auto size-10 shrink-0 rounded-full border border-white/15 bg-ink/65 text-white shadow-sm backdrop-blur-md hover:bg-white hover:text-oxblood"
          >
            <Star
              aria-hidden="true"
              className={cn("size-4", isPinned && "fill-current text-[#c78945]")}
            />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate">{getInstructorName(course)}</p>
            <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-[1.55rem] leading-[1.08] tracking-[-0.025em] text-ink">
              <Link
                href={courseHref}
                className="line-clamp-2 rounded-sm outline-none transition-colors hover:text-oxblood focus-visible:ring-2 focus-visible:ring-oxblood/50"
              >
                {course.title}
              </Link>
            </h2>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-5 border-y border-ink/8 py-4">
          {hasMastery ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#69758a]">Current Mastery</p>
                <p className="font-[family-name:var(--font-display)] text-2xl leading-none text-ink">
                  {course.study.masteryScore}%
                </p>
              </div>
              <Progress
                value={course.study.masteryScore ?? 0}
                aria-label={`${course.title} current mastery`}
                aria-valuetext={`${course.study.masteryScore}% mastery`}
                className="mt-2.5 h-1.5 bg-oxblood/12 [&>[data-slot=progress-indicator]]:bg-oxblood"
              />
              <p className="mt-2 text-xs leading-5 text-[#657187]">
                {course.study.weakestSubject
                  ? `Focus next on ${course.study.weakestSubject}.`
                  : "Keep building confidence with another practice round."}
              </p>
            </>
          ) : (
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-oxblood/8 text-oxblood">
                <Sparkles aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Build Your Baseline</p>
                <p className="mt-0.5 text-xs leading-5 text-[#657187]">
                  Complete a diagnostic to unlock a personal study recommendation.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#657187]">
          <span>{course.study.questionsAnswered} questions answered</span>
          {course.study.lastAssessedAt ? (
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <Clock3 aria-hidden="true" className="size-3.5" />
              <time dateTime={course.study.lastAssessedAt}>
                {dateFormatter.format(new Date(course.study.lastAssessedAt))}
              </time>
            </span>
          ) : (
            <span className="shrink-0">No assessments yet</span>
          )}
        </div>

        <Button
          asChild
          variant={course.study.status === "ended" ? "outline" : "default"}
          className={cn(
            "mt-5 h-11 w-full justify-between rounded-xl px-4 text-sm",
            course.study.status !== "ended" && "bg-ink text-white hover:bg-ink-raised",
          )}
        >
          <Link href={courseHref}>
            {getActionLabel(course)}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
