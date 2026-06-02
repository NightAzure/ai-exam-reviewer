export type QuizQuestion = {
  id: number;
  question: string;
  type: "multiple_choice";
  options: string[];
  correctAnswer: number;
  explanation: string;
};

export type Quiz = {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedTime: string;
  questions: QuizQuestion[];
};

export type QuizArgs = {
  quiz: Quiz;
};

export type QuizResult = {
  success: boolean;
  message: string;
  quizId?: string;
  quiz: Quiz;
};