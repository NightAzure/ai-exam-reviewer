"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  History,
  Play,
  RotateCcw,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import { Sheet, SheetContent } from "../ui/sheet";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import type {
  AssessmentAttemptSummary,
  AssessmentFull,
} from "@/types/assessment";

interface AssessmentPreviewProps {
  open: boolean;
  assessment: AssessmentFull | undefined;
  attempts: AssessmentAttemptSummary[];
  setOpen: (open: boolean) => void;
  setOpenAssessment: (open: boolean) => void;
  onStart: () => void;
  onViewAttempt: (attemptId: number) => void;
}

function CircularProgress({
  value = 0,
  size = 120,
  strokeWidth = 8,
  className = "",
}: {
  value?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 70) return "#eab308";
    return "#ef4444";
  };

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(value)}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: getColor(value) }}>
            {value}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentPreviewSheet({
  open,
  assessment,
  attempts,
  setOpen,
  setOpenAssessment,
  onStart,
  onViewAttempt,
}: AssessmentPreviewProps) {
  const [showPreviousAttempts, setShowPreviousAttempts] = useState(false);

  const latestAttempt = attempts[0];
  const totalQuestions = useMemo(() => {
    if (!assessment) return 0;
    return assessment.questionMode === "manual"
      ? assessment.questions.length
      : assessment.randomSubjectSelections.reduce((sum, selection) => sum + selection.count, 0);
  }, [assessment]);
  const topics = useMemo(() => {
    if (!assessment) return [];
    return assessment.questionMode === "manual"
      ? [...new Set(assessment.questions.map((question) => question.subject).filter(Boolean) as string[])]
      : assessment.randomSubjectSelections.map((selection) => selection.subject);
  }, [assessment]);

  const getAssessmentStatus = () => {
    if (!assessment) return "unknown";
    const now = new Date();
    const releaseDate = assessment.releaseDate ? new Date(assessment.releaseDate) : null;
    const deadline = assessment.deadline ? new Date(assessment.deadline) : null;

    if (!assessment.isEnabled) return "disabled";
    if (latestAttempt?.score != null && attempts.length >= assessment.maxAttempts) return "completed";
    if (latestAttempt?.score != null && attempts.length < assessment.maxAttempts) return "retry-available";
    if (releaseDate && releaseDate > now) return "upcoming";
    if (deadline && deadline < now) return "expired";
    return "available";
  };

  const status = getAssessmentStatus();

  const getStatusConfig = () => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50 border-green-200",
          badge: "Completed",
          badgeVariant: "default" as const,
        };
      case "retry-available":
        return {
          icon: RotateCcw,
          color: "text-blue-600",
          bgColor: "bg-blue-50 border-blue-200",
          badge: "Retry Available",
          badgeVariant: "secondary" as const,
        };
      case "upcoming":
        return {
          icon: Calendar,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50 border-yellow-200",
          badge: "Upcoming",
          badgeVariant: "outline" as const,
        };
      case "available":
        return {
          icon: Play,
          color: "text-blue-600",
          bgColor: "bg-blue-50 border-blue-200",
          badge: "Available",
          badgeVariant: "default" as const,
        };
      case "expired":
        return {
          icon: AlertCircle,
          color: "text-red-600",
          bgColor: "bg-red-50 border-red-200",
          badge: "Expired",
          badgeVariant: "destructive" as const,
        };
      case "disabled":
        return {
          icon: Clock,
          color: "text-gray-600",
          bgColor: "bg-gray-50 border-gray-200",
          badge: "Disabled",
          badgeVariant: "outline" as const,
        };
      default:
        return {
          icon: Clock,
          color: "text-gray-600",
          bgColor: "bg-gray-50 border-gray-200",
          badge: "Unknown",
          badgeVariant: "outline" as const,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  if (!assessment) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="[&>button:last-child]:hidden min-w-[90vw] sm:min-w-[80vw] md:min-w-[60vw] lg:min-w-[50vw] xl:min-w-[45vw] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between py-5 px-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`flex-shrink-0 p-2 rounded-lg border ${statusConfig.bgColor}`}>
              <StatusIcon className={`size-5 ${statusConfig.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-foreground truncate">{assessment.title}</h2>
                <Badge variant={statusConfig.badgeVariant} className="text-xs">
                  {statusConfig.badge}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="size-8 p-0">
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-card rounded-md p-3 border text-center">
                <Calendar className="size-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="text-sm font-semibold">
                  {assessment.deadline
                    ? new Date(assessment.deadline).toLocaleDateString()
                    : "No deadline"}
                </p>
              </div>

              {assessment.duration != null ? (
                <div className="bg-card rounded-md p-3 border text-center">
                  <Timer className="size-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-semibold">{assessment.duration} min</p>
                </div>
              ) : null}

              <div className="bg-card rounded-md p-3 border text-center">
                <FileText className="size-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Questions</p>
                <p className="text-sm font-semibold">{totalQuestions}</p>
              </div>

              <div className="bg-card rounded-md p-3 border text-center">
                <RotateCcw className="size-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Attempts Left</p>
                <p className="text-sm font-semibold">
                  {Math.max(assessment.maxAttempts - attempts.length, 0)}
                </p>
              </div>
            </div>

            <div className="bg-card rounded-md p-4 border border-dashed">
              <h3 className="text-base font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">
                {assessment.description || "No description provided."}
              </p>
            </div>

            {topics.length > 0 ? (
              <div className="bg-card rounded-md p-4 border">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="size-4" />
                  Topics Covered
                </h3>
                <div className="flex flex-wrap gap-1">
                  {topics.map((topic) => (
                    <Badge key={topic} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {latestAttempt?.score != null ? (
              <div className="bg-card rounded-md p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Trophy className="size-4 text-yellow-500" />
                    Latest Result
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreviousAttempts(!showPreviousAttempts)}
                    className="text-xs gap-1 h-6 px-2"
                  >
                    <History className="size-3" />
                    Attempt History
                    <ChevronRight
                      className={`size-3 transition-transform ${
                        showPreviousAttempts ? "rotate-90" : ""
                      }`}
                    />
                  </Button>
                </div>

                <div className="flex items-center gap-6">
                  <CircularProgress value={latestAttempt.score} size={80} strokeWidth={6} />

                  <div className="flex-1">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Submitted:</span>
                        <span className="font-medium">
                          {latestAttempt.submittedAt
                            ? new Date(latestAttempt.submittedAt).toLocaleString()
                            : "In progress"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Correct Answers:</span>
                        <span className="font-medium">
                          {latestAttempt.correctAnswers}/{latestAttempt.totalQuestions}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Status:</span>
                        <span
                          className={`font-medium ${
                            latestAttempt.score >= 70 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {latestAttempt.score >= 70 ? "Passed" : "Needs Review"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {showPreviousAttempts ? (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-3">
                      ATTEMPT HISTORY
                    </h4>
                    <div className="space-y-2">
                      {attempts.map((attempt) => (
                        <button
                          type="button"
                          key={attempt.id}
                          onClick={() => {
                            onViewAttempt(attempt.id);
                            setOpenAssessment(true);
                            setOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-2 bg-muted/30 rounded text-xs hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <div className="text-muted-foreground">Attempt {attempt.attemptNumber}</div>
                            <div>
                              {attempt.submittedAt
                                ? new Date(attempt.submittedAt).toLocaleDateString()
                                : "Not submitted"}
                            </div>
                            <div className="text-muted-foreground">
                              {attempt.timeSpentSeconds != null
                                ? `${Math.max(Math.round(attempt.timeSpentSeconds / 60), 1)} min`
                                : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
                                (attempt.score ?? 0) >= 70 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {attempt.score ?? 0}%
                            </span>
                            <Badge
                              variant={(attempt.score ?? 0) >= 70 ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {(attempt.score ?? 0) >= 70 ? "Passed" : "Needs Review"}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t bg-background/95 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Updated: {new Date().toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              {status === "available" || status === "retry-available" ? (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    onStart();
                    setOpenAssessment(true);
                    setOpen(false);
                  }}
                >
                  <Play className="size-3" />
                  {status === "retry-available" ? "Retry" : "Start"}
                </Button>
              ) : status === "upcoming" ? (
                <Button variant="outline" size="sm" disabled>
                  <Calendar className="size-3 mr-1" />
                  Available{" "}
                  {assessment.releaseDate
                    ? new Date(assessment.releaseDate).toLocaleDateString()
                    : "Soon"}
                </Button>
              ) : latestAttempt ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      onViewAttempt(latestAttempt.id);
                      setOpenAssessment(true);
                      setOpen(false);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <FileText className="size-3 mr-1" />
                    View Submission
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Unavailable
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
