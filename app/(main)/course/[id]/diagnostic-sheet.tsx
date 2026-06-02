"use client";

import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { X, Brain, CheckCircle2, XCircle, Loader2, RotateCcw } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getMastery } from "./course-tracker";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { Topic } from "@/types/course";

type DiagnosticQuestion = {
  id: number;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topicId: number;
  topicName: string;
};

type AnswerRecord = {
  questionId: number | null;
  questionText: string;
  options: string[];
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  subject: string;
  topicId?: number | null;
};

type FetchStatus = "loading" | "ready" | "error" | "empty";
type Phase = "intro" | "quiz" | "submitting" | "done" | "submit-error";

interface DiagnosticSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: number;
  topics: Topic[];
}

export default function DiagnosticSheet({
  open,
  onOpenChange,
  courseId,
  topics,
}: DiagnosticSheetProps) {
  const { mutate } = useSWRConfig();

  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("loading");
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [topicResults, setTopicResults] = useState<Map<string, { correct: number; total: number }>>(
    new Map(),
  );

  useEffect(() => {
    if (!open) return;

    setPhase("intro");
    setCurrent(0);
    setSelected(null);
    setSubmitted(false);
    setAnswers([]);
    setSubmitError("");
    setFetchStatus("loading");

    const controller = new AbortController();

    fetch(`/api/course/${courseId}/diagnostic`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { questions: DiagnosticQuestion[] }) => {
        if (controller.signal.aborted) return;
        const qs = data.questions ?? [];
        setQuestions(qs);
        setFetchStatus(qs.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (!controller.signal.aborted) setFetchStatus("error");
      });

    return () => controller.abort();
  }, [open, courseId]);

  const q = questions[current];

  const handleStart = () => {
    if (fetchStatus !== "ready") return;
    setStartTime(Date.now());
    setPhase("quiz");
  };

  const handleSubmitAnswer = () => {
    if (!selected || !q) return;
    const isCorrect = selected === q.correctAnswer;
    setAnswers((prev) => [
      ...prev,
      {
        questionId: q.id,
        questionText: q.text,
        options: q.options,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
        subject: q.topicName,
        topicId: q.topicId,
      },
    ]);
    setSubmitted(true);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      void handleFinish();
    }
  };

  const handleFinish = async () => {
    setPhase("submitting");

    const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
    const allAnswers = answers;

    const correct = allAnswers.filter((a) => a.isCorrect).length;
    setFinalScore(correct);

    const byTopic = new Map<string, { correct: number; total: number }>();
    allAnswers.forEach((a) => {
      const entry = byTopic.get(a.subject) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (a.isCorrect) entry.correct += 1;
      byTopic.set(a.subject, entry);
    });
    setTopicResults(byTopic);

    try {
      const res = await fetch(`/api/course/${courseId}/diagnostic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: allAnswers, timeSpentSeconds }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Failed to save diagnostic results");
      }

      await mutate(`/api/course/${courseId}/analytics`);
      setPhase("done");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save diagnostic results");
      setPhase("submit-error");
    }
  };

  const progressPct = questions.length > 0 ? Math.round((current / questions.length) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="[&>button:last-child]:hidden min-w-[90vw] sm:min-w-[80vw] md:min-w-[65vw] lg:min-w-[480px] flex flex-col p-0 gap-0 bg-background border-l border-border"
        side="right"
      >
        {/* Eyebrow + close */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
            {phase === "quiz" && q ? q.topicName : "Diagnostic Quiz"}
          </p>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 pb-6">

          {/* ── Intro ── */}
          {phase === "intro" && (
            <div className="space-y-4 max-w-lg mx-auto">
              {/* Hero card */}
              <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Brain className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Discover your knowledge level</h2>
                    {fetchStatus === "ready" && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {questions.length} question{questions.length !== 1 ? "s" : ""} &middot; {topics.length} topic{topics.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  We&apos;ll ask a few questions on each topic to map where you stand. This usually
                  takes 5 to 10 minutes. To keep the baseline clean, feedback waits until the end.
                </p>
              </div>

              {/* Topics covered */}
              <div className="rounded-[24px] border border-primary/20 bg-primary/5 px-5 py-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                  Topics covered
                </p>
                <div className="flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <span
                      key={t.id}
                      className="text-xs font-medium px-2.5 py-1 rounded-full border border-primary/20 bg-white text-gray-700"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status alerts */}
              {fetchStatus === "empty" && (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No questions available yet. Ask your instructor to add questions to the question bank.
                </div>
              )}
              {fetchStatus === "error" && (
                <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  Failed to load questions. Check your connection and try again.
                </div>
              )}

              {/* Start button */}
              <button
                disabled={fetchStatus !== "ready"}
                onClick={handleStart}
                className="group w-full rounded-2xl border border-primary bg-primary px-4 py-4 text-left transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">
                      {fetchStatus === "loading" ? "Loading questions..." : "Start Diagnostic"}
                    </div>
                    <div className="text-sm mt-0.5 text-white/70">No correctness feedback until completion</div>
                  </div>
                  {fetchStatus === "loading" ? (
                    <Loader2 className="size-4 text-white/70 animate-spin" />
                  ) : (
                    <span className="text-lg text-white/70 transition-transform group-hover:translate-x-0.5">-&gt;</span>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* ── Quiz ── */}
          {phase === "quiz" && q && (
            <div className="space-y-4">
              {/* Progress card */}
              <div className="rounded-[24px] border border-primary/20 bg-primary/5 px-5 py-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Question {current + 1} of {questions.length}</span>
                  <span className="font-medium text-gray-600">{q.topicName}</span>
                </div>
                <div className="h-2 rounded-full bg-primary/15 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: `${progressPct}%` }}
                    animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Question card */}
              <div className="rounded-[24px] border border-gray-200 bg-gray-50 px-5 py-4">
                <p className="text-base font-medium leading-relaxed text-gray-900">{q.text}</p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {q.options.map((option) => {
                  const isSelected = option === selected;
                  return (
                    <button
                      key={option}
                      disabled={submitted}
                      onClick={() => setSelected(option)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3.5 text-left text-sm transition-all",
                        !submitted && [
                          "cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/5 text-gray-900 font-medium"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                        ],
                        submitted && isSelected && "border-primary bg-primary/5 text-gray-900 font-medium",
                        submitted && !isSelected && "opacity-45 border-gray-100 bg-white cursor-default",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Locked answer cue */}
              {submitted && (
                <div className="rounded-[24px] border border-primary/20 bg-primary/5 p-4 space-y-1 text-sm text-gray-700">
                  <p className="font-semibold flex items-center gap-1.5 text-gray-900">
                    <CheckCircle2 className="size-4 text-primary" />
                    Answer saved
                  </p>
                  <p className="leading-relaxed">
                    Keep going without answer feedback. Your topic summary appears after the final question.
                  </p>
                </div>
              )}

              {/* Action button */}
              <div className="pt-1">
                {!submitted ? (
                  <button
                    disabled={!selected}
                    onClick={handleSubmitAnswer}
                    className="group w-full rounded-2xl border border-primary bg-primary px-4 py-4 text-left transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium text-white">Submit Answer</div>
                      <span className="text-lg text-white/70 transition-transform group-hover:translate-x-0.5">-&gt;</span>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="group w-full rounded-2xl border border-primary bg-primary px-4 py-4 text-left transition-all hover:opacity-90"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium text-white">
                        {current < questions.length - 1 ? "Next Question" : "See Results"}
                      </div>
                      <span className="text-lg text-white/70 transition-transform group-hover:translate-x-0.5">-&gt;</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Submitting ── */}
          {phase === "submitting" && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="p-4 rounded-2xl bg-primary/10">
                <Loader2 className="size-7 text-primary animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Saving your results...</p>
            </div>
          )}

          {/* ── Submit error ── */}
          {phase === "submit-error" && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                <XCircle className="size-7 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Couldn&apos;t save your results</p>
                <p className="text-sm text-gray-500 mt-1">
                  {submitError || "Your answers couldn't be persisted. Try again."}
                </p>
              </div>
              <button
                onClick={() => void handleFinish()}
                className="group flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              >
                <RotateCcw className="size-4" />
                Retry
              </button>
            </div>
          )}

          {/* ── Done ── */}
          {phase === "done" && (
            <div className="space-y-4 max-w-lg mx-auto">
              {/* Score hero card */}
              <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Your result</p>
                    <p className="text-lg font-semibold text-gray-900">Diagnostic complete</p>
                    <p className="text-sm text-gray-500">
                      Your topic guidance is now based on the saved baseline answers.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-right shrink-0 shadow-sm">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Score</div>
                    <div className="mt-1 text-3xl font-semibold text-gray-900 tabular-nums">
                      {finalScore}<span className="text-lg text-gray-400">/{questions.length}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Overall score</span>
                    <span>{questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary/15 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0}%` }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>

              {/* Results by topic */}
              <div className="rounded-[24px] border border-primary/20 bg-primary/5 px-5 py-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                  Results by topic
                </p>
                <div className="space-y-2">
                  {Array.from(topicResults.entries()).sort(([, left], [, right]) => {
                    const leftPct = left.total > 0 ? left.correct / left.total : 0;
                    const rightPct = right.total > 0 ? right.correct / right.total : 0;
                    return leftPct - rightPct;
                  }).map(([topicName, stats]) => {
                    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                    const mastery = getMastery(pct);
                    return (
                      <div
                        key={topicName}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3"
                      >
                        <span className="text-sm font-medium text-gray-800">{topicName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-400">{stats.correct}/{stats.total}</span>
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${mastery.bg} ${mastery.color} ${mastery.border}`}>
                            {mastery.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Back button */}
              <button
                onClick={() => onOpenChange(false)}
                className="group w-full rounded-2xl border border-primary bg-primary px-4 py-4 text-left transition-all hover:opacity-90"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">Back to Course</div>
                    <div className="text-sm mt-0.5 text-white/70">View your updated topic insights</div>
                  </div>
                  <span className="text-lg text-white/70 transition-transform group-hover:translate-x-0.5">-&gt;</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
