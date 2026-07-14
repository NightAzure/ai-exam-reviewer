import type { Course } from "@/types/new_course";

export type CourseStudyStatus =
  | "not_assessed"
  | "needs_focus"
  | "building_confidence"
  | "proficient"
  | "ended";

export type SubjectMasteryRow = {
  course_id: number;
  subject: string;
  mastery_score: number | string;
  total_questions_seen: number;
  last_updated: string | null;
};

export type CourseStudySummary = {
  masteryScore: number | null;
  questionsAnswered: number;
  lastAssessedAt: string | null;
  weakestSubject: string | null;
  status: CourseStudyStatus;
};

export type StudentCourseSummary = Course & {
  study: CourseStudySummary;
};

function toScore(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
}

function isPast(date: string | undefined, now: Date): boolean {
  if (!date) return false;
  const time = new Date(date).getTime();
  return Number.isFinite(time) && time < now.getTime();
}

function hasStarted(date: string | undefined, now: Date): boolean {
  if (!date) return true;
  const time = new Date(date).getTime();
  return !Number.isFinite(time) || time <= now.getTime();
}

export function isCourseEnded(course: Course, now = new Date()): boolean {
  return !course.is_active || isPast(course.end_date, now);
}

export function isCourseAvailableForStudy(
  course: Course,
  now = new Date(),
): boolean {
  return !isCourseEnded(course, now) && hasStarted(course.start_date, now);
}

function latestDate(rows: SubjectMasteryRow[]): string | null {
  return rows.reduce<string | null>((latest, row) => {
    if (!row.last_updated) return latest;
    if (!latest || new Date(row.last_updated).getTime() > new Date(latest).getTime()) {
      return row.last_updated;
    }
    return latest;
  }, null);
}

function getStatus(
  course: Course,
  masteryScore: number | null,
  now: Date,
): CourseStudyStatus {
  if (isCourseEnded(course, now)) return "ended";
  if (masteryScore === null) return "not_assessed";
  if (masteryScore < 60) return "needs_focus";
  if (masteryScore < 75) return "building_confidence";
  return "proficient";
}

export function deriveStudentCourseSummaries(
  courses: Course[],
  masteryRows: SubjectMasteryRow[],
  now = new Date(),
): StudentCourseSummary[] {
  const masteriesByCourse = new Map<number, SubjectMasteryRow[]>();

  masteryRows.forEach((row) => {
    const rows = masteriesByCourse.get(row.course_id) ?? [];
    rows.push(row);
    masteriesByCourse.set(row.course_id, rows);
  });

  return courses.map((course) => {
    const rows = masteriesByCourse.get(course.id) ?? [];
    const rankedSubjects = [...rows].sort((left, right) => {
      const scoreDifference = toScore(left.mastery_score) - toScore(right.mastery_score);
      return scoreDifference || left.subject.localeCompare(right.subject);
    });
    const masteryScore =
      rows.length === 0
        ? null
        : Math.round(rows.reduce((sum, row) => sum + toScore(row.mastery_score), 0) / rows.length);

    return {
      ...course,
      study: {
        masteryScore,
        questionsAnswered: rows.reduce((sum, row) => sum + (row.total_questions_seen ?? 0), 0),
        lastAssessedAt: latestDate(rows),
        weakestSubject: rankedSubjects[0]?.subject ?? null,
        status: getStatus(course, masteryScore, now),
      },
    };
  });
}

function byTitle(left: StudentCourseSummary, right: StudentCourseSummary): number {
  return left.title.localeCompare(right.title);
}

function byOldestAssessment(
  left: StudentCourseSummary,
  right: StudentCourseSummary,
): number {
  const leftTime = left.study.lastAssessedAt
    ? new Date(left.study.lastAssessedAt).getTime()
    : Number.POSITIVE_INFINITY;
  const rightTime = right.study.lastAssessedAt
    ? new Date(right.study.lastAssessedAt).getTime()
    : Number.POSITIVE_INFINITY;
  return leftTime - rightTime || byTitle(left, right);
}

/**
 * Recommend a course without introducing a new planning model. Students with no
 * evidence are invited to establish a baseline; otherwise the weakest active
 * course wins, with the least recent assessment breaking a score tie.
 */
export function getRecommendedCourse(
  courses: StudentCourseSummary[],
  now = new Date(),
): StudentCourseSummary | null {
  const available = courses.filter((course) => isCourseAvailableForStudy(course, now));
  if (available.length === 0) return null;

  const hasAnyEvidence = available.some((course) => course.study.masteryScore !== null);
  if (!hasAnyEvidence) {
    return [...available].sort(byTitle)[0] ?? null;
  }

  return (
    [...available].sort((left, right) => {
      const scoreDifference =
        (left.study.masteryScore ?? Number.POSITIVE_INFINITY) -
        (right.study.masteryScore ?? Number.POSITIVE_INFINITY);
      return scoreDifference || byOldestAssessment(left, right);
    })[0] ?? null
  );
}
