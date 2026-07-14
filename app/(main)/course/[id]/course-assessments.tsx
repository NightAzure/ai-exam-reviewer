"use client";

import { useEffect, useMemo, useState } from "react";
import AssessmentPreviewSheet from "@/components/assessment/assessment-preview";
import AssessmentSheet from "@/components/assessment/assessment-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { ClipboardList, Clock, Hash, Trophy } from "lucide-react";
import { useAssessmentInit } from "@/hooks/use-assessment-init";
import { useAssessmentStore } from "@/stores/assessment-store";
import { loadAssessmentAttemptSummariesForCourse } from "@/utils/supabase/assessment-attempts";
import type {
  AssessmentAttemptSummary,
  AssessmentFull,
} from "@/types/assessment";
import type { Course } from "@/types/course";

interface CourseProps {
  course: Course;
}

type AssessmentSheetMode =
  | "taking"
  | "review-with-answers"
  | "review-without-answers";

export default function CourseAssessment({ course }: CourseProps) {
  useAssessmentInit(course.id);

  const assessmentsMap = useAssessmentStore((state) => state.assessments);
  const assessmentsByCourse = useAssessmentStore((state) => state.assessmentsByCourse);

  const assessments = useMemo(() => {
    const assessmentIds = assessmentsByCourse.get(course.id) || [];
    return assessmentIds
      .map((id) => assessmentsMap.get(id))
      .filter(
        (assessment): assessment is AssessmentFull =>
          assessment !== undefined && assessment.title !== "__diagnostic__",
      );
  }, [assessmentsMap, assessmentsByCourse, course.id]);

  const [openPreview, setOpenPreview] = useState(false);
  const [openAssessment, setOpenAssessment] = useState(false);
  const [sheetMode, setSheetMode] = useState<AssessmentSheetMode>("taking");
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentFull>();
  const [reviewAttemptId, setReviewAttemptId] = useState<number>();
  const [attemptsByAssessment, setAttemptsByAssessment] = useState<
    Map<number, AssessmentAttemptSummary[]>
  >(new Map());
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const loadAttempts = async () => {
      setAttemptsLoading(true);
      setAttemptsError(null);

      try {
        const attempts = await loadAssessmentAttemptSummariesForCourse(supabase, course.id);
        if (!cancelled) {
          setAttemptsByAssessment(attempts);
        }
      } catch (error) {
        if (!cancelled) {
          setAttemptsError(
            error instanceof Error
              ? error.message
              : "Failed to load your assessment attempts.",
          );
          setAttemptsByAssessment(new Map());
        }
      } finally {
        if (!cancelled) {
          setAttemptsLoading(false);
        }
      }
    };

    loadAttempts();

    return () => {
      cancelled = true;
    };
  }, [course.id]);

  const refreshAttempts = async () => {
    const supabase = createClient();
    try {
      const attempts = await loadAssessmentAttemptSummariesForCourse(supabase, course.id);
      setAttemptsByAssessment(attempts);
      setAttemptsError(null);
    } catch (error) {
      setAttemptsError(
        error instanceof Error ? error.message : "Failed to refresh attempts.",
      );
    }
  };

  const currentAttemptHistory = currentAssessment
    ? attemptsByAssessment.get(currentAssessment.id) ?? []
    : [];

  const canStartAssessment = (assessment: AssessmentFull, attempts: AssessmentAttemptSummary[]) => {
    const now = new Date();
    if (!assessment.isEnabled) return false;
    if (assessment.releaseDate && new Date(assessment.releaseDate) > now) return false;
    if (assessment.deadline && new Date(assessment.deadline) < now) return false;
    return attempts.length < assessment.maxAttempts;
  };

  return (
    <>
      <Card className="gap-0 rounded-2xl border-[#24334c]/10 bg-white py-0 shadow-sm">
        <CardHeader className="border-b border-[#24334c]/10 py-5">
          <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em] text-[#18243a]">
            <ClipboardList className="size-5 text-[#8e3039]" />
            Course Assessments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 py-5">
          {attemptsError ? (
            <div className="rounded-xl border border-[#a0363d]/20 bg-[#8e3039]/8 p-4 text-sm text-[#8e3039]">
              {attemptsError}
            </div>
          ) : null}

          {assessments.length === 0 ? (
            <div className="py-10 text-center text-[#647087]">
              <ClipboardList className="mx-auto mb-3 size-8 text-[#8e3039]/45" />
              <p className="font-semibold text-[#18243a]">No assessments available</p>
              <p className="mt-1 text-sm">Check back later for a new assessment from your instructor.</p>
            </div>
          ) : (
            assessments.map((assessment) => {
              const attempts = attemptsByAssessment.get(assessment.id) ?? [];
              const latestAttempt = attempts[0];
              const questionCount =
                assessment.questionMode === "manual"
                  ? assessment.questions.length
                  : assessment.randomSubjectSelections.reduce(
                      (sum, selection) => sum + selection.count,
                      0,
                    );
              const score = latestAttempt?.score;
              const scoreColor =
                score == null ? "" :
                score >= 75 ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                score >= 60 ? "border-amber-200 bg-amber-50 text-amber-800" :
                "border-[#a0363d]/20 bg-[#8e3039]/8 text-[#8e3039]";

              return (
                <div
                  onClick={() => {
                    setCurrentAssessment(assessment);
                    setOpenPreview(true);
                  }}
                  key={assessment.id}
                  className="group rounded-xl border border-[#24334c]/10 bg-white p-4 transition-[border-color,box-shadow] hover:border-[#24334c]/20 hover:shadow-sm"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      <p className="truncate font-semibold text-[#18243a]">
                        {assessment.title}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1 text-xs text-[#647087]">
                          <Clock className="w-3 h-3" />
                          {assessment.deadline
                            ? new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(assessment.deadline))
                            : "No deadline"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-[#647087]">
                          <Hash className="w-3 h-3" />
                          {questionCount} questions
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-[#647087]">
                          <Trophy className="w-3 h-3" />
                          {attempts.length}/{assessment.maxAttempts} attempts
                        </span>
                      </div>
                      {score != null ? (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreColor}`}>
                          Latest: {score}%
                        </span>
                      ) : attemptsLoading ? (
                        <span className="text-xs text-[#647087]">Loading…</span>
                      ) : (
                        <span className="text-xs text-[#647087]">Not yet taken</span>
                      )}
                    </div>
                    {latestAttempt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-11 shrink-0 rounded-xl border-[#24334c]/15 bg-white text-xs text-[#18243a] hover:bg-[#18243a]/[0.03]"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCurrentAssessment(assessment);
                          setOpenPreview(true);
                        }}
                      >
                        View Results
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-11 shrink-0 rounded-xl bg-[#18243a] text-xs text-white hover:bg-[#293752]"
                        disabled={!canStartAssessment(assessment, attempts)}
                        onClick={(event) => {
                          event.stopPropagation();
                          setCurrentAssessment(assessment);
                          setOpenPreview(true);
                        }}
                      >
                        Take Assessment
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <AssessmentPreviewSheet
        open={openPreview}
        setOpen={setOpenPreview}
        setOpenAssessment={setOpenAssessment}
        assessment={currentAssessment}
        attempts={currentAttemptHistory}
        onStart={() => {
          setSheetMode("taking");
          setReviewAttemptId(undefined);
        }}
        onViewAttempt={(attemptId) => {
          setSheetMode("review-with-answers");
          setReviewAttemptId(attemptId);
        }}
      />

      <AssessmentSheet
        open={openAssessment}
        setOpen={setOpenAssessment}
        mode={sheetMode}
        assessment={currentAssessment}
        courseTitle={course.title}
        reviewAttemptId={reviewAttemptId}
        onSubmitted={async () => {
          await refreshAttempts();
        }}
      />
    </>
  );
}
