"use client";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCourseStore } from "@/stores/course-store";
import { useCourseInit } from "@/hooks/use-course-init";
import CourseHeader from "./course-header";
import CourseTracker from "./course-tracker";
import {
  CourseAICTA,
  CourseInsights,
} from "./course-cards";
import CourseAssessment from "./course-assessments";
import CourseNotes from "./course-notes";
import TopicDetailSheet from "./topic-detail-sheet";
import QuickPracticeSheet from "./quick-practice-sheet";
import DiagnosticSheet from "./diagnostic-sheet";
import FlashcardSheet from "@/components/flashcard-sheet";
import { useCourseAnalytics } from "@/hooks/use-course-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import type { Topic } from "@/types/course";

interface CourseContentPageProps {
  id: number;
}

export default function CourseContentPage({ id }: CourseContentPageProps) {
  // Initialize course store
  useCourseInit(id);

  // Get course from store
  const course = useCourseStore((state) => state.getCourse(id));
  const { analytics } = useCourseAnalytics(id);

  // Sheet / tab state
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [practiceTopicId, setPracticeTopicId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"assessments" | "notes">("assessments");
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);

  const handlePractice = (topic: Topic | null) => {
    if (!topic) return;
    setPracticeTopicId(topic.id);
    setSelectedTopicId(null);
  };

  // Handle loading/not found
  if (!course) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <Skeleton className="size-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-1/2 max-w-sm" />
          </div>
          <div className="hidden sm:block text-right space-y-1.5 shrink-0">
            <Skeleton className="h-4 w-28 ml-auto" />
            <Skeleton className="h-2 w-36 rounded-full" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
          {/* Left column */}
          <div className="space-y-5">
            {/* CourseTracker skeleton */}
            <div className="rounded-2xl border border-gray-200 bg-white/90 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-28" />
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
            {/* Insights card skeleton */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-[3px] bg-gray-100" />
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                <div className="p-4 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-3 w-full" />
                  ))}
                </div>
                <div className="p-4 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-3 w-full" />
                  ))}
                </div>
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* AI CTA skeleton */}
            <div className="rounded-2xl border border-gray-200 bg-white/90 shadow-sm p-5 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
            {/* Tabs skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const normalizedCourse = {
    ...course,
    topics:
      course.topics?.map((topic) => {
        const topicAnalytics = analytics?.topicProgress.find((entry) => entry.topicId === topic.id);
        return {
          ...topic,
          progress: topicAnalytics?.progress ?? topic.progress ?? 0,
          evidenceCount: topicAnalytics?.evidenceCount ?? topic.evidenceCount ?? 0,
          correctAnswers: topicAnalytics?.correctAnswers ?? topic.correctAnswers ?? 0,
          confidence: topicAnalytics?.confidence ?? topic.confidence ?? "none",
          lastPracticedAt: topicAnalytics?.lastPracticedAt ?? topic.lastPracticedAt ?? null,
        };
      }) ?? [],
    stats: course.stats ?? {
      totalStudents: 0,
      proficient: 0,
      needsReview: 0,
      averageProgress: 0,
    },
    insights: {
      strengths: analytics?.strengths ?? course.insights?.strengths ?? [],
      weaknesses: analytics?.weaknesses ?? course.insights?.weaknesses ?? [],
      suggestions: analytics?.suggestions ?? course.insights?.suggestions ?? [],
    },
  };

  normalizedCourse.stats = {
    ...normalizedCourse.stats,
    averageProgress: analytics?.averageProgress ?? normalizedCourse.stats.averageProgress ?? 0,
  };

  // Derived values for sheets and banner
  const selectedTopic = normalizedCourse.topics.find((t) => t.id === selectedTopicId) ?? null;
  const practiceTopic = normalizedCourse.topics.find((t) => t.id === practiceTopicId) ?? null;
  const sortedByProgress = [...normalizedCourse.topics].sort((a, b) => a.progress - b.progress);
  const weakestTopic = sortedByProgress[0] ?? null;

  // Show diagnostic CTA when analytics have loaded but no topic-level signal exists yet.
  // A 0% average can also mean the student answered baseline questions incorrectly, so
  // do not use the average alone as proof that a baseline is missing.
  const hasAnalyticsSignal =
    (analytics?.strengths.length ?? 0) > 0 ||
    (analytics?.weaknesses.length ?? 0) > 0 ||
    (analytics?.topicProgress.some((entry) => entry.evidenceCount > 0) ?? false);
  const isDiagnosticNeeded =
    normalizedCourse.topics.length > 0 &&
    analytics !== undefined &&
    !hasAnalyticsSignal;

  return (
    <div className="space-y-8">
      <CourseHeader course={normalizedCourse} />

      {/* AI CTA — full width */}
      <CourseAICTA
        course={normalizedCourse}
        weakestTopic={weakestTopic}
        onPractice={handlePractice}
        onNotesTab={() => setActiveTab("notes")}
        onDiagnostic={isDiagnosticNeeded ? () => setDiagnosticOpen(true) : undefined}
        onFlashcards={() => setFlashcardsOpen(true)}
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
        {/* Left Column */}
        <div className="space-y-5">
          <CourseTracker
            course={normalizedCourse}
            onTopicClick={setSelectedTopicId}
            onPractice={handlePractice}
            onNotesTab={() => setActiveTab("notes")}
          />
          <CourseInsights course={normalizedCourse} />
        </div>
        {/* Right Column */}
        <div className="space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "assessments" | "notes")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full mb-5 rounded-xl bg-gray-100 p-1 h-auto">
              <TabsTrigger
                value="assessments"
                className="rounded-lg py-2.5 text-sm font-medium text-gray-500 transition-all duration-150
                  data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                Assessments
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-lg py-2.5 text-sm font-medium text-gray-500 transition-all duration-150
                  data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                Notes
              </TabsTrigger>
            </TabsList>
            <TabsContent value="assessments">
              <CourseAssessment course={normalizedCourse} />
            </TabsContent>
            <TabsContent value="notes">
              <CourseNotes course={normalizedCourse} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Topic Detail Sheet */}
      <TopicDetailSheet
        open={selectedTopicId !== null}
        onOpenChange={(v) => { if (!v) setSelectedTopicId(null); }}
        topic={selectedTopic}
        courseId={id}
        onPractice={handlePractice}
        onNotesTab={() => { setActiveTab("notes"); setSelectedTopicId(null); }}
        strengths={normalizedCourse.insights.strengths}
        weaknesses={normalizedCourse.insights.weaknesses}
      />

      {/* Quick Practice Sheet */}
      <QuickPracticeSheet
        open={practiceTopicId !== null}
        onOpenChange={(v) => { if (!v) setPracticeTopicId(null); }}
        topic={practiceTopic}
        courseId={id}
      />

      {/* Flashcard Sheet */}
      <FlashcardSheet
        open={flashcardsOpen}
        onOpenChange={setFlashcardsOpen}
        courseId={id}
      />

      {/* Diagnostic Sheet */}
      <DiagnosticSheet
        open={diagnosticOpen}
        onOpenChange={setDiagnosticOpen}
        courseId={id}
        topics={normalizedCourse.topics}
      />
    </div>
  );
}
