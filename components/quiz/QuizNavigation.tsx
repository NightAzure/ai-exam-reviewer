import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface QuizNavigationProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  isCurrentQuestionAnswered: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onFinishQuiz: () => void;
}

export function QuizNavigation({
  currentQuestionIndex,
  totalQuestions,
  isCurrentQuestionAnswered,
  onPrevious,
  onNext,
  onFinishQuiz
}: QuizNavigationProps) {
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <div className="flex justify-between items-center">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentQuestionIndex === 0}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Previous
      </Button>
      
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onFinishQuiz}
        >
          Finish Quiz
        </Button>
        
        <Button
          onClick={onNext}
          disabled={!isCurrentQuestionAnswered}
        >
          {isLastQuestion ? 'Finish' : 'Next'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
