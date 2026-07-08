"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Edit,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { createClient } from "@/utils/supabase/client";
import {
  archiveQuestionBankQuestion,
  createQuestionBankQuestion,
  fetchQuestionBankForAdminCourse,
  updateQuestionBankQuestion,
  type QuestionBankMutationInput,
} from "@/utils/supabase/question-bank";
import type { GeneratedQuestion } from "@/types/generation-job";
import type { CognitiveSkill, GenerationTarget } from "@/types/generation-job";

export interface QuestionBankQuestion {
  id: string;
  text: string;
  type: "multiple-choice";
  subject: string;
  topic?: string;
  /** Non-empty choices for display / add to assessment */
  options?: string[];
  /** Five slots A–E for editing (from DB columns) */
  choiceSlots?: string[];
  correctAnswer?: string;
  explanation?: string;
  difficultyLevel?: number;
  usedCount: number;
  isComplete: boolean;
}

interface QuestionBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  questions?: QuestionBankQuestion[];
  onQuestionsChange?: (questions: QuestionBankQuestion[]) => void;
  onSelectQuestions?: (questions: QuestionBankQuestion[]) => void;
}

const emptyDraft = (): QuestionBankMutationInput => ({
  text: "",
  type: "multiple-choice",
  subject: "",
  topic_id: null,
  options: ["", "", "", "", ""],
  correctAnswer: "",
  explanation: "",
  difficultyLevel: 3,
});

const difficultyInfo = (level: number): { label: string; className: string } => {
  if (level <= 2) return { label: "Easy", className: "bg-green-100 text-green-700" };
  if (level <= 3) return { label: "Medium", className: "bg-yellow-100 text-yellow-700" };
  return { label: "Hard", className: "bg-red-100 text-red-700" };
};

type CourseTopicOption = {
  id: number;
  name: string;
  subtopics?: Array<{ id: number; name: string }>;
};

type GenerationTargetDraft = {
  id: string;
  topicId: number | null;
  subtopicId: number | null;
  count: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  cognitiveSkill: CognitiveSkill;
  customInstruction: string;
};

const createGenerationTargetDraft = (topicId: number | null = null): GenerationTargetDraft => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  topicId,
  subtopicId: null,
  count: 3,
  difficulty: 3,
  cognitiveSkill: "application",
  customInstruction: "",
});

