"use client";

import { ArrowUpRight, MessageSquare, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getTopicMasteryForTopic } from "@/lib/topic-mastery";
import type { Topic } from "@/types/course";
import Link from "next/link";

interface TopicDetailSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  topic: Topic | null;
  courseId: number;
  onPractice: (topic: Topic) => void;
  onNotesTab: () => void;
  strengths: string[];
  weaknesses: string[];
}

export default function TopicDetailSheet({
  open,
  onOpenChange,
  topic,
  courseId,
  onPractice,
  onNotesTab,
  strengths,
  weaknesses,
}: TopicDetailSheetProps) {
  if (!topic) return null;

  const mastery = getTopicMasteryForTopic(topic);
  const topicNameLower = topic.name.toLowerCase();
  const isWeak = weaknesses.some((w) => w.toLowerCase() === topicNameLower);
  const isStrong = strengths.some((s) => s.toLowerCase() === topicNameLower);
  const hasEvidence = (topic.evidenceCount ?? 0) > 0;

  const recommendedNote = !hasEvidence
    ? "Start with practice to generate a baseline for this topic."
    : isWeak
    ? "Focused practice here will move the needle the most."
    : isStrong
    ? "Maintain your edge — occasional review keeps it sharp."
    : "Keep practicing to push past the midpoint.";

  const actions = [
    {
      label: "Quick Practice",
      hint: "5 targeted questions",
      primary: true,
      onClick: () => { onPractice(topic); onOpenChange(false); },
    },
    {
      label: "Study Notes",
      hint: "Condensed review",
      primary: false,
      onClick: () => { onNotesTab(); onOpenChange(false); },
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="[&>button:last-child]:hidden flex min-w-[85vw] flex-col gap-0 border-l border-[#24334c]/10 bg-[#f4ece2] p-0 sm:min-w-[80vw] md:min-w-[60vw] lg:min-w-[420px]"
        side="right"
      >
        {/* Eyebrow + close */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8e3039]">
            Topic Detail
          </p>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close topic details"
            className="rounded-xl border border-[#24334c]/10 bg-white p-2 text-[#647087] transition-[background-color,color] hover:bg-[#18243a]/[0.04] hover:text-[#18243a]"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 pb-6 space-y-4">

          <div className="rounded-3xl bg-[#18243a] p-5 text-white shadow-[0_18px_40px_rgb(24_36_58/0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight tracking-[-0.025em]">
                  {topic.name}
                </h2>
                <span
                  className="inline-flex rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/80"
                >
                  {mastery.label}
                </span>
              </div>

              <div className="shrink-0 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-right">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Mastery</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  {hasEvidence ? `${topic.progress}%` : "—"}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">
              {hasEvidence
                ? `${mastery.detail}. Based on ${topic.correctAnswers ?? 0}/${topic.evidenceCount ?? 0} correct answers.`
                : "Not Assessed. Start practice or complete the course diagnostic to build a baseline."}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#24334c]/10 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[#18243a]">Recommended next step</div>
                <div className="mt-1 text-sm leading-relaxed text-[#647087]">{recommendedNote}</div>
              </div>
              <span className="shrink-0 text-xs text-[#647087]">Now</span>
            </div>
          </div>

          {/* Topic description */}
          {topic.description && (
            <div className="space-y-1 rounded-2xl border border-[#24334c]/10 bg-white px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8e3039]">
                About this topic
              </p>
              <p className="text-sm leading-relaxed text-[#647087]">{topic.description}</p>
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            {actions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant={action.primary ? "default" : "outline"}
                onClick={action.onClick}
                className={
                  action.primary
                    ? "h-12 w-full justify-between rounded-xl bg-[#18243a] px-4 text-white hover:bg-[#293752]"
                    : "h-12 w-full justify-between rounded-xl border-[#24334c]/15 bg-white px-4 text-[#18243a] hover:bg-[#18243a]/[0.03]"
                }
              >
                <span className="text-left">
                  <span className="block font-semibold">{action.label}</span>
                  <span className={`mt-0.5 block text-xs font-normal ${action.primary ? "text-white/70" : "text-[#647087]"}`}>
                    {action.hint}
                  </span>
                </span>
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Button>
            ))}

            <Button
              asChild
              variant="outline"
              className="h-12 w-full justify-between rounded-xl border-[#24334c]/15 bg-white px-4 text-[#18243a] hover:bg-[#18243a]/[0.03]"
            >
              <Link href={`/course/${courseId}/chat?topic=${encodeURIComponent(topic.name)}`}>
                <span className="text-left">
                  <span className="block font-semibold">Ask AI Tutor</span>
                  <span className="mt-0.5 block text-xs font-normal text-[#647087]">Get unstuck fast</span>
                </span>
                <MessageSquare aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
