import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Quiz } from "@/types/quiz";

interface QuizCompletionProps {
  quiz: Quiz;
  selectedAnswers: Record<number, number>;
  currentQuestionIndex: number;
  onQuestionSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onRestart: () => void;
}

export function QuizCompletion({
  quiz,
  selectedAnswers,
  currentQuestionIndex,
  onQuestionSelect,
  onPrevious,
  onNext,
  onRestart,
}: QuizCompletionProps) {
  const answeredCount = Object.keys(selectedAnswers).length;
  const hasResults = answeredCount > 0;
  const score = quiz.questions.filter(
    (question) => selectedAnswers[question.id] === question.correctAnswer,
  ).length;
  const percentage = hasResults
    ? Math.round((score / quiz.questions.length) * 100)
    : null;
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isCurrentCorrect =
    selectedAnswers[currentQuestion.id] === currentQuestion.correctAnswer;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <section className="rounded-2xl border border-ink/10 bg-surface p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-oxblood">
            Results
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink text-pretty">
            {hasResults ? "Review Your Results" : "No Answers Recorded"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate">{quiz.title}</p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          {hasResults && percentage !== null ? (
            <>
              <div className="flex size-32 flex-col items-center justify-center rounded-full border border-ink/10 bg-canvas">
                <p className="font-[family-name:var(--font-display)] text-4xl tabular-nums text-ink">
                  {percentage}%
                </p>
                <p className="text-xs font-medium text-slate">Score</p>
              </div>
              <p className="text-base text-ink">
                You got{" "}
                <span className="font-semibold tabular-nums text-proficient">{score}</span>{" "}
                out of{" "}
                <span className="font-semibold tabular-nums">{quiz.questions.length}</span>{" "}
                questions correct.
              </p>
            </>
          ) : (
            <p className="max-w-md text-sm leading-6 text-slate">
              There is no scored attempt to show yet. Restart the quiz to generate
              evidence-backed results.
            </p>
          )}
        </div>

        {hasResults ? (
          <div className="mt-8 border-t border-ink/10 pt-8 text-left">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-ink">
              Review Your Answers
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {quiz.questions.map((question, index) => {
                const isCorrect =
                  selectedAnswers[question.id] === question.correctAnswer;
                const isViewing = index === currentQuestionIndex;

                return (
                  <Button
                    key={question.id}
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Question ${index + 1}, ${isCorrect ? "correct" : "incorrect"}`}
                    aria-current={isViewing ? "true" : undefined}
                    className={cn(
                      "size-11 min-h-11 min-w-11 rounded-xl tabular-nums",
                      isCorrect
                        ? "border-emerald-700/30 bg-emerald-700/10 text-emerald-950 hover:bg-emerald-700/15"
                        : "border-needs-focus/30 bg-needs-focus/8 text-[#7d252d] hover:bg-needs-focus/12",
                      isViewing && "ring-2 ring-oxblood/40 ring-offset-2 ring-offset-canvas",
                    )}
                    onClick={() => onQuestionSelect(index)}
                  >
                    {index + 1}
                  </Button>
                );
              })}
            </div>

            <article className="mt-6 rounded-2xl border border-ink/10 bg-canvas/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-ink">
                  Question{" "}
                  <span className="tabular-nums">
                    {currentQuestionIndex + 1}
                  </span>{" "}
                  of{" "}
                  <span className="tabular-nums">{quiz.questions.length}</span>
                </h3>
                <Badge variant={isCurrentCorrect ? "proficient" : "needs-focus"}>
                  {isCurrentCorrect ? (
                    <>
                      <CheckCircle aria-hidden="true" className="size-3" /> Correct
                    </>
                  ) : (
                    <>
                      <XCircle aria-hidden="true" className="size-3" /> Incorrect
                    </>
                  )}
                </Badge>
              </div>

              <p className="mt-4 text-base font-medium leading-7 text-ink">
                {currentQuestion.question}
              </p>

              <div className="mt-4 space-y-3">
                {currentQuestion.options.map((option, optionIndex) => {
                  const isSelected =
                    selectedAnswers[currentQuestion.id] === optionIndex;
                  const isCorrect = optionIndex === currentQuestion.correctAnswer;

                  return (
                    <div
                      key={optionIndex}
                      className={cn(
                        "rounded-xl border px-4 py-3.5",
                        isCorrect &&
                          "border-emerald-700/40 bg-emerald-700/10 text-emerald-950",
                        isSelected &&
                          !isCorrect &&
                          "border-needs-focus/40 bg-needs-focus/8 text-[#7d252d]",
                        !isSelected &&
                          !isCorrect &&
                          "border-ink/10 bg-surface/60 text-slate opacity-70",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                            isCorrect && "border-emerald-700 bg-emerald-700",
                            isSelected &&
                              !isCorrect &&
                              "border-needs-focus bg-needs-focus",
                            !isSelected &&
                              !isCorrect &&
                              "border-slate/50",
                          )}
                        >
                          {(isSelected || isCorrect) && (
                            <span className="size-2 rounded-full bg-white" />
                          )}
                        </span>
                        <span className="font-medium">{option}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {currentQuestion.explanation ? (
                <Alert className="mt-4 border-ink/10 bg-surface">
                  <HelpCircle className="size-4 text-evidence" />
                  <AlertDescription className="text-sm leading-6 text-ink">
                    <span className="font-semibold">Explanation: </span>
                    {currentQuestion.explanation}
                  </AlertDescription>
                </Alert>
              ) : null}
            </article>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Previous
        </Button>

        <Button onClick={onRestart}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Take Quiz Again
        </Button>

        <Button
          variant="outline"
          onClick={onNext}
          disabled={currentQuestionIndex === quiz.questions.length - 1}
        >
          Next
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}
