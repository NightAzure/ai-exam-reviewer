"use client";

import { X, Zap, StickyNote, Bot } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getMastery } from "./course-tracker";
import type { Topic } from "@/types/course";
import Link from "next/link";
import { motion } from "framer-motion";

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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted p-3.5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">{label}</div>
      <div className="mt-1.5 text-base font-semibold text-foreground">{value}</div>
    </div>
  );
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

  const mastery = getMastery(topic.progress);
  const topicNameLower = topic.name.toLowerCase();
  const isWeak = weaknesses.some((w) => w.toLowerCase() === topicNameLower);
  const isStrong = strengths.some((s) => s.toLowerCase() === topicNameLower);
  const hasData = topic.progress > 0;

  const confidence = topic.progress >= 70 ? "High" : topic.progress >= 40 ? "Medium" : "Low";
  const priority = isWeak ? "High" : isStrong ? "Low" : "Medium";

  const recommendedNote = !hasData
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
        className="[&>button:last-child]:hidden min-w-[85vw] sm:min-w-[80vw] md:min-w-[60vw] lg:min-w-[420px] flex flex-col p-0 gap-0 bg-background border-l border-border"
        side="right"
      >
        {/* Eyebrow + close */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
            Topic Detail
          </p>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 pb-6 space-y-4">

          {/* Hero insight card — slightly tinted with gray */}
          <div className="rounded-[24px] border border-border bg-muted/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <h2 className="text-lg font-semibold text-foreground leading-tight truncate">
                  {topic.name}
                </h2>
                <span
                  className={`inline-flex text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${mastery.bg} ${mastery.color} ${mastery.border}`}
                >
                  {mastery.label}
                </span>
              </div>

              {/* Mastery pill */}
              <div className="rounded-2xl border border-border bg-card px-4 py-3 text-right shrink-0 shadow-sm">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Mastery</div>
                <div className="mt-1 text-3xl font-semibold text-foreground tabular-nums">{topic.progress}%</div>
              </div>
            </div>

            {/* Metric row */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MetricCard label="Confidence" value={confidence} />
              <MetricCard label="Attempts" value={hasData ? "Active" : "None"} />
              <MetricCard label="Priority" value={priority} />
            </div>
          </div>

          {/* Recommended next step card — primary-tinted */}
          <div className="rounded-[24px] border border-primary/20 bg-primary/5 p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-foreground">Recommended next step</div>
                <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{recommendedNote}</div>
              </div>
              <span className="text-xs text-muted-foreground/70 shrink-0">Now</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground/70">
                <span>Overall mastery</span>
                <span>{topic.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-primary/15 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${topic.progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
                />
              </div>
            </div>
          </div>

          {/* Topic description */}
          {topic.description && (
            <div className="rounded-[24px] border border-border bg-muted/50 px-5 py-4 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                About this topic
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">{topic.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5 pt-1">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`group w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                  action.primary
                    ? "bg-primary border-primary text-white hover:opacity-90"
                    : "bg-card border-border hover:bg-muted/50 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className={`font-medium ${action.primary ? "text-white" : "text-foreground"}`}>
                      {action.label}
                    </div>
                    <div className={`text-sm mt-0.5 ${action.primary ? "text-white/70" : "text-muted-foreground/70"}`}>
                      {action.hint}
                    </div>
                  </div>
                  <span className={`text-lg transition-transform group-hover:translate-x-0.5 ${action.primary ? "text-white/70" : "text-muted-foreground/70"}`}>
                    →
                  </span>
                </div>
              </button>
            ))}

            <Link
              href={`/course/${courseId}/chat?topic=${encodeURIComponent(topic.name)}`}
              className="block w-full"
            >
              <button className="group w-full rounded-2xl border border-border bg-card hover:bg-muted/50 hover:border-border px-4 py-4 text-left transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-foreground">Ask AI Tutor</div>
                    <div className="text-sm mt-0.5 text-muted-foreground/70">Get unstuck fast</div>
                  </div>
                  <span className="text-lg text-muted-foreground/70 transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
