export interface AssessmentReviewItem {
  question_id: number | null;
  question_text: string;
  student_answer: string;
  correct_answer: string;
  subject: string;
  topic_id: number | null;
  ai_explanation: string;
  concept_summary?: string;
}

export interface AssessmentReview {
  id: number;
  attempt_id: number;
  course_id: number;
  student_id: string;
  review_data: AssessmentReviewItem[];
  generated_at: string;
  model_version: string | null;
}
