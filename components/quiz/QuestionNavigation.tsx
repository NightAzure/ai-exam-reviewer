import { Button } from "@/components/ui/button";
import { QuizQuestion } from "@/types/quiz";

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
  onQuestionSelect 
}: QuestionNavigationProps) {
  return (
    <div className="flex justify-center">
      <div className="flex gap-2">
        {questions.map((question, index) => {
          const isAnswered = question.id in selectedAnswers;
          const isCurrent = index === currentQuestionIndex;
          
          return (
            <Button
              key={index}
              variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
              size="sm"
              className={`w-10 h-10 p-0 ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              onClick={() => onQuestionSelect(index)}
            >
              {index + 1}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
