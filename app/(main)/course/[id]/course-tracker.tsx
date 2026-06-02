"use client";

import { Target } from "lucide-react";
import { Course, Topic } from "@/types/course";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export function getMastery(progress: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (progress >= 90)
    return { label: "Mastered", color: "text-green-700", bg: "bg-green-50", border: "border-green-200" };
  if (progress >= 75)
    return { label: "Proficient", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" };
  if (progress >= 60)
    return { label: "Almost There", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" };
  if (progress >= 40)
    return { label: "Getting There", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" };
  return { label: "Needs Work", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" };
}

function getMasteryBarColor(progress: number): string {
  if (progress >= 90) return "bg-green-500";
  if (progress >= 75) return "bg-blue-500";
  if (progress >= 60) return "bg-yellow-500";
  if (progress >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function getConfidenceLabel(topic: Topic): string {
  if ((topic.evidenceCount ?? 0) === 0) return "Needs baseline";
  if (topic.confidence === "high") return "High confidence";
  if (topic.confidence === "medium") return "Medium confidence";
  return "Low confidence";
}

function formatLastPracticed(value?: string | null): string {
  if (!value) return "No attempts yet";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently practiced";
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return "Practiced today";
  if (days === 1) return "Practiced yesterday";
  return `Practiced ${days} days ago`;
}

interface CourseTrackerProps {
  course: Course;
  onTopicClick: (topicId: number) => void;
  onPractice: (topic: Topic) => void;
  onNotesTab: () => void;
}

export default function CourseTracker({
  course,
  onTopicClick,
  onPractice,
  onNotesTab,
}: CourseTrackerProps) {
  // Sort weakest first
  const topics = [...(course.topics ?? [])].sort((a, b) => a.progress - b.progress);

  return (
    <Card className="border gap-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-semibold m-0">Your Topics</CardTitle>
        </div>
        <span className="text-xs text-gray-500">Weakest first</span>
      </div>

      <CardContent className="space-y-3 p-0">
        {topics.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
            No topics available yet.
          </div>
        ) : (
          topics.map((topic) => {
            const mastery = getMastery(topic.progress);
            const barColor = getMasteryBarColor(topic.progress);
            const confidence = getConfidenceLabel(topic);
            const evidenceCount = topic.evidenceCount ?? 0;
            const correctAnswers = topic.correctAnswers ?? 0;

            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.32 }}
                className="p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
                onClick={() => onTopicClick(topic.id)}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{topic.name}</p>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${mastery.bg} ${mastery.color} ${mastery.border}`}
                      >
                        {mastery.label}
                      </span>
                    </div>
                    {topic.progress === 0 ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Take the diagnostic or try practice to create a baseline
                      </p>
                    ) : topic.progress < 75 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Try a quick practice session on this topic
                      </p>
                    )}
                    <p className="text-[11px] text-gray-500 mt-1">
                      {evidenceCount > 0
                        ? `${correctAnswers}/${evidenceCount} answers correct · ${formatLastPracticed(topic.lastPracticedAt)}`
                        : "No scored answers yet"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {confidence}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3" aria-hidden>
                  <div
                    className={`${barColor} h-full rounded-full`}
                    style={{
                      width: `${topic.progress}%`,
                      transition: "width 600ms cubic-bezier(.2,.9,.2,1)",
                    }}
                    role="progressbar"
                    aria-valuenow={topic.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${topic.name} progress ${topic.progress} percent`}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 h-7 text-xs"
                    onClick={() => onPractice(topic)}
                  >
                    Practice
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={onNotesTab}
                  >
                    Notes
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
