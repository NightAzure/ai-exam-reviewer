"use client";

import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent } from "./ui/sheet";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { BookOpen, CheckCircle, ChevronRight, Layers, X } from "lucide-react";

type Rating = "hard" | "medium" | "easy";

interface Flashcard {
  questionId: number;
  question: string;
  subject: string | null;
  options: string[];
  correctAnswer: string | null;
  explanation: string | null;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lastRating: string | null;
  isNew: boolean;
}

interface FlashcardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  topicId?: number | null;
}

const RATING_CONFIG: Record<Rating, { label: string; className: string; next: string }> = {
  hard: { label: "Hard", className: "border-red-300 text-red-700 hover:bg-red-50", next: "tomorrow" },
  medium: { label: "Medium", className: "border-yellow-300 text-yellow-700 hover:bg-yellow-50", next: "in a few days" },
  easy: { label: "Easy", className: "border-green-300 text-green-700 hover:bg-green-50", next: "next week+" },
};

export default function FlashcardSheet({ open, onOpenChange, courseId, topicId }: FlashcardSheetProps) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<Record<number, Rating>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIndex(0);
    setRevealed(false);
    setRating({});
    setDone(false);

    try {
      const url = `/api/course/${courseId}/flashcard${topicId ? `?topicId=${topicId}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const data = (await res.json()) as { cards?: Flashcard[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Failed to load");
      setCards(data.cards ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flashcards");
    } finally {
      setLoading(false);
    }
  }, [courseId, topicId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleRate = async (r: Rating) => {
    const card = cards[index];
    if (!card) return;

    setRating((prev) => ({ ...prev, [card.questionId]: r }));
    setSubmitting(true);

    void fetch(`/api/course/${courseId}/flashcard/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        questionId: card.questionId,
        rating: r,
        easeFactor: card.easeFactor,
        intervalDays: card.intervalDays,
        repetitions: card.repetitions,
      }),
    }).catch(() => undefined).finally(() => setSubmitting(false));

    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setRevealed(false);
    }
  };

  const current = cards[index];
  const progress = cards.length > 0 ? Math.round((index / cards.length) * 100) : 0;
  const ratingCounts = Object.values(rating).reduce(
    (acc, r) => { acc[r] = (acc[r] ?? 0) + 1; return acc; },
    {} as Record<Rating, number>,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="[&>button:last-child]:hidden min-w-[85vw] sm:min-w-[70vw] md:min-w-[55vw] lg:min-w-[45vw] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between py-4 px-5 border-b bg-secondary/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Flashcard Review</h2>
              {!loading && !done && cards.length > 0 && (
                <p className="text-xs text-muted-foreground">{index + 1} of {cards.length} cards</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="size-9 p-0" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Progress */}
        {!loading && !done && cards.length > 0 && (
          <Progress value={progress} className="h-1 rounded-none" />
        )}

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Loading flashcards…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <BookOpen className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No questions available</p>
              <p className="text-xs text-muted-foreground">Add questions to the question bank first.</p>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="p-4 bg-green-50 rounded-full">
                <CheckCircle className="size-12 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Session Complete!</h3>
                <p className="text-sm text-muted-foreground">You reviewed {cards.length} cards</p>
              </div>
              <div className="flex gap-4 text-sm">
                {(["easy", "medium", "hard"] as Rating[]).map((r) => (
                  <div key={r} className="text-center">
                    <div className="text-lg font-bold">{ratingCounts[r] ?? 0}</div>
                    <div className="text-muted-foreground capitalize">{r}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void load()}>New Session</Button>
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </div>
            </div>
          ) : current ? (
            <div className="flex flex-col gap-5 max-w-xl mx-auto">
              {/* Card */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4 min-h-[180px]">
                <div className="flex items-center gap-2 flex-wrap">
                  {current.subject && (
                    <Badge variant="secondary" className="text-xs">{current.subject}</Badge>
                  )}
                  {current.isNew && (
                    <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">New</Badge>
                  )}
                  {current.lastRating && !current.isNew && (
                    <Badge variant="outline" className="text-xs capitalize">{current.lastRating} last time</Badge>
                  )}
                </div>
                <p className="text-base font-medium leading-relaxed">{current.question}</p>

                {!revealed ? (
                  <Button
                    className="w-full mt-2"
                    onClick={() => setRevealed(true)}
                  >
                    Show Answer
                  </Button>
                ) : (
                  <div className="border-t pt-4 space-y-3">
                    <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                      <p className="text-xs font-semibold text-green-700 mb-1">Correct Answer</p>
                      <p className="text-sm font-medium text-green-900">{current.correctAnswer}</p>
                    </div>
                    {current.explanation && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{current.explanation}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Rating buttons */}
              {revealed && (
                <div className="space-y-2">
                  <p className="text-xs text-center text-muted-foreground">How well did you know this?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["hard", "medium", "easy"] as Rating[]).map((r) => (
                      <Button
                        key={r}
                        variant="outline"
                        disabled={submitting}
                        onClick={() => void handleRate(r)}
                        className={`flex flex-col h-auto py-3 gap-1 ${RATING_CONFIG[r].className}`}
                      >
                        <span className="font-semibold">{RATING_CONFIG[r].label}</span>
                        <span className="text-[10px] opacity-70">{RATING_CONFIG[r].next}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Skip */}
              {!revealed && index + 1 < cards.length && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
                  onClick={() => { setIndex((i) => i + 1); setRevealed(false); }}
                >
                  Skip <ChevronRight className="size-3" />
                </button>
              )}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
