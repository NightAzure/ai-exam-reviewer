import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Course, Topic } from "@/types/course";
import { motion } from "framer-motion";
import { Bot, BarChart2, Zap, StickyNote, Brain, Layers } from "lucide-react";
import Link from "next/link";

interface CourseProps {
  course: Course;
}

export const CourseInsights = ({ course }: CourseProps) => {
  const strengths = course.insights?.strengths ?? [];
  const weaknesses = course.insights?.weaknesses ?? [];
  const total = strengths.length + weaknesses.length;
  const strongPct = total > 0 ? Math.round((strengths.length / total) * 100) : 0;

  return (
    <Card className="p-5 rounded-xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.09)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.13)] transition space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">Mastery Overview</span>
        </div>
        {total > 0 && (
          <span className="text-xs text-gray-400">{strongPct}% mastered</span>
        )}
      </div>

      {/* Ratio bar */}
      {total > 0 && (
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${strongPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          />
        </div>
      )}

      {/* Strengths */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          You know these
        </p>
        {strengths.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {strengths.map((s, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No data yet</p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Weaknesses */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Keep working on
        </p>
        {weaknesses.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {weaknesses.map((w, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-700 bg-red-50 font-medium"
              >
                {w}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No data yet</p>
        )}
      </div>
    </Card>
  );
};

export const CourseRecommendation = ({ course }: CourseProps) => {
  //temp
  const suggestion = course.insights?.suggestions?.[0] || "Continue practicing to improve your skills";
  const focusTopic = course.insights?.weaknesses?.[0] || "your weak area";

  return (
    <Card className="border gap-3 border-primary rounded-xl bg-primary/10 p-4 shadow-sm hover:shadow-md transition">
      <p className="text-sm font-semibold text-primary">
        Recommended Next Step
      </p>
      <p className="text-sm text-gray-800">{suggestion}</p>
      <Link href={`/course/${course.id}/chat?review=${focusTopic}`}>
        <Button size="sm" className="w-full">
          Review with AI Buddy
        </Button>
      </Link>
    </Card>
  );
};

interface CourseAICTAProps {
  course: Course;
  weakestTopic: Topic | null;
  onPractice: (topic: Topic | null) => void;
  onNotesTab: () => void;
  onDiagnostic?: () => void;
  onFlashcards?: () => void;
}

export const CourseAICTA = ({ course, weakestTopic, onPractice, onNotesTab, onDiagnostic, onFlashcards }: CourseAICTAProps) => {
  const hasData =
    course.topics.some((topic) => topic.progress > 0) ||
    (course.insights?.strengths?.length ?? 0) > 0 ||
    (course.insights?.weaknesses?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="relative overflow-hidden p-6 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r from-primary/90 to-primary text-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.18)] hover:shadow-[0_6px_32px_rgba(0,0,0,0.24)] transition border-0">
        {/* Subtle red tint — left only */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to right, rgba(50,0,27,0.18) 0%, transparent 60%)" }}
        />
        {/* Circuit pattern — right side, fading toward left */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          style={{
            backgroundImage: "url('/grid.png')",
            backgroundSize: "750px auto",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
            opacity: 0.3,
            maskImage: "linear-gradient(to right, transparent 40%, black 60%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 40%, black 60%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Bot className="w-7 h-7" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="font-bold text-lg leading-tight">What to focus on next</p>
            {hasData && weakestTopic ? (
              <p className="text-sm opacity-85 leading-relaxed">
                {weakestTopic.progress > 0 ? (
                  <>
                    Your weakest topic is{" "}
                    <span className="font-semibold underline decoration-white/40">
                      {weakestTopic.name}
                    </span>{" "}
                    at {weakestTopic.progress}%. Here&apos;s how to work on it:
                  </>
                ) : (
                  <>
                    <span className="font-semibold underline decoration-white/40">
                      {weakestTopic.name}
                    </span>{" "}
                    still needs a baseline. Start there so future guidance is more precise.
                  </>
                )}
              </p>
            ) : onDiagnostic ? (
              <p className="text-sm opacity-85 leading-relaxed">
                Take a short diagnostic to create a baseline across your topics and unlock personalized guidance.
              </p>
            ) : (
              <p className="text-sm opacity-85 leading-relaxed">
                Take your first assessment or practice session to get personalized guidance.
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="relative z-10 flex flex-wrap gap-2 shrink-0 rounded-2xl p-2 backdrop-blur-xl">
          {!hasData && onDiagnostic ? (
            <>
              {/* Primary CTA — solid white */}
              <Button
                size="sm"
                className="rounded-lg font-semibold shadow-md gap-1.5 whitespace-nowrap bg-white text-primary hover:bg-gray-100"
                onClick={onDiagnostic}
              >
                <Brain className="size-4" />
                Take Diagnostic
              </Button>
              {/* Secondary — solid dark */}
              <Link href={`/course/${course.id}/chat`}>
                <Button
                  size="sm"
                  className="rounded-lg font-semibold gap-1.5 whitespace-nowrap bg-slate-900 text-white hover:bg-slate-800 border border-white"
                >
                  <Bot className="size-4" />
                  Ask AI Tutor
                </Button>
              </Link>
            </>
          ) : (
            <>
              {/* Primary CTA — solid white */}
              <Button
                size="sm"
                className="rounded-lg font-semibold shadow-md gap-1.5 whitespace-nowrap bg-white text-primary hover:bg-gray-100"
                disabled={!weakestTopic}
                onClick={() => onPractice(weakestTopic)}
              >
                <Zap className="size-4" />
                Quick Practice
              </Button>
              {/* Tertiary — solid muted */}
              {onFlashcards && (
                <Button
                  size="sm"
                  className="rounded-lg font-medium gap-1.5 whitespace-nowrap bg-slate-900 text-white hover:bg-slate-600 border border-white"
                  onClick={onFlashcards}
                >
                  <Layers className="size-4" />
                  Flashcards
                </Button>
              )}
              {/* Secondary — solid dark */}
              <Link href={`/course/${course.id}/chat`}>
                <Button
                  size="sm"
                  className="rounded-lg font-semibold gap-1.5 whitespace-nowrap bg-slate-900 text-white hover:bg-slate-800 border border-white"
                >
                  <Bot className="size-4" />
                  Ask AI Tutor
                </Button>
              </Link>
            </>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
