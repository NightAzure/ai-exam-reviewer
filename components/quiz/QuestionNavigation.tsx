import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/types/quiz";

interface QuestionNavigationProps {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  selectedAnswers: Record<number, number>;
  onQuestionSelect: (index: number) => void;
}

export function QuestionNavigation({
  questions,
  currentQuestionIndex,
  selectedAnswers,
  onQuestionSelect,
}: QuestionNavigationProps) {
  return (
    <nav aria-label="Question navigation" className="flex justify-center">
      <div className="flex flex-wrap justify-center gap-2">
        {questions.map((question, index) => {
          const isAnswered = question.id in selectedAnswers;
          const isCurrent = index === currentQuestionIndex;

          return (
            <Button
              key={question.id}
              type="button"
              variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
              size="icon"
              aria-label={`Question ${index + 1}${isCurrent ? ", current" : ""}${isAnswered ? ", answered" : ", not answered"}`}
              aria-current={isCurrent ? "true" : undefined}
              className={cn(
                "size-11 min-h-11 min-w-11 rounded-xl tabular-nums",
                isCurrent && "ring-2 ring-oxblood/40 ring-offset-2 ring-offset-canvas",
                !isCurrent && isAnswered && "border-ink/20 bg-ink/[0.06]",
              )}
              onClick={() => onQuestionSelect(index)}
            >
              {index + 1}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
