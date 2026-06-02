// ==================== ANALYTICS TYPES ====================

export type CourseAnalytics = {
  averageProgress: number;
  evidenceCount: number;
  lastPracticedAt?: string | null;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  topicProgress: Array<{
    topicId: number;
    progress: number;
    evidenceCount: number;
    correctAnswers: number;
    confidence: "none" | "low" | "medium" | "high";
    lastPracticedAt?: string | null;
  }>;
};

// ==================== CORE TYPES ====================

// Topic with materials
export interface Topic {
  id: number;
  name: string;
  description?: string;
  progress: number; // percentage
  evidenceCount?: number;
  correctAnswers?: number;
  confidence?: "none" | "low" | "medium" | "high";
  lastPracticedAt?: string | null;
  materials?: CourseMaterial[];
  subtopics?: TopicSubtopic[];
}

export interface TopicSubtopic {
  id: number;
  topicId: number;
  courseId: number;
  name: string;
  description?: string;
  orderIndex: number;
}

// Course materials
export interface CourseMaterial {
  id: number;
  type: 'video' | 'document' | 'link' | 'quiz';
  title: string;
  url?: string;
  duration?: number; // in minutes
  completed?: boolean;
}

// Course notes
export interface CourseNote {
  id: number;
  title: string;
  content: string;
  preview?: string;
  topicId?: number;
  createdAt: string;
  updatedAt: string;
}

// Main Course type - single source of truth
export interface Course {
  id: number;
  code: string;
  title: string;
  description: string;
  thumbnail?: string;

  // Instructor info
  instructor: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };

  // Settings
  isActive: boolean;
  allowSelfEnrollment?: boolean;
  requireEnrollmentApproval?: boolean;
  startDate?: string; // ISO datetime
  endDate?: string; // ISO datetime
  enrollmentLimit?: number;

  // Content
  topics: Topic[];

  // Analytics & Stats
  stats: {
    totalStudents: number;
    proficient: number;
    needsReview: number;
    averageProgress: number;
  };

  // AI-generated insights
  insights: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// ==================== API REQUEST/RESPONSE TYPES ====================

export interface CreateCourseRequest {
  code: string;
  title: string;
  description: string;
  thumbnail?: string;
  instructor: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  enrollmentLimit?: number;
  topics?: Topic[];
}

export interface UpdateCourseRequest {
  id: number;
  code?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  instructor?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  enrollmentLimit?: number;
  topics?: Topic[];
  insights?: {
    strengths?: string[];
    weaknesses?: string[];
    suggestions?: string[];
  };
}

export interface CourseResponse {
  course: Course;
  message: string;
}

export interface CourseListResponse {
  courses: Course[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== LEGACY TYPES (for backward compatibility) ====================

export type LegacyCourse = {
  id: string;
  code: string;
  thumbnail: string;
  name: string;
  instructor: string;
  progress: number;
  stats: {
    proficient: number;
    needsReview: number;
  };
  disabled?: boolean;
};

export type Assessment = {
  id: number;
  title: string;
  score: number | null;
  duration?: number;
  questions?: number;
  attempts?: number;
  maxAttempts?: number;
  passingScore?: number;
  topics?: string[];
  course?: string;
  date: string;
  feedback: string | null;
  taken: boolean;
  isEnabled?: boolean;
  releaseDate?: string;
  deadline?: string;
};

export type Note = {
  id: number;
  title: string;
  createdAt: string;
  preview: string;
};

export type DetailedCourse = {
  id: number;
  title: string;
  description: string;
  overallProgress: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  topics: Topic[];
  assessments: Assessment[];
  notes: Note[];
};
