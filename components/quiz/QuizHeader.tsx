import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { Quiz } from "@/types/quiz";

type QuizHeaderProps = {
  quiz: Quiz;
  currentQuestionIndex: number;
  answeredCount: number;
};

function difficultyLabel(difficulty: string) {
  const normalized = difficulty.toLowerCase();
  if (normalized === "easy") return { label: "Easy", variant: "proficient" as const };
  if (normalized === "hard") return { label: "Hard", variant: "needs-focus" as const };
  return { label: difficulty || "Standard", variant: "secondary" as const };
}

export function QuizHeader({
  quiz,
  currentQuestionIndex,
  answeredCount,
}: QuizHeaderProps) {
  const total = quiz.questions.length;
  const progressPercentage = ((currentQuestionIndex + 1) / total) * 100;
  const difficulty = difficultyLabel(quiz.difficulty);

  return (
    <header className="rounded-2xl border border-ink/10 bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-oxblood">
            Assessment
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl leading-tight tracking-tight text-ink sm:text-3xl text-pretty">
            {quiz.title}
          </h1>
          {quiz.description ? (
            <p className="max-w-2xl text-sm leading-6 text-slate">{quiz.description}</p>
          ) : null}
        </div>

        <div className="shrink-0 rounded-xl border border-ink/10 bg-canvas/60 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">
            Progress
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums text-ink">
            {currentQuestionIndex + 1}
            <span className="text-slate"> / {total}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Progress
          value={progressPercentage}
          aria-label="Quiz progress"
          aria-valuetext={`Question ${currentQuestionIndex + 1} of ${total}`}
          className="h-1.5"
        />
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate">
          <Badge variant={difficulty.variant} className="gap-1.5">
            <span aria-hidden="true">●</span>
            {difficulty.label}
          </Badge>
          <span className="tabular-nums">Time: {quiz.estimatedTime}</span>
          <span className="tabular-nums">
            Answered: {answeredCount}/{total}
          </span>
        </div>
      </div>
    </header>
  );
}
