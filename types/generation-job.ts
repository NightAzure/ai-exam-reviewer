export type GenerationJobStatus = "queued" | "running" | "done" | "failed";
export type GenerationJobType = "questions" | "notes";
export type CognitiveSkill = "recall" | "application" | "analysis" | "calculation";

export interface GenerationTarget {
  topic_id: number;
  topic_name: string;
  subtopic_id?: number | null;
  subtopic_name?: string | null;
  count: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  cognitive_skill?: CognitiveSkill;
  custom_instruction?: string;
}

export interface GeneratedQuestion {
  question: string;
  choices: Record<"A" | "B" | "C" | "D", string>;
  correct_answer: string;
  explanation: string;
  subject: string;
  topic: string;
  topic_id?: number | null;
  subtopic?: string | null;
  subtopic_id?: number | null;
  difficulty_level: number;
  cognitive_skill?: CognitiveSkill;
  generation_source?: "rag" | "baseline";
  rag_sources?: Array<{
    source: "question" | "document";
    id?: number;
    document_id?: number;
    similarity?: number;
    preview?: string;
  }>;
  duplicate_debug?: Array<{
    reason: string;
    similarity?: number;
    matched_question_id?: number;
    matched_question_preview?: string;
  }>;
}

export interface GenerationJob {
  id: number;
  course_id: number;
  created_by: string | null;
  status: GenerationJobStatus;
  job_type: GenerationJobType;
  input_params: {
    topics?: string[];
    targets?: GenerationTarget[];
    count_per_topic?: number;
    difficulty?: number;
  };
  result: GeneratedQuestion[] | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}
