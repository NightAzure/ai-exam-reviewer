export type CourseMemberRole = "student" | "instructor" | "ta";

export interface CourseMember {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  role: CourseMemberRole;
  joinedAt: string | null;
  lastActiveAt: string | null;
  assessmentsTaken: number;
  averageScore: number | null;
  membershipSource: "course_owner" | "course_staff" | "enrollment";
  isPrimaryInstructor: boolean;
}

export interface CourseMembersResponse {
  members: CourseMember[];
}
