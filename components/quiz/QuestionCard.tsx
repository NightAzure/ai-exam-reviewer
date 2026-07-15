import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: {
    id: number | string;
    question: string;
    options: string[];
  };
  selectedAnswer?: number;
  onAnswerSelect: (optionIndex: number) => void;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  selectedAnswer,
  onAnswerSelect,
  disabled = false,
}: QuestionCardProps) {
  return (
    <section
      aria-labelledby={`question-${question.id}-title`}
      className="rounded-2xl border border-ink/10 bg-surface p-5 shadow-sm sm:p-6"
    >
      <h2
        id={`question-${question.id}-title`}
        className="font-[family-name:var(--font-display)] text-xl leading-snug tracking-tight text-ink sm:text-2xl"
      >
        {question.question}
      </h2>

      <div role="radiogroup" aria-labelledby={`question-${question.id}-title`} className="mt-5 space-y-3">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedAnswer === optionIndex;
          const optionId = `question-${question.id}-option-${optionIndex}`;

          return (
            <button
              key={optionIndex}
              type="button"
              role="radio"
              id={optionId}
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => !disabled && onAnswerSelect(optionIndex)}
              className={cn(
                "flex min-h-11 w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-[color,background-color,border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas motion-reduce:transition-none",
                disabled && "cursor-default opacity-60",
                isSelected
                  ? "border-ink bg-ink/[0.04] shadow-sm"
                  : "border-ink/10 bg-surface hover:border-ink/25 hover:bg-ink/[0.02]",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-[border-color,background-color] duration-150",
                  isSelected ? "border-ink bg-ink" : "border-slate",
                )}
              >
                {isSelected && <span className="size-2 rounded-full bg-white" />}
              </span>
              <span className="text-sm font-medium leading-6 text-ink sm:text-base">
                <span className="mr-2 tabular-nums text-slate">
                  {String.fromCharCode(65 + optionIndex)}.
                </span>
                {option}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
