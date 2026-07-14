import { Button } from "@/components/ui/button";
import type { Course, Topic } from "@/types/course";
import { ArrowUpRight, Bot, Compass, Sparkles } from "lucide-react";
import { getTopicMasteryForTopic } from "@/lib/topic-mastery";
import Link from "next/link";

interface CourseAICTAProps {
  course: Course;
  weakestTopic: Topic | null;
  onPractice: (topic: Topic | null) => void;
  onDiagnostic?: () => void;
  onFlashcards?: () => void;
}

export const CourseAICTA = ({
  course,
  weakestTopic,
  onPractice,
  onDiagnostic,
  onFlashcards,
}: CourseAICTAProps) => {
  const assessedTopics = course.topics.filter((topic) => (topic.evidenceCount ?? 0) > 0);
  const hasEvidence = assessedTopics.length > 0;
  const questionsAnswered = assessedTopics.reduce(
    (total, topic) => total + (topic.evidenceCount ?? 0),
    0,
  );
  const masteryScore = hasEvidence
    ? Math.round(
        assessedTopics.reduce((total, topic) => total + topic.progress, 0) /
          assessedTopics.length,
      )
    : null;
  const focus = weakestTopic ? getTopicMasteryForTopic(weakestTopic) : null;
  const takeDiagnostic = !hasEvidence && onDiagnostic;
  const questionLabel = questionsAnswered === 1 ? "question" : "questions";
  const topicLabel = assessedTopics.length === 1 ? "topic" : "topics";
  const tutorHref = weakestTopic
    ? `/course/${course.id}/chat?topic=${encodeURIComponent(weakestTopic.name)}`
    : `/course/${course.id}/chat`;

  return (
    <section aria-labelledby="study-session-heading" className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <article className="relative overflow-hidden rounded-3xl bg-[#18243a] p-6 text-white shadow-[0_18px_40px_rgb(24_36_58/0.18)] sm:p-7">
        <div aria-hidden="true" className="absolute -right-16 -top-20 size-56 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -bottom-28 right-16 size-52 rounded-full bg-[#8e3039]/30 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#e4b57a]">
            <Compass aria-hidden="true" className="size-3.5" />
            Today&apos;s Focus
          </p>
          <h2 id="study-session-heading" className="mt-3 text-pretty font-[family-name:var(--font-display)] text-3xl leading-[1.03] tracking-[-0.028em]">
            {takeDiagnostic
              ? "Build your baseline for this course"
              : weakestTopic
                ? `Practice ${weakestTopic.name} next`
                : "Begin your focused review"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            {takeDiagnostic
              ? "Take a diagnostic to create reliable topic evidence and personalize your study desk."
              : weakestTopic && focus
                ? `${focus.detail}. ${weakestTopic.name} is currently your clearest opportunity to strengthen this course.`
                : "Choose a topic to start building reliable study evidence."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {takeDiagnostic ? (
              <Button
                type="button"
                onClick={onDiagnostic}
                className="h-11 rounded-xl bg-[#f4ece2] px-4 text-[#18243a] hover:bg-white"
              >
                Take Diagnostic
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onPractice(weakestTopic)}
                disabled={!weakestTopic}
                className="h-11 rounded-xl bg-[#f4ece2] px-4 text-[#18243a] hover:bg-white"
              >
                {weakestTopic ? `Practice ${weakestTopic.name}` : "Choose a Topic"}
              </Button>
            )}
            {onFlashcards ? (
              <button
                type="button"
                onClick={onFlashcards}
                className="text-sm font-semibold text-white/70 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3aaad]"
              >
                Review flashcards
              </button>
            ) : null}
          </div>

          <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-white/60">
            {masteryScore !== null
              ? `Early signal: ${masteryScore}% mastery from ${questionsAnswered} answered ${questionLabel} across ${assessedTopics.length} ${topicLabel}.`
              : "Not Assessed · a diagnostic creates your first reliable study signal."}
          </p>
        </div>

      </article>

      <aside className="relative overflow-hidden rounded-3xl border border-[#24334c]/10 bg-white p-6 shadow-sm sm:p-7">
        <div aria-hidden="true" className="absolute -right-12 -top-10 size-40 rounded-full bg-[#8e3039]/8 blur-2xl" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8e3039]">
                <Bot aria-hidden="true" className="size-3.5" />
                Need a Hand?
              </p>
              <h2 className="mt-3 text-pretty font-[family-name:var(--font-display)] text-2xl leading-[1.08] tracking-[-0.025em] text-[#18243a] sm:text-3xl">
                Ask Your AI Tutor
              </h2>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#18243a] text-[#e4b57a]">
              <Sparkles aria-hidden="true" className="size-5" />
            </span>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#647087]">
            Get an explanation, a quick quiz, or help preparing for your next assessment.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild className="h-11 rounded-xl bg-[#18243a] px-4 text-white hover:bg-[#293752]">
              <Link href={tutorHref}>
                Ask AI Tutor
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            {weakestTopic ? (
              <p className="text-xs leading-5 text-[#647087]">
                Starts with <span className="font-semibold text-[#18243a]">{weakestTopic.name}</span> context.
              </p>
            ) : null}
          </div>
        </div>
      </aside>
    </section>
  );
};
