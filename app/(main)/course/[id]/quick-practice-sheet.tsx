"use client";

import { useEffect, useState, startTransition } from "react";
import { X, Zap, RotateCcw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getTopicMastery } from "@/lib/topic-mastery";
import { cn } from "@/lib/utils";
import type { Topic } from "@/types/course";

type PracticeQuestion = {
  id: number;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type Phase = "loading" | "error" | "empty" | "quiz" | "done";

interface QuickPracticeSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  topic: Topic | null;
  courseId: number;
}

export default function QuickPracticeSheet({
  open,
  onOpenChange,
  topic,
  courseId,
}: QuickPracticeSheetProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    if (!open || !topic) return;

    const controller = new AbortController();

    startTransition(() => {
      setPhase("loading");
      setQuestions([]);
      setCurrent(0);
      setScore(0);
      setSelected(null);
      setSubmitted(false);
    });

    fetch(`/api/course/${courseId}/topics/${topic.id}/practice-questions?count=10`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { questions: PracticeQuestion[] }) => {
        if (controller.signal.aborted) return;
        const qs = data.questions ?? [];
        setQuestions(qs);
        setPhase(qs.length > 0 ? "quiz" : "empty");
      })
      .catch(() => {
        if (!controller.signal.aborted) setPhase("error");
      });

    return () => controller.abort();
  }, [open, topic, fetchKey, courseId]);

  const q = questions[current];

  const handleSubmit = () => {
    if (!selected || !q) return;
    if (selected === q.correctAnswer) setScore((s) => s + 1);
    setSubmitted(true);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setPhase("done");
    }
  };

  const handleRetry = () => {
    setFetchKey((k) => k + 1);
  };

  const scorePct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const mastery = getTopicMastery(scorePct, questions.length);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="[&>button:last-child]:hidden min-w-[90vw] sm:min-w-[80vw] md:min-w-[65vw] lg:min-w-[50vw] flex flex-col p-0 gap-0"
        side="right"
      >
        {/* Header */}
        <div className="flex items-center justify-between py-4 px-5 border-b bg-canvas/70 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 bg-ink/10 rounded-lg">
              <Zap className="size-5 text-ink" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Quick Practice</h2>
              {topic && (
                <p className="text-sm text-muted-foreground">{topic.name}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="size-9 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {/* Loading */}
          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
              <p className="text-sm">Loading questions…</p>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <XCircle className="size-10 text-red-400" />
              <p className="font-medium">Failed to load questions</p>
              <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
              <Button variant="outline" onClick={handleRetry} className="gap-2">
                <RotateCcw className="size-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Empty */}
          {phase === "empty" && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="p-4 bg-muted/50 rounded-full">
                <Zap className="size-8 text-muted-foreground" />
              </div>
              <p className="font-medium">No questions available</p>
              <p className="text-sm text-muted-foreground">
                There are no practice questions for this topic yet. Check back later or ask your
                instructor.
              </p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}

          {/* Quiz */}
          {phase === "quiz" && q && (
            <div className="space-y-6">
              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Question {current + 1} of {questions.length}</span>
                  <span>{score} correct so far</span>
                </div>
                <Progress value={((current) / questions.length) * 100} className="h-2" />
              </div>

              {/* Question */}
              <p className="text-base font-medium leading-relaxed text-foreground">{q.text}</p>

              {/* Options */}
              <div className="space-y-2">
                {q.options.map((option) => {
                  const isCorrect = option === q.correctAnswer;
                  const isSelected = option === selected;
                  return (
                    <button
                      key={option}
                      disabled={submitted}
                      onClick={() => setSelected(option)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                        !submitted && [
                          "hover:bg-accent cursor-pointer",
                          isSelected
                            ? "border-primary bg-ink/5 text-foreground"
                            : "border-border text-foreground",
                        ],
                        submitted && isCorrect && "border-green-500 bg-proficient/10 text-green-800 font-medium",
                        submitted && isSelected && !isCorrect && "border-red-500 bg-needs-focus/8 text-red-800",
                        submitted && !isSelected && !isCorrect && "opacity-40 cursor-default",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Explanation (shown after submit) */}
              {submitted && q.explanation && (
                <div className="rounded-lg border border-evidence/20 bg-evidence/10 p-4 text-sm text-blue-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    {selected === q.correctAnswer ? (
                      <CheckCircle2 className="size-4 text-proficient" />
                    ) : (
                      <XCircle className="size-4 text-red-500" />
                    )}
                    {selected === q.correctAnswer ? "Correct!" : "Incorrect"}
                  </p>
                  <p>{q.explanation}</p>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex gap-2 pt-2">
                {!submitted ? (
                  <Button
                    className="flex-1"
                    disabled={!selected}
                    onClick={handleSubmit}
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={handleNext}>
                    {current < questions.length - 1 ? "Next Question →" : "See Results"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Done / Score screen */}
          {phase === "done" && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="space-y-2">
                <p className="text-4xl font-bold text-foreground">
                  {score}/{questions.length}
                </p>
                <p className="text-lg text-muted-foreground">Questions Correct</p>
              </div>

              <div className="w-full max-w-xs space-y-2">
                <Progress value={scorePct} className="h-3" />
                <span
                  className={`inline-block rounded-full border px-3 py-1 text-sm ${mastery.badgeClassName}`}
                >
                  {mastery.label}
                </span>
              </div>

              {scorePct < 60 && (
                <p className="text-sm text-muted-foreground max-w-xs">
                  Keep practicing! Repeated practice is the fastest way to improve on this topic.
                </p>
              )}
              {scorePct >= 60 && scorePct < 90 && (
                <p className="text-sm text-muted-foreground max-w-xs">
                  Good effort! Try again to push toward Proficient or Mastered.
                </p>
              )}
              {scorePct >= 90 && (
                <p className="text-sm text-muted-foreground max-w-xs">
                  Excellent! You&apos;re well on your way to mastering this topic.
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRetry} className="gap-2">
                  <RotateCcw className="size-4" />
                  Practice Again
                </Button>
                <Button onClick={() => onOpenChange(false)}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
