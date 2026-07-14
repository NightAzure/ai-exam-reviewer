"use client";
import { useCourseInit } from "@/hooks/use-course-init";
import { useCourseStore } from "@/stores/course-store";
import { useAssessmentStore } from "@/stores/assessment-store";
import { useAssessmentInit } from "@/hooks/use-assessment-init";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  HelpCircle,
  Calendar,
  BarChart3,
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Copy,
  MoreVertical,
  FileUp,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AssessmentBuilderDialog } from "./assessment-builder-dialog";
import {
  ImportAssessmentDialog,
  normalizeImportedQuestions,
} from "./import-assessment-dialog";
import { AssessmentPreviewDialog } from "./assessment-preview-dialog";
import { QuestionBankDialog } from "./question-bank-dialog";
import type { AssessmentFull } from "@/types/assessment";
import type { AssessmentBuilderSaveData } from "./assessment-builder-dialog";
import type { QuestionBankQuestion } from "./question-bank-dialog";
import { createClient } from "@/utils/supabase/client";
import {
  loadAssessmentAnalyticsForCourse,
  type AssessmentAnalytics,
  loadQuestionInsightsForCourse,
  type QuestionInsight,
} from "@/utils/supabase/assessment-analytics";
import {
  fetchQuestionBankForAdminCourse,
  syncQuestionBankQuestionsForCourse,
} from "@/utils/supabase/question-bank";

interface AdminAssessmentsPageProps {
  id: number;
}

