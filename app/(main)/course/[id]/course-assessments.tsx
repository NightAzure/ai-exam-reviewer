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
      <Card className="border border-gray-200 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.09)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.13)] transition bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-900">
            <ClipboardList className="w-4 h-4 text-gray-500" />
            Assessments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {attemptsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {attemptsError}
            </div>
          ) : null}

          {assessments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No assessments available</p>
              <p className="text-xs mt-1 opacity-70">Check back later for new assessments</p>
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
                score >= 80 ? "text-green-700 bg-green-50 border-green-200" :
                score >= 60 ? "text-yellow-700 bg-yellow-50 border-yellow-200" :
                "text-red-700 bg-red-50 border-red-200";

              return (
                <div
                  onClick={() => {
                    setCurrentAssessment(assessment);
                    setOpenPreview(true);
                  }}
                  key={assessment.id}
                  className="group border border-gray-100 rounded-xl p-4 hover:border-gray-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all bg-gray-50/60 cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 truncate">
                        {assessment.title}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {assessment.deadline
                            ? new Date(assessment.deadline).toLocaleDateString()
                            : "No deadline"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Hash className="w-3 h-3" />
                          {questionCount} questions
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Trophy className="w-3 h-3" />
                          {attempts.length}/{assessment.maxAttempts} attempts
                        </span>
                      </div>
                      {score != null ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${scoreColor}`}>
                          Latest: {score}%
                        </span>
                      ) : attemptsLoading ? (
                        <span className="text-xs italic text-gray-400">Loading...</span>
                      ) : (
                        <span className="text-xs italic text-gray-400">Not yet taken</span>
                      )}
                    </div>
                    {latestAttempt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs"
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
                        className="shrink-0 text-xs bg-gray-900 hover:bg-gray-700 text-white"
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
