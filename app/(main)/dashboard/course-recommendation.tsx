import Link from "next/link";
import { ArrowUpRight, Compass, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { StudentCourseSummary } from "@/lib/student-course-summary";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
});

export function CourseRecommendation({
  course,
}: {
  course: StudentCourseSummary;
}) {
  const hasMastery = course.study.masteryScore !== null;
  const focusSubject = course.study.weakestSubject;

  return (
    <section
      aria-labelledby="next-step-heading"
      className="relative overflow-hidden rounded-3xl bg-[#18243a] px-6 py-7 text-white shadow-[0_18px_40px_rgb(24_36_58/0.2)] sm:px-8 sm:py-8"
    >
      <div aria-hidden="true" className="absolute -right-20 -top-24 size-72 rounded-full border border-white/10" />
      <div aria-hidden="true" className="absolute -bottom-32 right-28 size-64 rounded-full bg-[#a23c46]/35 blur-3xl" />
      <div aria-hidden="true" className="absolute right-8 top-8 h-24 w-px bg-white/10" />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#e4b57a]">
            <Compass aria-hidden="true" className="size-3.5" />
            Your Next Best Step
          </p>
          <h2 id="next-step-heading" className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-[1.03] tracking-[-0.028em] sm:text-4xl">
            {hasMastery ? `Return to ${course.title}` : `Start your baseline in ${course.title}`}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
            {hasMastery && focusSubject
              ? `Focus on ${focusSubject} next. It is the clearest opportunity to strengthen this course.`
              : hasMastery
                ? "Continue with a focused practice round to keep your progress moving."
                : "Take a diagnostic to give your study plan a reliable starting point."}
          </p>

          <Button asChild className="mt-6 h-11 rounded-xl bg-[#f4ece2] px-4 text-[#18243a] hover:bg-white">
            <Link href={`/course/${course.id}`}>
              {hasMastery ? "Continue Reviewing" : "Take Diagnostic"}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">Study Signal</p>
            <Target aria-hidden="true" className="size-4 text-[#e4b57a]" />
          </div>
          {hasMastery ? (
            <>
              <p className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-none tracking-[-0.04em]">
                {course.study.masteryScore}%
              </p>
              <Progress
                value={course.study.masteryScore ?? 0}
                aria-label={`${course.title} mastery`}
                aria-valuetext={`${course.study.masteryScore}% mastery`}
                className="mt-4 h-1.5 bg-white/15 [&>[data-slot=progress-indicator]]:bg-[#e4b57a]"
              />
              <p className="mt-3 text-xs leading-5 text-white/65">
                {course.study.questionsAnswered} questions answered
                {course.study.lastAssessedAt
                  ? ` · assessed ${dateFormatter.format(new Date(course.study.lastAssessedAt))}`
                  : ""}
              </p>
            </>
          ) : (
            <div className="mt-4 flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e4b57a]/15 text-[#e4b57a]">
                <Sparkles aria-hidden="true" className="size-4" />
              </span>
              <p className="text-sm leading-6 text-white/70">
                No assessment evidence yet. A diagnostic will personalize your next session.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
