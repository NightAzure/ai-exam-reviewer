"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuestionBankQuestion } from "./question-bank-dialog";

interface Question {
  id: string;
  text: string;
  type: "multiple-choice";
  options: string[];
  correctAnswer?: string;
  explanation?: string;
  subject?: string;
}

interface AssessmentData {
  title: string;
  description: string;
  duration?: number;
  questions: Question[];
  questionMode?: "manual" | "random";
  randomSubjectSelections?: { subject: string; count: number }[];
}

interface AssessmentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentData?: AssessmentData;
  questionBankQuestions?: QuestionBankQuestion[];
}

export function AssessmentPreviewDialog({
  open,
  onOpenChange,
  assessmentData,
  questionBankQuestions = [],
}: AssessmentPreviewDialogProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const previewQuestions = useMemo(() => {
    if (!assessmentData) return [];

    const getSeededQuestionOrder = (subject: string, questionId: string, index: number) => {
      const seedSource = `${subject}-${questionId}-${refreshKey}-${index}`;
      let hash = 0;

      for (let position = 0; position < seedSource.length; position += 1) {
        hash = (hash * 31 + seedSource.charCodeAt(position)) >>> 0;
      }

      return hash;
    };

    if (
      assessmentData.questionMode === "random" &&
      assessmentData.randomSubjectSelections
    ) {
      const generatedQuestions: Question[] = [];

      assessmentData.randomSubjectSelections.forEach((selection) => {
        const subjectQuestions = questionBankQuestions.filter(
          (question) =>
            question.subject === selection.subject && question.isComplete,
        );

        const shuffled = [...subjectQuestions].sort(
          (left, right) =>
            getSeededQuestionOrder(selection.subject, left.id, 0) -
            getSeededQuestionOrder(selection.subject, right.id, 1),
        );
        const selected = shuffled.slice(0, selection.count);

        selected.forEach((question, index) => {
          generatedQuestions.push({
            id: `preview-${selection.subject}-${question.id}-${refreshKey}-${index}`,
            text: question.text,
            type: question.type,
            options: question.options || [],
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            subject: question.subject,
          });
        });
      });

      return generatedQuestions;
    }

    return assessmentData.questions || [];
  }, [assessmentData, questionBankQuestions, refreshKey]);

  const currentQuestion = previewQuestions[currentQuestionIndex];
  const questionCount = previewQuestions.length;

  const randomRuleSummary = useMemo(() => {
    if (
      assessmentData?.questionMode !== "random" ||
      !assessmentData.randomSubjectSelections?.length
    ) {
      return [];
    }

    return assessmentData.randomSubjectSelections
      .filter((selection) => selection.count > 0)
      .map((selection) => ({
        ...selection,
        available: questionBankQuestions.filter(
          (question) =>
            question.subject === selection.subject && question.isComplete,
        ).length,
      }));
  }, [assessmentData, questionBankQuestions]);

  const regenerateRandomSet = () => {
    setRefreshKey((current) => current + 1);
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  if (!assessmentData || !currentQuestion) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="w-[90vw]! sm:max-w-5xl! h-[80vh] max-w-none! overflow-hidden p-0"
        >
          <DialogHeader className="border-b px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="size-5" />
                Assessment Preview
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex h-full items-center justify-center bg-muted/10 p-8">
            <div className="max-w-md rounded-xl border border-dashed bg-background px-8 py-10 text-center">
              <AlertCircle className="mx-auto mb-4 size-10 text-muted-foreground" />
              <p className="text-lg font-semibold">No previewable questions yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {assessmentData?.questionMode === "random"
                  ? "Configure random subject selections with enough complete question bank items."
                  : "Add complete questions before opening the preview."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[94vw]! sm:max-w-6xl! h-[88vh] max-w-none! overflow-hidden p-0"
      >
        <div className="flex h-full min-h-0 flex-col bg-background">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-admin-primary/20 bg-admin-primary/10 text-admin-primary"
                  >
                    Preview
                  </Badge>
                  <Badge variant="outline">
                    {assessmentData.questionMode === "random" ? "Random" : "Manual"}
                  </Badge>
                  {assessmentData.duration ? (
                    <Badge variant="outline">{assessmentData.duration} min</Badge>
                  ) : null}
                </div>
                <DialogTitle className="truncate text-xl">
                  {assessmentData.title || "Untitled Assessment"}
                </DialogTitle>
                {assessmentData.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {assessmentData.description}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {assessmentData.questionMode === "random" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateRandomSet}
                    className="gap-2"
                  >
                    <RefreshCw className="size-4" />
                    Regenerate
                  </Button>
                ) : null}
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4">
            {assessmentData.questionMode === "random" && randomRuleSummary.length > 0 ? (
              <div className="shrink-0 rounded-lg border bg-card px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Random Selection
                  </span>
                  {randomRuleSummary.map((rule) => (
                    <Badge key={rule.subject} variant="outline" className="bg-background">
                      {rule.subject}: {rule.count}/{rule.available}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="flex min-h-0 flex-col rounded-xl border bg-card">
                <div className="shrink-0 border-b px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Multiple Choice</Badge>
                    {currentQuestion.subject ? (
                      <Badge
                        variant="outline"
                        className="border-admin-primary/20 bg-admin-primary/10 text-admin-primary"
                      >
                        {currentQuestion.subject}
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold leading-7">
                    {currentQuestion.text}
                  </h3>
                </div>

                <div className="min-h-0 overflow-y-auto px-5 py-4">
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = answers[currentQuestion.id] === option;
                      const isCorrect = currentQuestion.correctAnswer === option;

                      return (
                        <button
                          key={`${currentQuestion.id}-${index}`}
                          type="button"
                          onClick={() =>
                            setAnswers((current) => ({
                              ...current,
                              [currentQuestion.id]: option,
                            }))
                          }
                          className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                            isSelected
                              ? "border-admin-primary bg-admin-primary/5"
                              : "border-border bg-background hover:border-admin-primary/30 hover:bg-muted/20"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                                isSelected
                                  ? "border-admin-primary bg-admin-primary text-white"
                                  : "border-border bg-muted text-muted-foreground"
                              }`}
                            >
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="flex-1 text-sm leading-6">{option}</span>
                            {isCorrect ? (
                              <Badge
                                variant="outline"
                                className="border-proficient/20 bg-proficient/10 text-proficient"
                              >
                                Correct
                              </Badge>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {currentQuestion.explanation ? (
                    <div className="mt-4 rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Explanation
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex min-h-0 flex-col rounded-xl border bg-card">
                <div className="shrink-0 border-b px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Questions
                  </p>
                </div>
                <div className="min-h-0 overflow-y-auto p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {previewQuestions.map((question, index) => {
                      const selected = currentQuestionIndex === index;
                      const answered = Boolean(answers[question.id]);

                      return (
                        <button
                          key={`${question.id}-${index}`}
                          type="button"
                          onClick={() => setCurrentQuestionIndex(index)}
                          className={`flex h-10 items-center justify-center rounded-lg border text-sm font-semibold transition ${
                            selected
                              ? "border-admin-primary bg-admin-primary text-white"
                              : answered
                                ? "border-admin-primary/30 bg-admin-primary/10 text-admin-primary"
                                : "border-border bg-background hover:border-admin-primary/40"
                          }`}
                        >
                          {answered && !selected ? (
                            <CheckCircle2 className="size-4" />
                          ) : (
                            index + 1
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentQuestionIndex((current) => Math.max(current - 1, 0))
                }
                disabled={currentQuestionIndex === 0}
                className="shrink-0"
              >
                <ChevronLeft className="mr-2 size-4" />
                Previous
              </Button>

              <div className="min-w-0 flex-1 text-center text-sm text-muted-foreground sm:flex-none">
                Question {currentQuestionIndex + 1} of {questionCount}
              </div>

              {currentQuestionIndex === questionCount - 1 ? (
                <Button onClick={() => onOpenChange(false)} className="shrink-0">
                  Close Preview
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    setCurrentQuestionIndex((current) =>
                      Math.min(current + 1, questionCount - 1),
                    )
                  }
                  className="shrink-0"
                >
                  Next
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
