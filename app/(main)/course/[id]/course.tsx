"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCourseStore } from "@/stores/course-store";
import { useCourseInit } from "@/hooks/use-course-init";
import CourseHeader from "./course-header";
import CourseTracker from "./course-tracker";
import { CourseAICTA } from "./course-cards";
import CourseAssessment from "./course-assessments";
import CourseNotes from "./course-notes";
import TopicDetailSheet from "./topic-detail-sheet";
import QuickPracticeSheet from "./quick-practice-sheet";
import DiagnosticSheet from "./diagnostic-sheet";
import FlashcardSheet from "@/components/flashcard-sheet";
import { useCourseAnalytics } from "@/hooks/use-course-analytics";
import CoursePageSkeleton from "./course-page-skeleton";
import type { Topic } from "@/types/course";
import { getTopicMasteryForTopic } from "@/lib/topic-mastery";

interface CourseContentPageProps {
  id: number;
}

export default function CourseContentPage({ id }: CourseContentPageProps) {
  // Initialize course store
  useCourseInit(id);

  // Get course from store
  const course = useCourseStore((state) => state.getCourse(id));
  const { analytics } = useCourseAnalytics(id);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sheet / tab state
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [practiceTopicId, setPracticeTopicId] = useState<number | null>(null);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const activeTab = searchParams.get("tab") === "notes" ? "notes" : "assessments";

  const setActiveTab = (tab: "assessments" | "notes") => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "assessments") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handlePractice = (topic: Topic | null) => {
    if (!topic) return;
    setPracticeTopicId(topic.id);
    setSelectedTopicId(null);
  };

  if (!course) {
    return <CoursePageSkeleton />;
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
  const sortedByProgress = [...normalizedCourse.topics].sort((left, right) => {
    const leftEvidence = left.evidenceCount ?? 0;
    const rightEvidence = right.evidenceCount ?? 0;
    if (leftEvidence === 0 && rightEvidence !== 0) return 1;
    if (rightEvidence === 0 && leftEvidence !== 0) return -1;
    return left.progress - right.progress;
  });
  const weakestTopic = sortedByProgress[0] ?? null;

  // Show diagnostic CTA when analytics have loaded but no topic-level signal exists yet.
  // A 0% average can also mean the student answered baseline questions incorrectly, so
  // do not use the average alone as proof that a baseline is missing.
  const hasAnalyticsSignal =
    (analytics?.strengths.length ?? 0) > 0 ||
    (analytics?.weaknesses.length ?? 0) > 0 ||
    (analytics?.topicProgress.some((entry) => entry.evidenceCount > 0) ?? false) ||
    normalizedCourse.topics.some((topic) => (topic.evidenceCount ?? 0) > 0);
  const isDiagnosticNeeded =
    normalizedCourse.topics.length > 0 &&
    !hasAnalyticsSignal;
  const assessedTopics = normalizedCourse.topics.filter((topic) => (topic.evidenceCount ?? 0) > 0);
  const studyState =
    assessedTopics.length === 0
      ? "Not Assessed · Take a diagnostic to build your baseline."
      : weakestTopic
        ? `${getTopicMasteryForTopic(weakestTopic).label} · Focus next on ${weakestTopic.name}.`
        : "Choose a topic to begin your focused review.";

  return (
    <div className="space-y-8">
      <CourseHeader course={normalizedCourse} studyState={studyState} />

      {/* AI CTA — full width */}
      <CourseAICTA
        course={normalizedCourse}
        weakestTopic={weakestTopic}
        onPractice={handlePractice}
        onDiagnostic={isDiagnosticNeeded ? () => setDiagnosticOpen(true) : undefined}
        onFlashcards={() => setFlashcardsOpen(true)}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.4fr)]">
        <CourseTracker
          course={normalizedCourse}
          onTopicClick={setSelectedTopicId}
          onPractice={handlePractice}
        />
        <section aria-labelledby="course-content-heading" className="min-w-0">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-oxblood">
              Study Materials
            </p>
            <h2
              id="course-content-heading"
              className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[-0.025em] text-ink sm:text-3xl"
            >
              Assessments & Notes
            </h2>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "assessments" | "notes")}
            className="w-full"
          >
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl border border-ink/10 bg-ink/[0.05] p-1">
              <TabsTrigger
                value="assessments"
                className="rounded-lg py-2.5 text-sm font-semibold text-ink transition-[color,background-color,box-shadow] duration-150 motion-reduce:transition-none data-[state=active]:bg-oxblood data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Assessments
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-lg py-2.5 text-sm font-semibold text-ink transition-[color,background-color,box-shadow] duration-150 motion-reduce:transition-none data-[state=active]:bg-oxblood data-[state=active]:text-white data-[state=active]:shadow-sm"
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
        </section>
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
