"use client";

import { ArrowUpRight, Target } from "lucide-react";
import type { Course, Topic } from "@/types/course";
import { Button } from "@/components/ui/button";
import { getTopicMasteryForTopic } from "@/lib/topic-mastery";

interface CourseTrackerProps {
  course: Course;
  onTopicClick: (topicId: number) => void;
  onPractice: (topic: Topic) => void;
}

export default function CourseTracker({
  course,
  onTopicClick,
  onPractice,
}: CourseTrackerProps) {
  const topics = [...(course.topics ?? [])].sort((left, right) => {
    const leftEvidence = left.evidenceCount ?? 0;
    const rightEvidence = right.evidenceCount ?? 0;
    if (leftEvidence === 0 && rightEvidence !== 0) return 1;
    if (rightEvidence === 0 && leftEvidence !== 0) return -1;
    return left.progress - right.progress;
  });
  const hasEvidence = topics.some((topic) => (topic.evidenceCount ?? 0) > 0);

  return (
    <section aria-labelledby="topics-heading" className="space-y-4">
      <div>
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8e3039]">
            <Target aria-hidden="true" className="size-3.5" />
            Topic Focus
          </p>
          <h2
            id="topics-heading"
            className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[-0.025em] text-[#18243a] sm:text-3xl"
          >
            Choose What to Review
          </h2>
        </div>
        <p className="mt-2 text-xs text-[#647087]">
          {hasEvidence ? "Topics needing the most attention appear first." : "Start a diagnostic to build your baseline."}
        </p>
      </div>

      {topics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#24334c]/20 bg-white px-6 py-10 text-center">
          <p className="font-semibold text-[#18243a]">Topics are being prepared</p>
          <p className="mt-2 text-sm leading-6 text-[#647087]">
            Your instructor has not added review topics to this course yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#24334c]/10 bg-white shadow-sm">
          {topics.map((topic, index) => {
            const mastery = getTopicMasteryForTopic(topic);
            const evidenceCount = topic.evidenceCount ?? 0;
            const correctAnswers = topic.correctAnswers ?? 0;
            const action = evidenceCount > 0 ? "Review" : "Practice";

            return (
              <article
                key={topic.id}
                className={index > 0 ? "border-t border-[#24334c]/10" : undefined}
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#18243a]">{topic.name}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${mastery.badgeClassName}`}>
                        {mastery.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#647087]">
                      {evidenceCount > 0
                        ? `${mastery.detail} · ${topic.progress}% mastery from ${correctAnswers}/${evidenceCount} correct answers.`
                        : "No assessment evidence yet. Practice this topic or take the course diagnostic."}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onTopicClick(topic.id)}
                      className="h-11 rounded-xl px-3 text-[#647087] hover:bg-[#18243a]/[0.04] hover:text-[#18243a]"
                    >
                      Details
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onPractice(topic)}
                      className="h-11 rounded-xl bg-[#18243a] px-4 text-white hover:bg-[#293752]"
                    >
                      {action}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