type AssessmentListItem = {
  id: number;
  title: string;
  score: number | null;
  date: string;
  feedback: string | null;
  taken: boolean;
  duration?: number;
  questions: number;
  attempts: number;
  maxAttempts?: number;
  topics: string[];
  isEnabled: boolean;
  releaseDate?: string;
  deadline?: string;
  stats?: AssessmentAnalytics;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AdminAssessmentsPage({ id }: AdminAssessmentsPageProps) {
  const router = useRouter();
  useCourseInit(id);
  const course = useCourseStore((state) => state.getCourse(id));

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showQuestionBankDialog, setShowQuestionBankDialog] = useState(false);
  const [previewAssessmentId, setPreviewAssessmentId] = useState<number>();
  const [editAssessmentId, setEditAssessmentId] = useState<number>();
  const [deleteAssessmentId, setDeleteAssessmentId] = useState<number | null>(null);
  const [analyticsByAssessment, setAnalyticsByAssessment] = useState<Map<number, AssessmentAnalytics>>(new Map());
  const [questionInsights, setQuestionInsights] = useState<QuestionInsight[]>([]);
  const [questionBankQuestions, setQuestionBankQuestions] = useState<QuestionBankQuestion[]>([]);

  // Use global store
  useAssessmentInit(id);
  const assessmentsMap = useAssessmentStore((state) => state.assessments);
  const assessmentsByCourse = useAssessmentStore((state) => state.assessmentsByCourse);
  const getAssessment = useAssessmentStore((state) => state.getAssessment);
  const createAssessment = useAssessmentStore((state) => state.createAssessment);
  const updateAssessment = useAssessmentStore((state) => state.updateAssessment);
  const deleteAssessmentFromStore = useAssessmentStore((state) => state.deleteAssessment);

  // Get assessments from store with stable reference using useMemo
  const assessmentDisplays = useMemo(() => {
    const assessmentIds = assessmentsByCourse.get(id) || [];
    return assessmentIds
      .map(assessmentId => assessmentsMap.get(assessmentId))
      .filter((assessment): assessment is AssessmentFull => assessment !== undefined);
  }, [assessmentsMap, assessmentsByCourse, id]);

  const assessments = useMemo(
    () =>
      assessmentDisplays.map((a) => ({
        id: a.id,
        title: a.title,
        score: null,
        date: a.deadline ? new Date(a.deadline).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        feedback: null,
        taken: false,
        duration: a.duration,
        questions:
          a.questionMode === "manual"
            ? a.questions.length
            : a.randomSubjectSelections.reduce((sum, selection) => sum + selection.count, 0),
        attempts: 0,
        maxAttempts: a.maxAttempts,
        topics:
          a.questionMode === "manual"
            ? [...new Set(a.questions.map((question) => question.subject).filter(Boolean) as string[])]
            : a.randomSubjectSelections.map((selection) => selection.subject),
        isEnabled: a.isEnabled,
        releaseDate: a.releaseDate,
        deadline: a.deadline,
        stats: analyticsByAssessment.get(a.id),
      })),
    [assessmentDisplays, analyticsByAssessment],
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const loadAnalytics = async () => {
      try {
        const [analytics, insights, questionBank] = await Promise.all([
          loadAssessmentAnalyticsForCourse(supabase, id),
          loadQuestionInsightsForCourse(supabase, id),
          fetchQuestionBankForAdminCourse(id),
        ]);
        if (!cancelled) {
          setAnalyticsByAssessment(analytics);
          setQuestionInsights(insights);
          setQuestionBankQuestions(questionBank);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load assessment analytics:", error);
          setAnalyticsByAssessment(new Map());
          setQuestionInsights([]);
          setQuestionBankQuestions([]);
        }
      }
    };

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [id, assessmentDisplays.length]);

  if (!course) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-44 rounded-lg" />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 space-y-3" style={{ background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)" }}>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="rounded-xl shadow-sm border-none p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-full md:w-48 rounded-md" />
          </div>
        </div>

        {/* Assessment rows */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl shadow-sm bg-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="h-4 w-28" />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filteredAssessments = assessments.filter((assessment) => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "completed" && assessment.taken) ||
      (filterStatus === "pending" && !assessment.taken);
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (assessmentId: number) => {
    setEditAssessmentId(assessmentId);
    setShowBuilderDialog(true);
  };

  const handleDelete = async (assessmentId: number) => {
    try {
      await deleteAssessmentFromStore(assessmentId);
      setDeleteAssessmentId(null);
      toast.success("Assessment deleted");
    } catch (error) {
      console.error("Failed to delete assessment:", error);
      toast.error("Failed to delete assessment. Please try again.");
    }
  };

  const handleDuplicate = (assessmentId: number) => {
    const assessment = assessments.find((a) => a.id === assessmentId);
    if (assessment) {
      void createAssessment({
        courseId: id,
        title: `${assessment.title} (Copy)`,
        description: getAssessment(assessmentId)?.description ?? "",
        duration: assessment.duration,
        maxAttempts: assessment.maxAttempts || 1,
        randomizeQuestions: getAssessment(assessmentId)?.randomizeQuestions ?? false,
        shuffleAnswers: getAssessment(assessmentId)?.shuffleAnswers ?? false,
        isEnabled: false,
        allowHints: getAssessment(assessmentId)?.allowHints !== false,
        releaseDate: assessment.releaseDate,
        deadline: assessment.deadline,
        questionMode: getAssessment(assessmentId)?.questionMode ?? "manual",
        questions: getAssessment(assessmentId)?.questions ?? [],
        randomSubjectSelections: getAssessment(assessmentId)?.randomSubjectSelections ?? [],
      }).then(() => {
        toast.success("Assessment duplicated");
      }).catch((error) => {
        console.error("Failed to duplicate assessment:", error);
        toast.error("Failed to duplicate assessment. Please try again.");
      });
    }
  };

  const handlePreview = (assessmentId: number) => {
    setPreviewAssessmentId(assessmentId);
    setShowPreviewDialog(true);
  };

  /*const handleExport = () => {
    const data = {
      course: course.title,
      assessments: filteredAssessments,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course.title}-assessments.json`;
    a.click();
  };*/

  const handleCreateNew = () => {
    setEditAssessmentId(undefined);
    setShowBuilderDialog(true);
  };

  const handleSaveAssessment = async (assessmentData: AssessmentBuilderSaveData) => {
    try {
      const supabase = createClient();
      if (editAssessmentId) {
        await updateAssessment({
          ...assessmentData,
          id: editAssessmentId,
          courseId: id,
        });
      } else {
        await createAssessment({
          ...assessmentData,
          courseId: id,
        });
      }

      if (assessmentData.questionMode === "manual" && assessmentData.questions.length > 0) {
        await syncQuestionBankQuestionsForCourse(supabase, id, assessmentData.questions);
        const refreshedQuestionBank = await fetchQuestionBankForAdminCourse(id);
        setQuestionBankQuestions(refreshedQuestionBank);
      }
    } catch (error) {
      console.error("Failed to save assessment:", error);
    }
  };

  const getStatusBadge = (assessment: AssessmentListItem) => {
    if (assessment.taken) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>;
    }
    if (!assessment.isEnabled) {
      return <Badge className="bg-muted text-foreground/80 hover:bg-muted">Disabled</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Active</Badge>;
  };

  const getTopicColor = (index: number) => {
    const colors = [
      { bg: "bg-[var(--topic-badge-1)]", text: "text-[var(--topic-badge-1-fg)]" },
      { bg: "bg-[var(--topic-badge-2)]", text: "text-[var(--topic-badge-2-fg)]" },
      { bg: "bg-[var(--topic-badge-3)]", text: "text-[var(--topic-badge-3-fg)]" },
      { bg: "bg-[var(--topic-badge-4)]", text: "text-[var(--topic-badge-4-fg)]" },
      { bg: "bg-[var(--topic-badge-5)]", text: "text-[var(--topic-badge-5-fg)]" },
      { bg: "bg-[var(--topic-badge-6)]", text: "text-[var(--topic-badge-6-fg)]" },
    ];
    return colors[index % colors.length];
  };

  const stats = {
    total: assessments.length,
    completed: assessments.reduce((sum, assessment) => sum + (assessment.stats?.completedStudents ?? 0), 0),
    pending: assessments.reduce((sum, assessment) => sum + (assessment.stats?.inProgressStudents ?? 0), 0),
    avgScore: (() => {
      const withScores = assessments.filter((assessment) => (assessment.stats?.averageScore ?? 0) > 0);
      if (withScores.length === 0) return 0;
      return withScores.reduce((sum, assessment) => sum + (assessment.stats?.averageScore ?? 0), 0) / withScores.length;
    })(),
  };

  const lowestPerformingQuestions = questionInsights.slice(0, 5);

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/admin/course/${id}`)}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Assessment Management</h1>
          <p className="text-sm text-muted-foreground truncate">{course.title}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => setShowQuestionBankDialog(true)}
        >
          <BookOpen className="w-4 h-4" />
          Question Bank
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Create
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create from Scratch
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
              <FileUp className="w-4 h-4 mr-2" />
              Import Assessment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Assessments", value: stats.total, icon: BarChart3, accent: "bg-blue-50 text-blue-600" },
          { label: "Completed", value: stats.completed, icon: BarChart3, accent: "bg-green-50 text-green-600" },
          { label: "In Progress", value: stats.pending, icon: Clock, accent: "bg-amber-50 text-amber-600" },
          { label: "Avg Score", value: `${stats.avgScore.toFixed(1)}%`, icon: TrendingUp, accent: "bg-purple-50 text-purple-600" },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-2xl border border-border bg-card/90 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <Input
            placeholder="Search assessments..."
            className="pl-9 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Most Missed Questions */}
      {lowestPerformingQuestions.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl border border-border bg-card/90 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-semibold text-foreground">Most Missed Questions</h2>
            </div>
            <div className="divide-y divide-border/60">
              {lowestPerformingQuestions.map((question) => {
                const assessment = assessments.find((item) => item.id === question.assessmentId);
                return (
                  <div key={`${question.assessmentId}-${question.questionPosition}`} className="px-5 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {assessment?.title ?? `Assessment ${question.assessmentId}`}
                          </Badge>
                          {question.subject && (
                            <Badge className="text-xs bg-admin-primary/10 text-admin-primary hover:bg-admin-primary/10">
                              {question.subject}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground">{question.questionText}</p>
                      </div>
                      <div className="flex gap-6 text-sm shrink-0">
                        <div>
                          <p className="text-xs text-muted-foreground/70">Correct Rate</p>
                          <p className="font-semibold text-red-600">{question.correctRate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground/70">Misses</p>
                          <p className="font-semibold text-foreground">{question.incorrectAttempts}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground/70">Attempts</p>
                          <p className="font-semibold text-foreground">{question.totalAttempts}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Assessments List */}
      <motion.div variants={itemVariants} className="space-y-3">
        {filteredAssessments.map((assessment) => (
          <div key={assessment.id} className="rounded-2xl border border-border bg-card/90 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Title + status */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-semibold text-foreground">{assessment.title}</h3>
                    {getStatusBadge(assessment)}
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {assessment.duration ? `${assessment.duration} min` : "No time limit"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      {assessment.questions ? `${assessment.questions} questions` : "TBD"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      {assessment.maxAttempts ? `${assessment.maxAttempts} attempt${assessment.maxAttempts > 1 ? "s" : ""}` : "Unlimited attempts"}
                    </span>
                    {assessment.deadline && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Due {new Date(assessment.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Release / deadline detail */}
                  {(assessment.releaseDate || assessment.deadline) && (
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground/70">
                      {assessment.releaseDate && (
                        <span><span className="font-medium text-muted-foreground">Release:</span> {new Date(assessment.releaseDate).toLocaleString()}</span>
                      )}
                      {assessment.deadline && (
                        <span><span className="font-medium text-muted-foreground">Deadline:</span> {new Date(assessment.deadline).toLocaleString()}</span>
                      )}
                    </div>
                  )}

                  {/* Topic badges */}
                  {assessment.topics && assessment.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {assessment.topics.map((topic: string, idx: number) => {
                        const colors = getTopicColor(idx);
                        return (
                          <Badge key={idx} className={`text-xs border-none ${colors.bg} ${colors.text} hover:${colors.bg}`}>
                            {topic}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Stats row */}
                  {assessment.stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60">
                      {[
                        { label: "Enrolled", value: assessment.stats.totalStudents, color: "text-foreground" },
                        { label: "Completed", value: assessment.stats.completedStudents, color: "text-green-600" },
                        { label: "Avg Score", value: `${assessment.stats.averageScore.toFixed(1)}%`, color: "text-blue-600" },
                        { label: "Completion", value: `${assessment.stats.completionRate.toFixed(1)}%`, color: "text-purple-600" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-muted/50 rounded-xl px-3 py-2">
                          <p className="text-xs text-muted-foreground/70">{label}</p>
                          <p className={`text-sm font-bold mt-0.5 ${color}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePreview(assessment.id)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(assessment.id)}>
                        <Edit className="w-4 h-4 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(assessment.id)}>
                        <Copy className="w-4 h-4 mr-2" />Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePreview(assessment.id)}>
                        <Eye className="w-4 h-4 mr-2" />Preview
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => setDeleteAssessmentId(assessment.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredAssessments.length === 0 && (
          <div className="rounded-2xl border border-border bg-card/90 shadow-sm p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
              <BarChart3 className="w-6 h-6 text-muted-foreground/70" />
            </div>
            <p className="text-sm text-muted-foreground">No assessments found matching your criteria.</p>
            <Button size="sm" onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Assessment
            </Button>
          </div>
        )}
      </motion.div>

      <QuestionBankDialog
        open={showQuestionBankDialog}
        onOpenChange={setShowQuestionBankDialog}
        courseId={id}
        questions={questionBankQuestions}
        onQuestionsChange={setQuestionBankQuestions}
      />

      <AssessmentBuilderDialog
        key={`${editAssessmentId ?? "new"}-${showBuilderDialog ? "open" : "closed"}`}
        open={showBuilderDialog}
        onOpenChange={setShowBuilderDialog}
        courseId={id}
        assessmentId={editAssessmentId}
        mode={editAssessmentId ? "edit" : "create"}
        courseTopics={course.topics.map((t) => t.name)}
        questionBankQuestions={questionBankQuestions}
        onQuestionBankChange={setQuestionBankQuestions}
        onSave={handleSaveAssessment}
        initialData={editAssessmentId ? getAssessment(editAssessmentId) : undefined}
      />

      <ImportAssessmentDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={(data) => {
          const importedQuestions = normalizeImportedQuestions(data.questions);

          const supabase = createClient();
          void createAssessment({
            courseId: id,
            title: data.title || `Imported Assessment ${new Date().toLocaleString()}`,
            description: data.description || "",
            duration: data.duration,
            maxAttempts: data.maxAttempts || 1,
            randomizeQuestions: data.randomizeQuestions ?? false,
            shuffleAnswers: data.shuffleAnswers ?? false,
            isEnabled: data.isEnabled ?? false,
            allowHints: data.allowHints !== false,
            releaseDate: data.releaseDate,
            deadline: data.deadline,
            questionMode: "manual",
            questions: importedQuestions,
            randomSubjectSelections: [],
          }).then(async () => {
            await syncQuestionBankQuestionsForCourse(supabase, id, importedQuestions);
            const refreshedQuestionBank = await fetchQuestionBankForAdminCourse(id);
            setQuestionBankQuestions(refreshedQuestionBank);
          }).catch((error) => {
            console.error("Failed to import assessment:", error);
          });
        }}
      />

      <AssessmentPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        questionBankQuestions={questionBankQuestions}
        assessmentData={previewAssessmentId ? getAssessment(previewAssessmentId) : undefined}
      />

      <AlertDialog
        open={deleteAssessmentId !== null}
        onOpenChange={(open) => !open && setDeleteAssessmentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the assessment
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAssessmentId && handleDelete(deleteAssessmentId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
