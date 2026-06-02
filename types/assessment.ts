// Question types for assessments
export interface Question {
  id: string;
  text: string;
  type: "multiple-choice";
  options: string[];
  correctAnswer?: string;
  explanation?: string;
  subject?: string;
}

// Random question selection configuration
export interface RandomSubjectSelection {
  subject: string;
  count: number;
}

// Full assessment structure for backend
export interface AssessmentFull {
  id: number;
  courseId: number;
  title: string;
  description: string;
  duration?: number; // in minutes
  maxAttempts: number;
  randomizeQuestions: boolean;
  shuffleAnswers: boolean;
  isEnabled: boolean;
  releaseDate?: string; // ISO datetime
  deadline?: string; // ISO datetime
  questionMode: "manual" | "random";

  // For manual mode: actual questions
  questions: Question[];

  // For random mode: subject selection config
  randomSubjectSelections: RandomSubjectSelection[];

  allowHints: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // admin user id
}

// Assessment display structure (for lists)
export interface AssessmentDisplay {
  id: number;
  courseId: number;
  title: string;
  description: string;
  duration?: number;
  maxAttempts: number;
  isEnabled: boolean;
  releaseDate?: string;
  deadline?: string;
  questionMode: "manual" | "random";

  // Computed fields
  totalQuestions: number; // calculated from questions.length or sum of randomSubjectSelections
  subjects: string[]; // unique subjects from questions or randomSubjectSelections

  // Student stats (for admin view)
  stats?: {
    totalStudents: number;
    completedStudents: number;
    averageScore: number;
    completionRate: number;
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Student's assessment attempt
export interface AssessmentAttempt {
  id: number;
  assessmentId: number;
  studentId: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  timeSpentSeconds?: number;
  answers: AssessmentAttemptAnswer[];
  status: "in_progress" | "completed" | "abandoned";
}

export interface AssessmentAttemptAnswer {
  id: number;
  attemptId: number;
  questionId?: string;
  questionPosition: number;
  questionText: string;
  questionType: "multiple-choice";
  options: string[];
  selectedAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
  subject?: string;
  isCorrect: boolean;
  createdAt: string;
}

export interface AssessmentAttemptSummary {
  id: number;
  assessmentId: number;
  studentId: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  timeSpentSeconds?: number;
  status: "in_progress" | "completed" | "abandoned";
}

export interface ResolvedAssessmentQuestion extends Question {
  sourceQuestionId?: string;
  sourceQuestionTable?: "assessment_questions" | "question_bank";
  position: number;
}

// Backend API type?
export interface CreateAssessmentRequest {
  courseId: number;
  title: string;
  description: string;
  duration?: number;
  maxAttempts: number;
  randomizeQuestions: boolean;
  shuffleAnswers: boolean;
  isEnabled: boolean;
  releaseDate?: string;
  deadline?: string;
  questionMode: "manual" | "random";
  questions: Question[];
  randomSubjectSelections: RandomSubjectSelection[];
  allowHints: boolean;
}

export interface UpdateAssessmentRequest extends Partial<CreateAssessmentRequest> {
  id: number;
}

export interface AssessmentResponse {
  assessment: AssessmentFull;
  message: string;
}

export interface AssessmentListResponse {
  assessments: AssessmentDisplay[];
  total: number;
  page: number;
  pageSize: number;
}
