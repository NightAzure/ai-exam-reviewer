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

export interface Topic {
  id: number;
  name: string;
  description?: string;
  progress: number;
  evidenceCount?: number;
  correctAnswers?: number;
  confidence?: "none" | "low" | "medium" | "high";
  lastPracticedAt?: string | null;
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

export interface CourseNote {
  id: number;
  title: string;
  content: string;
  preview?: string;
  topicId?: number;
  createdAt: string;
  updatedAt: string;
}

/** Supabase row shape for course list/card views (snake_case). */
export interface CourseRecord {
  id: number;
  code: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  instructor: {
    id: number;
    first_name: string;
    second_name: string;
  };
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  enrollment_limit?: number;
  allow_self_enrollment?: boolean;
  require_enrollment_approval?: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

/** UI model for course detail views (camelCase). */
export interface Course {
  id: number;
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
  isActive: boolean;
  allowSelfEnrollment?: boolean;
  requireEnrollmentApproval?: boolean;
  startDate?: string;
  endDate?: string;
  enrollmentLimit?: number;
  topics: Topic[];
  stats: {
    totalStudents: number;
    proficient: number;
    needsReview: number;
    averageProgress: number;
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

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
  notes: Note[];
};
