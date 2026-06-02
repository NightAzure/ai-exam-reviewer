export interface Course {
  id: number;
  code: string; // unique
  title: string;
  description: string;
  thumbnail_url?: string;
  instructor:{
    id: number;
    first_name: string;
    second_name: string;
  }
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  enrollment_limit?: number;
  allow_self_enrollment?: boolean;
  require_enrollment_approval?: boolean;
  created_at: string;
  updated_at: string;
  created_by: string; // FK to users.id
}