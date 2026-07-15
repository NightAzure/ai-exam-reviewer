"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Brain,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Info,
  LogOut,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Sheet, SheetContent } from "../ui/sheet";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { createClient } from "@/utils/supabase/client";
import {
  createAssessmentDraftInSupabase,
  loadInProgressAssessmentAttempt,
  loadAssessmentAttemptById,
  resolveAssessmentQuestions,
  saveAssessmentDraftInSupabase,
  submitAssessmentAttemptInSupabase,
} from "@/utils/supabase/assessment-attempts";
import type {
  AssessmentAttempt,
  AssessmentFull,
  ResolvedAssessmentQuestion,
} from "@/types/assessment";
import type { AssessmentReviewItem } from "@/types/assessment-review";

type AssessmentMode =
  | "taking"
  | "review-with-answers"
  | "review-without-answers";

interface AssessmentSheetProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  mode: AssessmentMode;
  assessment?: AssessmentFull;
  courseTitle?: string;
  reviewAttemptId?: number;
  onSubmitted?: (attempt: AssessmentAttempt) => void | Promise<void>;
}

export default function AssessmentSheet({
  open,
  setOpen,
  mode = "taking",
  assessment,
  courseTitle,
  reviewAttemptId,
  onSubmitted,
}: AssessmentSheetProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [resolvedQuestions, setResolvedQuestions] = useState<ResolvedAssessmentQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Array<string | null>>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showAnswers, setShowAnswers] = useState(mode === "review-with-answers");
  const [isSubmitted, setIsSubmitted] = useState(mode !== "taking");
  const [showAllQuestions, setShowAllQuestions] = useState(mode !== "taking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAttempt, setSubmittedAttempt] = useState<AssessmentAttempt>();
  const [startedAt, setStartedAt] = useState<string>(() => new Date().toISOString());
  const [currentAttemptId, setCurrentAttemptId] = useState<number>();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [resumedDraft, setResumedDraft] = useState(false);
  const [aiReview, setAiReview] = useState<AssessmentReviewItem[] | null>(null);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewError, setAiReviewError] = useState<string | null>(null);
  const [hints, setHints] = useState<Record<number, { text: string | null; loading: boolean; used: number }>>({});

  useEffect(() => {
    if (!open || !assessment) return;

    let cancelled = false;
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setError(null);
      setCurrentQuestion(0);
      setFlaggedQuestions(new Set());
      setSubmittedAttempt(undefined);
      setCurrentAttemptId(undefined);
      setSaveStatus("idle");
      setResumedDraft(false);
      setAiReview(null);
      setAiReviewError(null);
      setHints({});

      try {
        if (mode === "taking") {
          const existingAttempt = await loadInProgressAssessmentAttempt(
            supabase,
            assessment.id,
          );
          if (cancelled) return;

          if (existingAttempt) {
            const questions = existingAttempt.answers.map((answer) => ({
              id: answer.questionId ?? `attempt-answer-${answer.id}`,
              sourceQuestionId: answer.questionId,
              text: answer.questionText,
              type: "multiple-choice" as const,
              options: answer.options,
              correctAnswer: answer.correctAnswer,
              explanation: answer.explanation,
              subject: answer.subject,
              position: answer.questionPosition,
            }));

            setResolvedQuestions(questions);
            setUserAnswers(existingAttempt.answers.map((answer) => answer.selectedAnswer ?? null));
            setStartedAt(existingAttempt.startedAt);
            setCurrentAttemptId(existingAttempt.id);
            setResumedDraft(true);
            setTimeRemaining(
              assessment.duration != null
                ? Math.max(assessment.duration * 60 - (existingAttempt.timeSpentSeconds ?? 0), 0)
                : 0,
            );
          } else {
            const questions = await resolveAssessmentQuestions(supabase, assessment);
            if (cancelled) return;

            const draftStartedAt = new Date().toISOString();
            const emptyAnswers = new Array(questions.length).fill(null);
            const draft = await createAssessmentDraftInSupabase(supabase, {
              assessment,
              questions,
              selectedAnswers: emptyAnswers,
              startedAt: draftStartedAt,
            });
            if (cancelled) return;

            setResolvedQuestions(questions);
            setUserAnswers(emptyAnswers);
            setStartedAt(draftStartedAt);
            setCurrentAttemptId(draft.id);
            setTimeRemaining((assessment.duration ?? 0) * 60);
          }

          setShowAnswers(false);
          setIsSubmitted(false);
          setShowAllQuestions(false);
        } else if (reviewAttemptId != null) {
          const attempt = await loadAssessmentAttemptById(supabase, reviewAttemptId);
          if (cancelled) return;

          const questions = attempt.answers.map((answer) => ({
            id: answer.questionId ?? `attempt-answer-${answer.id}`,
            sourceQuestionId: answer.questionId,
            text: answer.questionText,
            type: "multiple-choice" as const,
            options: answer.options,
            correctAnswer: answer.correctAnswer,
            explanation: answer.explanation,
            subject: answer.subject,
            position: answer.questionPosition,
          }));

          setResolvedQuestions(questions);
          setUserAnswers(attempt.answers.map((answer) => answer.selectedAnswer ?? null));
          setSubmittedAttempt(attempt);
          setStartedAt(attempt.startedAt);
          setTimeRemaining(0);
          setShowAnswers(mode === "review-with-answers");
          setIsSubmitted(true);
          setShowAllQuestions(true);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load this assessment.",
          );
          setResolvedQuestions([]);
          setUserAnswers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [assessment, mode, open, reviewAttemptId]);

  useEffect(() => {
    if (mode !== "taking" || isSubmitted || timeRemaining <= 0 || !assessment?.duration) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [assessment?.duration, isSubmitted, mode, timeRemaining]);

  useEffect(() => {
    if (
      mode !== "taking" ||
      isSubmitted ||
      loading ||
      !assessment ||
      !currentAttemptId ||
      resolvedQuestions.length === 0
    ) {
      return;
    }

    setSaveStatus("saving");
    const timeout = setTimeout(() => {
      const supabase = createClient();
      void saveAssessmentDraftInSupabase(supabase, {
        attemptId: currentAttemptId,
        assessment,
        questions: resolvedQuestions,
        selectedAnswers: userAnswers,
        startedAt,
        timeSpentSeconds:
          assessment.duration != null
            ? Math.max(assessment.duration * 60 - Math.max(timeRemaining, 0), 0)
            : 0,
      })
        .then(() => {
          setSaveStatus("saved");
        })
        .catch((saveError) => {
          setError(
            saveError instanceof Error
              ? saveError.message
              : "Failed to autosave your assessment.",
          );
          setSaveStatus("idle");
        });
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    assessment,
    currentAttemptId,
    isSubmitted,
    loading,
    mode,
    resolvedQuestions,
    startedAt,
    timeRemaining,
    userAnswers,
  ]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    if (mode !== "taking" || isSubmitted) return;

    setUserAnswers((previous) => {
      const next = [...previous];
      next[questionIndex] = answer;
      return next;
    });
  };

  const toggleFlag = (questionIndex: number) => {
    if (mode !== "taking" || isSubmitted) return;

    setFlaggedQuestions((previous) => {
      const next = new Set(previous);
      if (next.has(questionIndex)) {
        next.delete(questionIndex);
      } else {
        next.add(questionIndex);
      }
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!assessment) return;
    if (resolvedQuestions.length === 0) {
      setError("This assessment has no available questions.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const attempt = await submitAssessmentAttemptInSupabase(supabase, {
        attemptId: currentAttemptId,
        assessment,
        questions: resolvedQuestions,
        selectedAnswers: userAnswers,
        startedAt,
        timeSpentSeconds:
          assessment.duration != null
            ? Math.max(assessment.duration * 60 - Math.max(timeRemaining, 0), 0)
            : 0,
      });

      setSubmittedAttempt(attempt);
      setUserAnswers(attempt.answers.map((answer) => answer.selectedAnswer ?? null));
      setIsSubmitted(true);
      setShowAnswers(true);
      setShowAllQuestions(true);
      setCurrentAttemptId(attempt.id);
      setSaveStatus("idle");

      if (onSubmitted) {
        await onSubmitted(attempt);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit your assessment.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    assessment,
    currentAttemptId,
    onSubmitted,
    resolvedQuestions,
    startedAt,
    timeRemaining,
    userAnswers,
  ]);

  useEffect(() => {
    if (mode === "taking" && timeRemaining <= 0 && assessment?.duration && !isSubmitted) {
      void handleSubmit();
    }
  }, [assessment?.duration, handleSubmit, isSubmitted, mode, timeRemaining]);

  const getAnswerStatus = (questionIndex: number, option: string) => {
    const userAnswer = userAnswers[questionIndex];
    const correctAnswer = resolvedQuestions[questionIndex]?.correctAnswer;

    if (!isSubmitted || !showAnswers) return "default";
    if (option === correctAnswer) return "correct";
    if (option === userAnswer && userAnswer !== correctAnswer) return "incorrect";
    return "default";
  };

  const getQuestionStatus = (questionIndex: number) => {
    if (!isSubmitted) {
      return userAnswers[questionIndex] !== null ? "answered" : "unanswered";
    }

    const userAnswer = userAnswers[questionIndex];
    const correctAnswer = resolvedQuestions[questionIndex]?.correctAnswer;

    if (userAnswer === null) return "unanswered";
    return userAnswer === correctAnswer ? "correct" : "incorrect";
  };

  const answeredCount = userAnswers.filter((answer) => answer !== null).length;
  const unansweredCount = resolvedQuestions.length - answeredCount;
  const score = useMemo(() => {
    if (submittedAttempt?.score != null) return submittedAttempt.score;
    if (resolvedQuestions.length === 0) return 0;
    const correct = resolvedQuestions.reduce((count, question, index) => {
      return userAnswers[index] != null && userAnswers[index] === question.correctAnswer
        ? count + 1
        : count;
    }, 0);
    return Math.round((correct / resolvedQuestions.length) * 100);
  }, [resolvedQuestions, submittedAttempt?.score, userAnswers]);

  const handleGetHint = async (questionIndex: number) => {
    const question = resolvedQuestions[questionIndex];
    if (!question || !assessment?.courseId || !assessment?.id) return;

    const current = hints[questionIndex];
    if (current && current.used >= 2) return;

    setHints((prev) => ({
      ...prev,
      [questionIndex]: { text: null, loading: true, used: (current?.used ?? 0) },
    }));

    try {
      const res = await fetch(
        `/api/course/${assessment.courseId}/assessment/${assessment.id}/hint`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_text: question.text,
            options: question.options,
            subject: question.subject ?? "General",
          }),
          credentials: "include",
        },
      );
      const data = (await res.json()) as { hint?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Failed");
      setHints((prev) => ({
        ...prev,
        [questionIndex]: { text: data.hint ?? null, loading: false, used: (current?.used ?? 0) + 1 },
      }));
    } catch {
      setHints((prev) => ({
        ...prev,
        [questionIndex]: { text: "Could not load hint. Try again.", loading: false, used: current?.used ?? 0 },
      }));
    }
  };

  const handleReviewWithAI = async () => {
    if (!assessment?.courseId || !submittedAttempt?.id) return;
    setAiReviewLoading(true);
    setAiReviewError(null);
    try {
      const res = await fetch(`/api/course/${assessment.courseId}/assessment-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: submittedAttempt.id }),
        credentials: "include",
      });
      const data = (await res.json()) as { reviews?: AssessmentReviewItem[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Failed to generate review");
      setAiReview(data.reviews ?? []);
    } catch (err) {
      setAiReviewError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setAiReviewLoading(false);
    }
  };

  const AIReviewCard = ({ item }: { item: AssessmentReviewItem }) => (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <p className="font-medium text-sm leading-relaxed">{item.question_text}</p>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-needs-focus/8 border border-needs-focus/20 text-needs-focus">
          <XCircle className="size-3.5" />
          Your answer: {item.student_answer || "No answer"}
        </span>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-proficient/10 border border-proficient/20 text-proficient">
          <CheckCircle className="size-3.5" />
          Correct: {item.correct_answer}
        </span>
        {item.subject ? (
          <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">
            {item.subject}
          </span>
        ) : null}
      </div>
      <div className="pt-1 border-t">
        <p className="text-sm text-foreground leading-relaxed">{item.ai_explanation}</p>
      </div>
    </div>
  );

  const SingleQuestionView = ({ questionIndex }: { questionIndex: number }) => {
    const question = resolvedQuestions[questionIndex];

    if (!question) return null;

    return (
      <div className="flex gap-6 mb-8">
        <div className="flex-shrink-0 w-16 flex flex-col items-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
              getQuestionStatus(questionIndex) === "correct"
                ? "bg-green-100 border-green-500 text-proficient"
                : getQuestionStatus(questionIndex) === "incorrect"
                  ? "bg-red-100 border-red-500 text-needs-focus"
                  : getQuestionStatus(questionIndex) === "answered"
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "bg-muted border-border text-muted-foreground"
            }`}
          >
            {questionIndex + 1}
          </div>
          {flaggedQuestions.has(questionIndex) ? (
            <Flag className="size-4 text-orange-500 fill-orange-500 mt-1" />
          ) : null}
        </div>

        <div className="flex-1 max-w-4xl">
          <div className="flex items-start justify-between mb-6">
            <div className="pr-4">
              <h2 className="text-xl font-semibold">{question.text}</h2>
              {question.subject ? (
                <p className="mt-2 text-sm text-muted-foreground">{question.subject}</p>
              ) : null}
            </div>

            {mode === "taking" && !isSubmitted ? (
              <div className="ml-4 flex-shrink-0 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFlag(questionIndex)}
                  className={flaggedQuestions.has(questionIndex) ? "text-orange-500" : "text-muted-foreground"}
                >
                  <Flag className={`size-4 ${flaggedQuestions.has(questionIndex) ? "fill-orange-500" : ""}`} />
                  {flaggedQuestions.has(questionIndex) ? "Unflag" : "Flag"}
                </Button>
                {assessment?.allowHints !== false && (() => {
                  const hint = hints[questionIndex];
                  const used = hint?.used ?? 0;
                  return (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={used >= 2 || hint?.loading}
                      onClick={() => void handleGetHint(questionIndex)}
                      className="text-muted-foreground gap-1"
                    >
                      <Info className="size-4" />
                      {hint?.loading ? "..." : used >= 2 ? "Hint (0 left)" : `Hint (${2 - used} left)`}
                    </Button>
                  );
                })()}
              </div>
            ) : null}
          </div>

          <RadioGroup
            value={userAnswers[questionIndex] ?? ""}
            onValueChange={(value) => handleAnswerSelect(questionIndex, value)}
            disabled={mode !== "taking" || isSubmitted}
            className="space-y-3"
          >
            {question.options.map((option) => {
              const status = getAnswerStatus(questionIndex, option);
              return (
                <div
                  key={`${question.id}-${option}`}
                  className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                    status === "correct"
                      ? "bg-proficient/10 border-proficient/20"
                      : status === "incorrect"
                        ? "bg-needs-focus/8 border-needs-focus/20"
                        : userAnswers[questionIndex] === option
                          ? "bg-evidence/10 border-evidence/20"
                          : "bg-background hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem
                    value={option}
                    id={`q${questionIndex}-${option}`}
                  />
                  <Label
                    htmlFor={`q${questionIndex}-${option}`}
                    className="flex-1 cursor-pointer text-base"
                  >
                    {option}
                  </Label>
                  {isSubmitted && showAnswers ? (
                    <div className="ml-2">
                      {status === "correct" ? (
                        <CheckCircle className="size-5 text-proficient" />
                      ) : null}
                      {status === "incorrect" ? (
                        <XCircle className="size-5 text-needs-focus" />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </RadioGroup>

          {hints[questionIndex]?.text && mode === "taking" && !isSubmitted ? (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-semibold text-amber-900 mb-1 flex items-center gap-2 text-sm">
                <Info className="size-4" />
                Hint
              </h4>
              <p className="text-amber-800 text-sm">{hints[questionIndex].text}</p>
            </div>
          ) : null}

          {isSubmitted && showAnswers && question.explanation ? (
            <div className="mt-6 p-4 bg-evidence/10 border border-evidence/20 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <AlertCircle className="size-4" />
                Explanation
              </h4>
              <p className="text-blue-800">{question.explanation}</p>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="[&>button:last-child]:hidden w-full min-w-[80vw] max-w-none h-full flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between py-5 px-7 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-ink" />
              <div>
                <h1 className="text-lg font-bold">{assessment?.title ?? "Assessment"}</h1>
                <p className="text-sm text-muted-foreground">
                  {courseTitle ?? "Course Assessment"}
                </p>
              </div>
            </div>

            {mode !== "taking" ? (
              <Badge variant="outline" className="ml-4">
                Review Mode
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-4">
            {mode === "taking" && !isSubmitted && assessment?.duration ? (
              <div className="flex items-center gap-2 text-sm">
                <Clock
                  className={`size-4 ${
                    timeRemaining < 300 ? "text-red-500" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`font-mono ${
                    timeRemaining < 300 ? "text-red-500 font-bold" : ""
                  }`}
                >
                  {formatTime(Math.max(timeRemaining, 0))}
                </span>
              </div>
            ) : null}

            {mode === "taking" && !isSubmitted ? (
              <span className="text-xs text-muted-foreground">
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                    ? "Saved"
                    : ""}
              </span>
            ) : null}

            {mode === "review-without-answers" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnswers(!showAnswers)}
                className="gap-2"
              >
                {showAnswers ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {showAnswers ? "Hide Answers" : "Show Answers"}
              </Button>
            ) : null}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-4" />
                  Exit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Exit Assessment</AlertDialogTitle>
                  <AlertDialogDescription>
                    {mode === "taking" && !isSubmitted
                      ? "Are you sure you want to exit? Unsubmitted answers in this session will be lost."
                      : "Are you sure you want to exit the review?"}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => setOpen(false)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Exit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {mode === "taking" && !showAllQuestions ? (
          <div className="px-6 py-4 border-b bg-background/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Question {Math.min(currentQuestion + 1, resolvedQuestions.length)} of{" "}
                {resolvedQuestions.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {answeredCount} / {resolvedQuestions.length} answered
              </span>
            </div>
            <Progress
              value={resolvedQuestions.length === 0 ? 0 : ((currentQuestion + 1) / resolvedQuestions.length) * 100}
              className="h-2"
            />
          </div>
        ) : null}

        {error ? (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Assessment Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {mode === "taking" && resumedDraft && !isSubmitted ? (
          <div className="px-6 pt-4">
            <Alert>
              <Info className="size-4" />
              <AlertTitle>Resumed Attempt</AlertTitle>
              <AlertDescription>
                Your unfinished attempt was restored and will continue autosaving while you work.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="flex flex-1 min-h-0">
          {mode === "taking" && !showAllQuestions ? (
            <div className="w-48 border-r bg-background/50 p-4 overflow-y-auto">
              <h3 className="text-sm font-semibold mb-3">Questions</h3>
              <div className="grid grid-cols-5 gap-1">
                {resolvedQuestions.map((_, index) => {
                  const status = getQuestionStatus(index);
                  return (
                    <Button
                      key={index}
                      variant={currentQuestion === index ? "default" : "ghost"}
                      size="sm"
                      className={`relative h-8 w-8 p-0 text-xs ${
                        currentQuestion === index
                          ? ""
                          : status === "correct"
                            ? "text-proficient hover:text-proficient"
                            : status === "incorrect"
                              ? "text-needs-focus hover:text-needs-focus"
                              : status === "answered"
                                ? "text-evidence hover:text-blue-700"
                                : "text-muted-foreground"
                      }`}
                      onClick={() => setCurrentQuestion(index)}
                    >
                      {index + 1}
                      {flaggedQuestions.has(index) ? (
                        <Flag className="absolute -top-1 -right-1 size-2 text-orange-500 fill-orange-500" />
                      ) : null}
                      {isSubmitted ? (
                        <div
                          className={`absolute -bottom-1 -right-1 size-2 rounded-full ${
                            status === "correct"
                              ? "bg-proficient/100"
                              : status === "incorrect"
                                ? "bg-needs-focus/80"
                                : "bg-muted-foreground/50"
                          }`}
                        />
                      ) : null}
                    </Button>
                  );
                })}
              </div>

              {flaggedQuestions.size > 0 ? (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Flagged Questions ({flaggedQuestions.size})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(flaggedQuestions).map((questionIndex) => (
                      <Button
                        key={questionIndex}
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() => setCurrentQuestion(questionIndex)}
                      >
                        {questionIndex + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-6 overflow-y-auto">
              {isSubmitted && aiReview && aiReview.length > 0 ? (
                <div className="max-w-5xl mx-auto mb-8 mt-5">
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <Brain className="size-4 text-ink" />
                    AI Review — Wrong Answers ({aiReview.length})
                  </h3>
                  <div className="space-y-4">
                    {aiReview.map((item, i) => (
                      <AIReviewCard key={i} item={item} />
                    ))}
                  </div>
                </div>
              ) : null}

            {loading ? (
                <div className="max-w-3xl mx-auto py-20 text-center text-muted-foreground">
                  Loading assessment...
                </div>
              ) : showAllQuestions ? (
                <div className="max-w-5xl mx-auto space-y-12 mt-5">
                  {resolvedQuestions.map((_, index) => (
                    <SingleQuestionView key={index} questionIndex={index} />
                  ))}
                </div>
              ) : (
                <div className="max-w-5xl ml-5">
                  <SingleQuestionView questionIndex={currentQuestion} />
                </div>
              )}
            </div>

            <div className="border-t bg-background/95 backdrop-blur-sm p-4">
              <div className="max-w-5xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {!showAllQuestions ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                        disabled={currentQuestion === 0}
                        className="gap-2"
                      >
                        <ChevronLeft className="size-4" />
                        Previous
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentQuestion(
                            Math.min(resolvedQuestions.length - 1, currentQuestion + 1),
                          )
                        }
                        disabled={currentQuestion === resolvedQuestions.length - 1}
                        className="gap-2"
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </Button>
                    </>
                  ) : null}

                  {mode === "taking" && !showAllQuestions && !isSubmitted ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowAllQuestions(true)}
                      className="gap-2"
                    >
                      <FileText className="size-4" />
                      View All Questions
                    </Button>
                  ) : null}

                  {showAllQuestions && mode === "taking" && !isSubmitted ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowAllQuestions(false)}
                      className="gap-2"
                    >
                      <Eye className="size-4" />
                      Question by Question
                    </Button>
                  ) : null}

                  {isSubmitted && mode === "taking" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setOpen(false)}
                    >
                      <RotateCcw className="size-4" />
                      Back to Assessments
                    </Button>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  {isSubmitted ? (
                    <div className="flex gap-5 items-center flex-wrap">
                      <div className="mr-4 flex gap-2 items-center">
                        <div className="text-sm text-muted-foreground">Your Score</div>
                        <div
                          className={`text-lg font-bold ${
                            score >= 70 ? "text-proficient" : "text-needs-focus"
                          }`}
                        >
                          {score}%
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">
                        {answeredCount} / {resolvedQuestions.length} questions answered
                      </div>
                      {mode === "taking" && submittedAttempt && submittedAttempt.correctAnswers < submittedAttempt.totalQuestions ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={aiReviewLoading}
                          onClick={() => void handleReviewWithAI()}
                        >
                          <Brain className="size-4" />
                          {aiReviewLoading ? "Generating..." : aiReview ? "Refresh AI Review" : "Review Mistakes with AI"}
                        </Button>
                      ) : null}
                      {aiReviewError ? (
                        <span className="text-xs text-red-500">{aiReviewError}</span>
                      ) : null}
                    </div>
                  ) : null}

                  {mode === "taking" && !isSubmitted ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="gap-2" disabled={loading || resolvedQuestions.length === 0}>
                          <FileText className="size-4" />
                          Submit Assessment ({answeredCount}/{resolvedQuestions.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Submit Assessment</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div>
                              {unansweredCount > 0 ? (
                                <>
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="size-4 text-amber-500" />
                                    <span className="font-medium">Incomplete Assessment</span>
                                  </div>
                                  <p>
                                    You have {unansweredCount} unanswered question
                                    {unansweredCount !== 1 ? "s" : ""}. These will be marked
                                    as incorrect. Are you sure you want to submit?
                                  </p>
                                </>
                              ) : (
                                "Are you sure you want to submit your assessment? You won't be able to change your answers after submission."
                              )}
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              void handleSubmit();
                            }}
                            className={
                              unansweredCount > 0 ? "bg-amber-600 hover:bg-amber-700" : ""
                            }
                          >
                            Submit Assessment
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
