import { makeAssistantToolUI } from "@assistant-ui/react";
import { useState } from "react";
import { QuizHeader } from "@/components/quiz/QuizHeader";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { QuestionNavigation } from "@/components/quiz/QuestionNavigation";
import { QuizNavigation } from "@/components/quiz/QuizNavigation";
import { QuizCompletion } from "@/components/quiz/QuizCompletion";
import { LoadingState } from "@/components/quiz/LoadingState";
import { ErrorState } from "@/components/quiz/ErrorState";
import { QuizArgs, QuizResult } from "@/types/quiz";

type QuizToolRendererProps = {
  result?: QuizResult;
  status: {
    type: string;
    reason?: string;
  };
};

function QuizToolRenderer({ result, status }: QuizToolRendererProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizState, setQuizState] = useState<"taking" | "completed">("taking");

  if (status.type === "running") {
    return <LoadingState />;
  }

  if (status.type === "incomplete" && status.reason === "error") {
    return <ErrorState />;
  }

  if (!result || !result.success || !result.quiz) {
    return <ErrorState message={result?.message} />;
  }

  const quiz = result.quiz;
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isCurrentQuestionAnswered = currentQuestion.id in selectedAnswers;
  const answeredCount = Object.keys(selectedAnswers).length;

  const handleAnswerSelect = (optionIndex: number) => {
    if (quizState === "taking") {
      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: optionIndex,
      }));
    }
  };

  const handleNext = () => {
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
    if (isLastQuestion) {
      setQuizState("completed");
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((prev) => prev - 1);
  };

  const handleFinishQuiz = () => {
    setQuizState("completed");
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setQuizState("taking");
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  if (quizState === "completed") {
    return (
      <QuizCompletion
        quiz={quiz}
        selectedAnswers={selectedAnswers}
        currentQuestionIndex={currentQuestionIndex}
        onQuestionSelect={handleQuestionSelect}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <QuizHeader
        quiz={quiz}
        currentQuestionIndex={currentQuestionIndex}
        answeredCount={answeredCount}
      />

      <QuestionCard
        question={currentQuestion}
        selectedAnswer={selectedAnswers[currentQuestion.id]}
        onAnswerSelect={handleAnswerSelect}
      />

      <QuizNavigation
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={quiz.questions.length}
        isCurrentQuestionAnswered={isCurrentQuestionAnswered}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onFinishQuiz={handleFinishQuiz}
      />

      <QuestionNavigation
        questions={quiz.questions}
        currentQuestionIndex={currentQuestionIndex}
        selectedAnswers={selectedAnswers}
        onQuestionSelect={handleQuestionSelect}
      />
    </div>
  );
}

export const QuizToolUI = makeAssistantToolUI<QuizArgs, QuizResult>({
  toolName: "generateQuiz",
  render: ({ result, status }) => <QuizToolRenderer result={result} status={status} />,
});