export function QuestionBankDialog({
  open,
  onOpenChange,
  courseId,
  questions = [],
  onQuestionsChange,
  onSelectQuestions,
}: QuestionBankDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  /** Local copy of Supabase rows so the list works even if parent `onQuestionsChange` is missing. */
  const [bankSnapshot, setBankSnapshot] = useState<QuestionBankQuestion[] | null>(null);
  const [activeTab, setActiveTab] = useState("browse");
  const [isSaving, setIsSaving] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuestionBankMutationInput>(emptyDraft());
  const [bankLoading, setBankLoading] = useState(false);
  const [bankLoadError, setBankLoadError] = useState<string | null>(null);
  const [courseTopics, setCourseTopics] = useState<CourseTopicOption[]>([]);
  const onQuestionsChangeRef = useRef(onQuestionsChange);
  onQuestionsChangeRef.current = onQuestionsChange;

  // ── Generate tab state ──────────────────────────────────────────────────────
  const [genTargets, setGenTargets] = useState<GenerationTargetDraft[]>([]);
  const [genJobId, setGenJobId] = useState<number | null>(null);
  const [genStatus, setGenStatus] = useState<"idle" | "submitting" | "polling" | "done" | "failed">("idle");
  const [genError, setGenError] = useState<string | null>(null);
  const [draftQuestions, setDraftQuestions] = useState<GeneratedQuestion[]>([]);
  const [approvedIndices, setApprovedIndices] = useState<Set<number>>(new Set());
  const [rejectedIndices, setRejectedIndices] = useState<Set<number>>(new Set());
  const [approvingIdx, setApprovingIdx] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (genStatus !== "polling" || genJobId === null) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/admin/course/${courseId}/question-bank/generate/${genJobId}`,
          { credentials: "include" },
        );
        const data = (await res.json()) as {
          status?: string;
          questions?: GeneratedQuestion[] | null;
          error?: string | null;
        };
        if (data.status === "done") {
          setDraftQuestions(data.questions ?? []);
          setGenStatus("done");
        } else if (data.status === "failed") {
          setGenError(data.error ?? "Generation failed");
          setGenStatus("failed");
        } else {
          pollRef.current = setTimeout(() => void poll(), 2000);
        }
      } catch {
        pollRef.current = setTimeout(() => void poll(), 3000);
      }
    };

    void poll();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [genStatus, genJobId, courseId]);

  const handleGenSubmit = async () => {
    const targets: GenerationTarget[] = genTargets
      .flatMap((target) => {
        const topic = courseTopics.find((item) => item.id === target.topicId);
        const subtopic = topic?.subtopics?.find((item) => item.id === target.subtopicId);
        if (!topic) return [];
        return [{
          topic_id: topic.id,
          topic_name: topic.name,
          subtopic_id: subtopic?.id ?? null,
          subtopic_name: subtopic?.name ?? null,
          count: target.count,
          difficulty: target.difficulty,
          cognitive_skill: target.cognitiveSkill,
          custom_instruction: target.customInstruction.trim() || undefined,
        }];
      });
    if (targets.length === 0) return;
    setGenStatus("submitting");
    setGenError(null);
    setDraftQuestions([]);
    setApprovedIndices(new Set());
    setRejectedIndices(new Set());

    try {
      const res = await fetch(`/api/admin/course/${courseId}/question-bank/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targets,
        }),
      });
      const data = (await res.json()) as {
        jobId?: number;
        message?: string;
        debug?: { workerUrl?: string; workerStatus?: number; workerMessage?: string };
      };
      if (!res.ok) {
        const debugDetails = data.debug?.workerUrl
          ? ` Tried worker URL: ${data.debug.workerUrl}${data.debug.workerStatus ? ` (${data.debug.workerStatus})` : ""}.`
          : "";
        throw new Error(`${data.message ?? "Failed to start generation"}${debugDetails}`);
      }
      setGenJobId(data.jobId ?? null);
      setGenStatus("polling");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to start generation");
      setGenStatus("failed");
    }
  };

  const handleApproveQuestion = async (index: number, q: GeneratedQuestion) => {
    setApprovingIdx(index);
    try {
      const supabase = createClient();
      const choiceValues = Object.values(q.choices);
      await createQuestionBankQuestion(supabase, courseId, {
        text: q.question,
        type: "multiple-choice",
        subject: q.subject,
        topic: q.topic,
        topic_id: q.topic_id ?? null,
        subtopic_id: q.subtopic_id ?? null,
        options: choiceValues,
        correctAnswer: q.choices[q.correct_answer as keyof typeof q.choices],
        explanation: q.explanation,
        difficultyLevel: q.difficulty_level,
        cognitive_skill: q.cognitive_skill ?? null,
        source: "ai_generated",
        ai_generation_job_id: genJobId,
      } as QuestionBankMutationInput);
      setApprovedIndices((prev) => new Set([...prev, index]));
    } catch (err) {
      console.error("Failed to approve question:", err);
    } finally {
      setApprovingIdx(null);
    }
  };

  const resetGenTab = () => {
    setGenStatus("idle");
    setGenJobId(null);
    setGenError(null);
    setDraftQuestions([]);
    setApprovedIndices(new Set());
    setRejectedIndices(new Set());
  };

  const sourceList = bankSnapshot ?? questions;

  useEffect(() => {
    if (!open) {
      setActiveTab("browse");
      setEditingQuestionId(null);
      setDraft(emptyDraft());
      setSelectedQuestions(new Set());
      setCurrentPage(1);
      setBankLoadError(null);
      setBankSnapshot(null);
      resetGenTab();
      setGenTargets([]);
      return;
    }

    let cancelled = false;
    setBankLoading(true);
    setBankLoadError(null);

    const supabase = createClient();

    (async () => {
      try {
        const [latest, topicsResult, subtopicsResult] = await Promise.all([
          fetchQuestionBankForAdminCourse(courseId),
          supabase
            .from("topics")
            .select("id, name")
            .eq("course_id", courseId)
            .order("order_index", { ascending: true }),
          supabase
            .from("topic_subtopics")
            .select("id, topic_id, name")
            .eq("course_id", courseId)
            .order("order_index", { ascending: true }),
        ]);
        if (!cancelled) {
          setBankSnapshot(latest);
          onQuestionsChangeRef.current?.(latest);
          const subtopicsByTopic = new Map<number, Array<{ id: number; name: string }>>();
          ((subtopicsResult.data ?? []) as Array<{ id: number; topic_id: number; name: string }>).forEach((subtopic) => {
            const current = subtopicsByTopic.get(subtopic.topic_id) ?? [];
            current.push({ id: subtopic.id, name: subtopic.name });
            subtopicsByTopic.set(subtopic.topic_id, current);
          });
          const nextTopics = ((topicsResult.data ?? []) as Array<{ id: number; name: string }>).map((topic) => ({
            ...topic,
            subtopics: subtopicsByTopic.get(topic.id) ?? [],
          }));
          setCourseTopics(nextTopics);
          setGenTargets((current) =>
            current.length > 0 || nextTopics.length === 0
              ? current
              : [createGenerationTargetDraft(nextTopics[0].id)],
          );
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Failed to load questions.";
          setBankLoadError(msg);
          console.error("Question bank load failed:", err);
        }
      } finally {
        if (!cancelled) setBankLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, courseId]);

  const availableSubjects = useMemo(
    () => Array.from(new Set(sourceList.map((q) => q.subject))).sort(),
    [sourceList],
  );

  const filteredQuestions = sourceList.filter((question) => {
    const q = searchQuery.toLowerCase();
    const topic = (question.topic ?? "").toLowerCase();
    const matchesSearch =
      question.text.toLowerCase().includes(q) ||
      question.subject.toLowerCase().includes(q) ||
      topic.includes(q);
    const matchesSubject =
      filterSubject === "all" || question.subject === filterSubject;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "complete" && question.isComplete) ||
      (filterStatus === "incomplete" && !question.isComplete);
    return matchesSearch && matchesSubject && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize) || 1);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedQuestions = filteredQuestions.slice(startIndex, endIndex);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredQuestions.length / pageSize) || 1);
    if (currentPage > maxPage) setCurrentPage(maxPage);
  }, [filteredQuestions.length, pageSize, currentPage]);

  const refreshQuestions = async () => {
    setBankLoadError(null);
    try {
      const latest = await fetchQuestionBankForAdminCourse(courseId);
      setBankSnapshot(latest);
      onQuestionsChange?.(latest);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to refresh questions.";
      setBankLoadError(msg);
      console.error(err);
    }
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestions((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = () => {
    if (onSelectQuestions) {
      onSelectQuestions(sourceList.filter((question) => selectedQuestions.has(question.id)));
    }
    setSelectedQuestions(new Set());
    onOpenChange(false);
  };

  const handleEditStart = (question: QuestionBankQuestion) => {
    setEditingQuestionId(question.id);
    const slots =
      question.choiceSlots ??
      [...(question.options ?? []), "", "", "", "", ""].slice(0, 5);
    // Resolve topic_id: match the question's subject string to a course topic if not already linked
    const matchedTopic = courseTopics.find(
      (t) => t.name.toLowerCase() === question.subject.toLowerCase(),
    );
    setDraft({
      text: question.text,
      type: "multiple-choice",
      subject: question.subject,
      topic_id: matchedTopic?.id ?? null,
      options: slots,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      difficultyLevel: question.difficultyLevel ?? 3,
    });
    setActiveTab("manage");
  };

  const handleCreateStart = () => {
    setEditingQuestionId(null);
    setDraft(emptyDraft());
    setActiveTab("manage");
  };

  const handleDraftOptionChange = (index: number, value: string) => {
    setDraft((current) => {
      const nextOptions = [...current.options];
      nextOptions[index] = value;
      return {
        ...current,
        options: nextOptions,
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      if (editingQuestionId) {
        await updateQuestionBankQuestion(supabase, courseId, editingQuestionId, draft);
      } else {
        await createQuestionBankQuestion(supabase, courseId, draft);
      }
      await refreshQuestions();
      setEditingQuestionId(null);
      setDraft(emptyDraft());
      setActiveTab("browse");
    } catch (error) {
      console.error("Failed to save question bank question:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (questionId: string) => {
    try {
      const supabase = createClient();
      await archiveQuestionBankQuestion(supabase, courseId, questionId);
      await refreshQuestions();
    } catch (error) {
      console.error("Failed to delete question bank row:", error);
    }
  };

  const isDraftComplete = useMemo(() => {
    const validOptions = draft.options.filter((option) => option.trim().length > 0);
    return (
      draft.text.trim().length > 0 &&
      validOptions.length >= 2 &&
      Boolean(draft.correctAnswer) &&
      validOptions.includes(draft.correctAnswer ?? "")
    );
  }, [draft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[85vw]! sm:max-w-5xl! h-[85vh] max-w-none! flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Question Bank
          </DialogTitle>
          <DialogDescription className="sr-only">
            Browse and manage questions for this course, or select questions to add to an assessment.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-3 shrink-0">
            <TabsTrigger value="browse">Browse Questions</TabsTrigger>
            <TabsTrigger value="manage">
              {editingQuestionId ? "Edit Question" : "New Question"}
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Generate with AI
            </TabsTrigger>
          </TabsList>

          {/* ── Browse Tab ── */}
          <TabsContent
            value="browse"
            className="flex-1 flex flex-col gap-3 overflow-hidden px-4 pb-4"
          >
            <div className="flex gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  placeholder="Search questions, subjects, or topics…"
                  className="pl-10"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <Select
                value={filterSubject}
                onValueChange={(value) => {
                  setFilterSubject(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterStatus}
                onValueChange={(value) => {
                  setFilterStatus(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => void refreshQuestions()} disabled={bankLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${bankLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleCreateStart}>
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
              {bankLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-admin-primary" />
                  <p className="text-sm">Loading questions…</p>
                </div>
              ) : bankLoadError ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                  <p className="text-sm font-medium text-foreground">Couldn&apos;t load questions</p>
                  <p className="text-sm text-muted-foreground max-w-sm">Something went wrong on our end. Try again in a moment.</p>
                  <Button variant="outline" size="sm" onClick={() => void refreshQuestions()}>
                    Retry
                  </Button>
                </div>
              ) : paginatedQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
                  <p className="text-sm">
                    {sourceList.length === 0
                      ? "No questions yet. Create your first question to get started."
                      : "No questions match your search or filters."}
                  </p>
                  {sourceList.length === 0 && (
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("manage")}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add First Question
                    </Button>
                  )}
                </div>
              ) : (
                paginatedQuestions.map((question) => {
                  const slots =
                    question.choiceSlots ??
                    [...(question.options ?? []), "", "", "", "", ""].slice(0, 5);
                  const labels = ["A", "B", "C", "D", "E"] as const;
                  return (
                    <Card
                      key={question.id}
                      className={`cursor-pointer transition-all ${
                        selectedQuestions.has(question.id)
                          ? "ring-2 ring-admin-primary shadow-md"
                          : "hover:shadow-md"
                      }`}
                      onClick={() => toggleQuestion(question.id)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-1 flex-wrap items-center gap-2">
                            <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                              {question.subject}
                            </Badge>
                            {question.topic ? (
                              <Badge variant="outline" className="text-xs">
                                {question.topic}
                              </Badge>
                            ) : null}
                            {question.difficultyLevel != null ? (
                              <Badge
                                className={`text-xs ${difficultyInfo(question.difficultyLevel).className} hover:${difficultyInfo(question.difficultyLevel).className}`}
                              >
                                {difficultyInfo(question.difficultyLevel).label}
                              </Badge>
                            ) : null}
                            {!question.isComplete ? (
                              <Badge className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100">
                                Incomplete
                              </Badge>
                            ) : null}
                            {question.usedCount > 0 ? (
                              <span className="text-xs text-muted-foreground">
                                Used {question.usedCount}× in assessments
                              </span>
                            ) : null}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEditStart(question);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              title="Delete question"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleArchive(question.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {question.text || "—"}
                        </p>

                        <ul className="grid gap-1.5 sm:grid-cols-1">
                          {labels.map((L, i) => {
                            const text = slots[i]?.trim() ?? "";
                            const isCorrect =
                              text.length > 0 && question.correctAnswer === text;
                            return (
                              <li
                                key={L}
                                className={`flex gap-2 rounded-md border px-2 py-1.5 text-sm ${
                                  isCorrect
                                    ? "border-green-400 bg-green-50 text-green-900"
                                    : text
                                      ? "bg-background"
                                      : "border-dashed text-muted-foreground/70"
                                }`}
                              >
                                <span className="font-mono font-bold w-6 shrink-0">{L}.</span>
                                <span className="min-w-0 flex-1 break-words">
                                  {text || "—"}
                                </span>
                                {isCorrect ? (
                                  <Badge className="shrink-0 text-[10px] bg-green-600 hover:bg-green-600">
                                    Correct
                                  </Badge>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>

                        {question.explanation?.trim() ? (
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-muted-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Explanation
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <p
                                className="text-sm text-muted-foreground border rounded-md p-2 mt-1 whitespace-pre-wrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {question.explanation}
                              </p>
                            </CollapsibleContent>
                          </Collapsible>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Browse tab footer: pagination + actions */}
            {!bankLoading && !bankLoadError ? (
              <div className="flex flex-col gap-3 pt-3 border-t shrink-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      {filteredQuestions.length} question{filteredQuestions.length !== 1 ? "s" : ""}
                      {filteredQuestions.length > 0
                        ? ` · showing ${startIndex + 1}–${Math.min(endIndex, filteredQuestions.length)}`
                        : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Per page</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(v) => {
                          setPageSize(Number(v));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[88px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 20, 50, 100].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-[5rem] text-center">
                      Page {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage <= 1 || filteredQuestions.length === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {filteredQuestions.length > 0
                        ? Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, index) => {
                              let pageNumber: number;
                              if (totalPages <= 5) pageNumber = index + 1;
                              else if (currentPage <= 3) pageNumber = index + 1;
                              else if (currentPage >= totalPages - 2)
                                pageNumber = totalPages - 4 + index;
                              else pageNumber = currentPage - 2 + index;
                              return (
                                <Button
                                  key={pageNumber}
                                  variant={currentPage === pageNumber ? "default" : "outline"}
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  onClick={() => setCurrentPage(pageNumber)}
                                >
                                  {pageNumber}
                                </Button>
                              );
                            },
                          )
                        : null}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      disabled={currentPage >= totalPages || filteredQuestions.length === 0}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedQuestions.size > 0
                      ? `${selectedQuestions.size} selected`
                      : onSelectQuestions
                        ? "Click a question to select it"
                        : ""}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      {onSelectQuestions ? "Cancel" : "Close"}
                    </Button>
                    {onSelectQuestions ? (
                      <Button onClick={handleAddSelected} disabled={selectedQuestions.size === 0}>
                        Add Selected ({selectedQuestions.size})
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-end pt-3 border-t shrink-0">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ── Manage Tab ── */}
          <TabsContent value="manage" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-4 pt-3">
                <div>
                  <Label>Question Text</Label>
                  <Textarea
                    value={draft.text}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, text: event.target.value }))
                    }
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Topic</Label>
                  {courseTopics.length > 0 ? (
                    <Select
                      value={draft.topic_id != null ? String(draft.topic_id) : "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setDraft((c) => ({ ...c, topic_id: null, subject: "" }));
                        } else {
                          const topic = courseTopics.find((t) => String(t.id) === value);
                          setDraft((c) => ({
                            ...c,
                            topic_id: topic?.id ?? null,
                            subject: topic?.name ?? "",
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a topic…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— No topic —</SelectItem>
                        {courseTopics.map((topic) => (
                          <SelectItem key={topic.id} value={String(topic.id)}>
                            {topic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No topics defined for this course yet. Add topics in the course settings first.
                    </p>
                  )}
                </div>

                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={String(draft.difficultyLevel ?? 3)}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        difficultyLevel: Number.parseInt(value, 10),
                      }))
                    }
                  >
                    <SelectTrigger className="mt-2 w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Very Easy</SelectItem>
                      <SelectItem value="2">Easy</SelectItem>
                      <SelectItem value="3">Medium</SelectItem>
                      <SelectItem value="4">Hard</SelectItem>
                      <SelectItem value="5">Very Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Answer Choices (A–E)</Label>
                  {draft.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-mono text-muted-foreground">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <Input
                        value={option}
                        onChange={(event) => handleDraftOptionChange(index, event.target.value)}
                      />
                      <Button
                        type="button"
                        variant={draft.correctAnswer === option && option.trim() ? "default" : "outline"}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            correctAnswer: option,
                          }))
                        }
                        disabled={!option.trim()}
                      >
                        {draft.correctAnswer === option && option.trim() ? "Correct ✓" : "Mark"}
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Explanation</Label>
                  <Textarea
                    value={draft.explanation}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        explanation: event.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-2"
                    placeholder="Optional — shown after the student answers"
                  />
                </div>
              </div>
            </div>

            {/* Manage tab footer */}
            <div className="border-t px-4 py-3 shrink-0 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {editingQuestionId ? "Editing question" : "New question"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActiveTab("browse")}>
                  Cancel
                </Button>
                <Button onClick={() => void handleSave()} disabled={isSaving || !isDraftComplete}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : editingQuestionId ? (
                    "Save Changes"
                  ) : (
                    "Create Question"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
          {/* ── Generate Tab ── */}
          <TabsContent value="generate" className="flex-1 flex flex-col overflow-hidden px-4 pb-4">
            {genStatus === "idle" || genStatus === "submitting" ? (
              <div className="flex-1 overflow-y-auto pt-3 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-sm font-medium">Generation targets</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={courseTopics.length === 0}
                      onClick={() => setGenTargets((current) => [...current, createGenerationTargetDraft(courseTopics[0]?.id ?? null)])}
                    >
                      <Plus className="w-3.5 h-3.5 mr-2" />
                      Add Target
                    </Button>
                  </div>
                  {courseTopics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No topics defined for this course. Add topics in course settings first.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {genTargets.map((target) => {
                        const topic = courseTopics.find((item) => item.id === target.topicId);
                        const subtopics = topic?.subtopics ?? [];
                        return (
                          <div key={target.id} className="rounded-md border p-3 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                              <Select value={target.topicId != null ? String(target.topicId) : ""} onValueChange={(value) => setGenTargets((current) => current.map((item) => item.id === target.id ? { ...item, topicId: Number(value), subtopicId: null } : item))}>
                                <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
                                <SelectContent>
                                  {courseTopics.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Select value={target.subtopicId != null ? String(target.subtopicId) : "none"} onValueChange={(value) => setGenTargets((current) => current.map((item) => item.id === target.id ? { ...item, subtopicId: value === "none" ? null : Number(value) } : item))}>
                                <SelectTrigger><SelectValue placeholder="Subtopic" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Any subtopic</SelectItem>
                                  {subtopics.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Select value={String(target.count)} onValueChange={(value) => setGenTargets((current) => current.map((item) => item.id === target.id ? { ...item, count: Number(value) } : item))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{[1, 2, 3, 5, 8, 10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                              </Select>
                              <Select value={String(target.difficulty)} onValueChange={(value) => setGenTargets((current) => current.map((item) => item.id === target.id ? { ...item, difficulty: Number(value) as GenerationTargetDraft["difficulty"] } : item))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Very Easy</SelectItem>
                                  <SelectItem value="2">Easy</SelectItem>
                                  <SelectItem value="3">Medium</SelectItem>
                                  <SelectItem value="4">Hard</SelectItem>
                                  <SelectItem value="5">Very Hard</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={target.cognitiveSkill} onValueChange={(value) => setGenTargets((current) => current.map((item) => item.id === target.id ? { ...item, cognitiveSkill: value as CognitiveSkill } : item))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="recall">Recall</SelectItem>
                                  <SelectItem value="application">Application</SelectItem>
                                  <SelectItem value="analysis">Analysis</SelectItem>
                                  <SelectItem value="calculation">Calculation</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Textarea
                                value={target.customInstruction}
                                onChange={(event) => setGenTargets((current) => current.map((item) => item.id === target.id ? { ...item, customInstruction: event.target.value } : item))}
                                rows={2}
                                className="text-sm"
                                placeholder="Optional: request a specific scenario, formula family, code clause, or misconception."
                              />
                              <Button type="button" variant="ghost" size="icon" disabled={genTargets.length <= 1} onClick={() => setGenTargets((current) => current.filter((item) => item.id !== target.id))}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Will generate up to {genTargets.reduce((sum, target) => sum + target.count, 0)} questions
                  across {genTargets.length} target{genTargets.length !== 1 ? "s" : ""}.
                  Generation runs in the background and may take 1-2 minutes.
                </p>
              </div>
            ) : genStatus === "polling" ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Generating questions…</p>
                <p className="text-xs text-muted-foreground">This may take a minute. You can leave this dialog open.</p>
              </div>
            ) : genStatus === "failed" ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm font-medium text-destructive">Generation failed</p>
                <p className="text-xs text-muted-foreground">{genError}</p>
                <Button variant="outline" size="sm" onClick={resetGenTab}>Try Again</Button>
              </div>
            ) : (
              /* done — show draft questions */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-3 pt-2 shrink-0">
                  <p className="text-sm font-medium">
                    {draftQuestions.length} question{draftQuestions.length !== 1 ? "s" : ""} generated
                    · {approvedIndices.size} approved
                  </p>
                  <Button variant="outline" size="sm" onClick={resetGenTab}>Generate More</Button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {draftQuestions.map((q, idx) => {
                    if (rejectedIndices.has(idx)) return null;
                    const approved = approvedIndices.has(idx);
                    return (
                      <Card key={idx} className={approved ? "opacity-60" : ""}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">{q.subject}</Badge>
                              <Badge variant="outline" className="text-xs">{q.subtopic ?? q.topic}</Badge>
                              <Badge variant="outline" className="text-xs">{q.generation_source === "rag" ? "RAG" : "Baseline"}</Badge>
                              <Badge variant="outline" className="text-xs">{difficultyInfo(q.difficulty_level).label}</Badge>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant={approved ? "default" : "outline"}
                                size="sm"
                                className="gap-1 h-7 text-xs"
                                disabled={approved || approvingIdx === idx}
                                onClick={() => void handleApproveQuestion(idx, q)}
                              >
                                {approvingIdx === idx ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                {approved ? "Approved" : "Approve"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => setRejectedIndices((prev) => new Set([...prev, idx]))}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed">{q.question}</p>
                          <ul className="grid gap-1">
                            {(["A", "B", "C", "D"] as const).map((letter) => {
                              const text = q.choices[letter];
                              const isCorrect = letter === q.correct_answer;
                              return (
                                <li
                                  key={letter}
                                  className={`flex gap-2 rounded-md border px-2 py-1 text-sm ${
                                    isCorrect ? "border-green-400 bg-green-50 text-green-900" : "bg-background"
                                  }`}
                                >
                                  <span className="font-mono font-bold w-5 shrink-0">{letter}.</span>
                                  <span className="flex-1">{text}</span>
                                  {isCorrect && <Badge className="shrink-0 text-[10px] bg-green-600 hover:bg-green-600">Correct</Badge>}
                                </li>
                              );
                            })}
                          </ul>
                          {q.explanation ? (
                            <p className="text-xs text-muted-foreground border-t pt-2">{q.explanation}</p>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <div className="flex justify-between pt-3 border-t shrink-0">
                  <span className="text-sm text-muted-foreground">
                    {approvedIndices.size} approved, {rejectedIndices.size} rejected
                  </span>
                  {approvedIndices.size > 0 ? (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await refreshQuestions();
                        setActiveTab("browse");
                      }}
                    >
                      View in Browse ({approvedIndices.size})
                    </Button>
                  ) : null}
                </div>
              </div>
            )}

            {(genStatus === "idle" || genStatus === "submitting") && (
              <div className="flex justify-end pt-3 border-t shrink-0 gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                <Button
                  onClick={() => void handleGenSubmit()}
                  disabled={genTargets.length === 0 || genTargets.every((target) => target.topicId == null) || genStatus === "submitting"}
                  className="gap-2"
                >
                  {genStatus === "submitting" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Starting…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" />Generate Questions</>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
