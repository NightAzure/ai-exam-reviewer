"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  GripVertical,
  Trash2,
  Copy,
  BookOpen,
  Save,
  ChevronDown,
  ChevronUp,
  Eye,
  AlertCircle,
} from "lucide-react";
import { QuestionBankDialog } from "./question-bank-dialog";
import type { QuestionBankQuestion } from "./question-bank-dialog";
import { RandomQuestionsTab } from "./random-questions-tab";
import { AssessmentPreviewDialog } from "./assessment-preview-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { AssessmentFull, CreateAssessmentRequest } from "@/types/assessment";
export type AssessmentBuilderSaveData = Omit<CreateAssessmentRequest, "courseId">;

interface Question {
  id: string;
  text: string;
  type: "multiple-choice";
  options: string[];
  correctAnswer?: string;
  explanation?: string;
  subject?: string;
}

interface AssessmentBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  assessmentId?: number;
  mode?: "create" | "edit";
  courseTopics?: string[];
  questionBankQuestions?: QuestionBankQuestion[];
  onQuestionBankChange?: (questions: QuestionBankQuestion[]) => void;
  onSave?: (data: AssessmentBuilderSaveData) => void | Promise<void>;
  initialData?: Partial<AssessmentFull>;
}

const getInitialBuilderState = (
  mode: "create" | "edit",
  open: boolean,
  initialData?: Partial<AssessmentFull>,
) => ({
  title: mode === "edit" && open ? initialData?.title || "" : "",
  description: mode === "edit" && open ? initialData?.description || "" : "",
  duration: mode === "edit" && open ? initialData?.duration?.toString() || "" : "",
  questions: mode === "edit" && open ? (initialData?.questions || []) : [],
  randomizeQuestions:
    mode === "edit" && open ? Boolean(initialData?.randomizeQuestions) : false,
  shuffleAnswers: mode === "edit" && open ? Boolean(initialData?.shuffleAnswers) : false,
  maxAttempts: mode === "edit" && open ? initialData?.maxAttempts?.toString() || "3" : "3",
  isEnabled: mode === "edit" && open ? Boolean(initialData?.isEnabled) : false,
  allowHints: mode === "edit" && open ? (initialData?.allowHints !== false) : true,
  releaseDate: mode === "edit" && open ? initialData?.releaseDate || "" : "",
  deadline: mode === "edit" && open ? initialData?.deadline || "" : "",
  questionMode:
    mode === "edit" && open ? initialData?.questionMode || "manual" : "manual",
  randomSubjectSelections:
    mode === "edit" && open ? (initialData?.randomSubjectSelections || []) : [],
});

export function AssessmentBuilderDialog({
  open,
  onOpenChange,
  courseId,
  assessmentId,
  mode = "create",
  courseTopics = [],
  questionBankQuestions = [],
  onQuestionBankChange,
  onSave,
  initialData,
}: AssessmentBuilderDialogProps) {
  void assessmentId;
  void courseTopics;
  const initialState = getInitialBuilderState(mode, open, initialData);
  const [title, setTitle] = useState(initialState.title);
  const [description, setDescription] = useState(initialState.description);
  const [duration, setDuration] = useState(initialState.duration);
  const [questions, setQuestions] = useState<Question[]>(initialState.questions);
  const [randomizeQuestions, setRandomizeQuestions] = useState(initialState.randomizeQuestions);
  const [shuffleAnswers, setShuffleAnswers] = useState(initialState.shuffleAnswers);
  const [maxAttempts, setMaxAttempts] = useState(initialState.maxAttempts);
  const [isEnabled, setIsEnabled] = useState(initialState.isEnabled);
  const [allowHints, setAllowHints] = useState(initialState.allowHints);
  const [releaseDate, setReleaseDate] = useState(initialState.releaseDate);
  const [deadline, setDeadline] = useState(initialState.deadline);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [questionMode, setQuestionMode] = useState<"manual" | "random">(initialState.questionMode);
  const [randomSubjectSelections, setRandomSubjectSelections] = useState<{subject: string; count: number}[]>(
    initialState.randomSubjectSelections,
  );
  const [showPreview, setShowPreview] = useState(false);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      text: "",
      type: "multiple-choice",
      options: ["", "", "", ""],
      subject: "",
    };
    setQuestions([...questions, newQuestion]);
    // Expand the newly added question
    setExpandedQuestions(new Set([...expandedQuestions, newQuestion.id]));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const duplicateQuestion = (id: string) => {
    const question = questions.find((q) => q.id === id);
    if (question) {
      const duplicate = { ...question, id: `q-${Date.now()}` };
      const index = questions.findIndex((q) => q.id === id);
      setQuestions([
        ...questions.slice(0, index + 1),
        duplicate,
        ...questions.slice(index + 1),
      ]);
    }
  };

  const toggleQuestion = (id: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedQuestions(newExpanded);
  };

  // Validation: Check if a question is complete
  const isQuestionComplete = (question: Question): boolean => {
    // Must have question text
    if (!question.text || question.text.trim() === "") return false;

    // Must have at least 2 options
    const validOptions = question.options.filter(opt => opt && opt.trim() !== "");
    if (validOptions.length < 2) return false;

    // Must have a correct answer selected
    if (!question.correctAnswer || question.correctAnswer.trim() === "") return false;

    // Correct answer must be one of the options
    if (!validOptions.includes(question.correctAnswer)) return false;

    return true;
  };

  // Get all incomplete questions
  const getIncompleteQuestions = (): Question[] => {
    if (questionMode === "random") return [];
    return questions.filter(q => !isQuestionComplete(q));
  };

  const incompleteQuestions = getIncompleteQuestions();
  const hasIncompleteQuestions = incompleteQuestions.length > 0;

  const handleSave = () => {
    // Validate manual mode questions
    if (questionMode === "manual" && hasIncompleteQuestions) {
      alert(`Cannot save: ${incompleteQuestions.length} incomplete question(s). Please complete all questions or remove them.`);
      return;
    }

    // Prepare data for backend
    const assessmentData = {
      title,
      description,
      duration: duration ? parseInt(duration) : undefined,
      maxAttempts: parseInt(maxAttempts),
      randomizeQuestions,
      shuffleAnswers,
      isEnabled: (questionMode === "manual" ? questions.length > 0 : randomSubjectSelections.length > 0) ? isEnabled : false,
      allowHints,
      releaseDate: releaseDate || undefined,
      deadline: deadline || undefined,
      questionMode, // "manual" or "random"
      // For manual mode: send actual questions
      questions: questionMode === "manual" ? questions : [],
      // For random mode: send subject selection config
      randomSubjectSelections: questionMode === "random" ? randomSubjectSelections : [],
    };

    if (onSave) {
      onSave(assessmentData);
    }

    onOpenChange(false);
  };

  const renderQuestionBuilder = (question: Question, index: number) => {
    const isExpanded = expandedQuestions.has(question.id);
    const isComplete = isQuestionComplete(question);

    return (
      <Card key={question.id} className={`border-l-4 ${isComplete ? 'border-l-admin-primary' : 'border-l-orange-500'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <GripVertical className="w-5 h-5 text-muted-foreground/70 mt-2 cursor-move shrink-0" />
            <div className="flex-1 min-w-0">
              {/* Question Header */}
              <div className="flex items-center justify-between gap-4 mb-3">
                <div
                  className="flex-1 flex items-center gap-3 cursor-pointer"
                  onClick={() => toggleQuestion(question.id)}
                >
                  <span className="font-semibold text-foreground">Question {index + 1}</span>
                  {!isComplete && (
                    <Badge className="text-xs bg-orange-100 text-orange-700">
                      Incomplete
                    </Badge>
                  )}
                  {question.text && !isExpanded && (
                    <span className="text-sm text-muted-foreground truncate">
                      {question.text.substring(0, 60)}{question.text.length > 60 ? '...' : ''}
                    </span>
                  )}
                  {question.subject && (
                    <Badge className="text-xs bg-blue-100 text-blue-700">
                      {question.subject}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => duplicateQuestion(question.id)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => removeQuestion(question.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Expandable Content */}
              {isExpanded && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">Question Text *</Label>
                    <Textarea
                      placeholder="Enter your question here..."
                      value={question.text}
                      onChange={(e) =>
                        updateQuestion(question.id, { text: e.target.value })
                      }
                      rows={3}
                      className="mt-2"
                    />
                  </div>

              {/* Subject Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Subject</Label>
                <Input
                  placeholder="e.g., LAWS, Mathematics, Physics"
                  value={question.subject || ""}
                  onChange={(e) =>
                    updateQuestion(question.id, { subject: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Answer Options *</Label>
                {question.options?.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6 flex-shrink-0">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <Input
                        placeholder={`Option ${idx + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(question.options || [])];
                          newOptions[idx] = e.target.value;
                          updateQuestion(question.id, { options: newOptions });
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant={
                          question.correctAnswer === option
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          updateQuestion(question.id, { correctAnswer: option })
                        }
                        className="w-24 flex-shrink-0"
                      >
                        {question.correctAnswer === option ? "Correct" : "Mark"}
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newOptions = [...(question.options || []), ""];
                      updateQuestion(question.id, { options: newOptions });
                    }}
                    className="mt-2"
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Add Option
                  </Button>
                </div>

              <div>
                <Label className="text-sm font-semibold">Explanation (Optional)</Label>
                <Textarea
                  placeholder="Add an explanation for the correct answer..."
                  value={question.explanation || ""}
                  onChange={(e) =>
                    updateQuestion(question.id, { explanation: e.target.value })
                  }
                  rows={2}
                  className="mt-2"
                />
              </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`${activeTab === "questions" ? "w-[85vw]! sm:max-w-6xl!" : "w-[70vw]! sm:max-w-3xl!"} h-[95vh] max-w-none! flex flex-col p-0`}>
          <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>
                {mode === "create" ? "Create Assessment" : "Edit Assessment"}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              Configure assessment settings, manual or random questions, and save to your course.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <Tabs defaultValue="settings" className="space-y-3" onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="settings">Assessment Settings</TabsTrigger>
                {questionMode === "manual" && (
                  <TabsTrigger value="questions">
                    Questions ({questions.length})
                  </TabsTrigger>
                )}
                {questionMode === "random" && (
                  <TabsTrigger value="random">
                    Random Questions
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="settings" className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Assessment Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Midterm Exam"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this assessment covers..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="Leave empty for no limit"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="max-attempts">Max Attempts</Label>
                    <Input
                      id="max-attempts"
                      type="number"
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(e.target.value)}
                      className="mt-1"
                      min="1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="release-date">Release Date (Optional)</Label>
                    <Input
                      id="release-date"
                      type="datetime-local"
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                      className="mt-1"
                      placeholder="Leave empty for immediate release"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Leave empty for immediate release</p>
                  </div>

                  <div>
                    <Label htmlFor="deadline">Deadline (Optional)</Label>
                    <Input
                      id="deadline"
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Leave empty for no deadline</p>
                  </div>

                  <div className="col-span-2 pt-4 border-t">
                    <div className="space-y-4">
                      <Card className="border-2 border-blue-300 bg-blue-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-semibold">
                                Question Selection Mode
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {questionMode === "manual"
                                  ? "Manually add or select specific questions"
                                  : "Randomly select questions from question bank by subject"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${questionMode === "manual" ? "text-blue-700" : "text-muted-foreground"}`}>
                                Manual
                              </span>
                              <Switch
                                checked={questionMode === "random"}
                                onCheckedChange={(checked) => setQuestionMode(checked ? "random" : "manual")}
                                className="scale-125"
                              />
                              <span className={`text-sm font-medium ${questionMode === "random" ? "text-blue-700" : "text-muted-foreground"}`}>
                                Random
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className={`border-2 ${isEnabled ? 'border-green-500 bg-green-50' : 'border-border bg-muted/50'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-semibold">
                                {isEnabled ? '✓ Assessment Enabled' : '○ Assessment Disabled'}
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {(questionMode === "manual" ? questions.length === 0 : randomSubjectSelections.length === 0)
                                  ? (questionMode === "manual" ? "Add questions to enable this assessment" : "Configure random question selection to enable this assessment")
                                  : isEnabled
                                  ? "Students can now access this assessment"
                                  : "Enable to make this assessment available to students"}
                              </p>
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={setIsEnabled}
                              disabled={questionMode === "manual" ? questions.length === 0 : randomSubjectSelections.length === 0}
                              className="scale-125"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Randomize Question Order</Label>
                        <p className="text-xs text-muted-foreground">
                          Questions appear in random order for each student
                        </p>
                      </div>
                      <Switch
                        checked={randomizeQuestions}
                        onCheckedChange={setRandomizeQuestions}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Shuffle Answer Options</Label>
                        <p className="text-xs text-muted-foreground">
                          Answer options appear in random order
                        </p>
                      </div>
                      <Switch
                        checked={shuffleAnswers}
                        onCheckedChange={setShuffleAnswers}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Allow AI Hints</Label>
                        <p className="text-xs text-muted-foreground">
                          Students can request up to 2 Socratic hints per question
                        </p>
                      </div>
                      <Switch
                        checked={allowHints}
                        onCheckedChange={setAllowHints}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="questions" className="space-y-3">
                {/* Add Questions Toolbar */}
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => addQuestion()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Multiple Choice Question
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuestionBank(true)}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Question Bank
                  </Button>
                </div>

                {/* Incomplete Questions Warning */}
                {hasIncompleteQuestions && (
                  <Card className="border-orange-300 bg-orange-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-orange-900">
                            {incompleteQuestions.length} Incomplete Question{incompleteQuestions.length > 1 ? 's' : ''}
                          </p>
                          <p className="text-sm text-orange-700 mt-1">
                            Complete all questions before saving. Each question needs: question text, at least 2 options, and a correct answer selected.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Questions List */}
                <div className="space-y-3">
                  {questions.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground mb-4">
                          No questions added yet. Start by adding a multiple choice question.
                        </p>
                        <Button onClick={() => addQuestion()}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Your First Question
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    questions.map((question, index) => renderQuestionBuilder(question, index))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="random" className="space-y-3">
                {/* Question Bank Button */}
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuestionBank(true)}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Manage Question Bank
                  </Button>
                  <div className="flex-1" />
                  {randomSubjectSelections.length > 0 && (
                    <Badge variant="outline" className="text-sm">
                      {randomSubjectSelections.reduce((sum, sel) => sum + sel.count, 0)} questions will be randomly selected per attempt
                    </Badge>
                  )}
                </div>

                <RandomQuestionsTab
                  availableSubjects={(() => {
                    const subjects = new Set<string>();
                    questionBankQuestions.forEach(q => {
                      if (q.subject && q.isComplete) {
                        subjects.add(q.subject);
                      }
                    });
                    return Array.from(subjects).sort();
                  })()}
                  questionCounts={(() => {
                    const counts: { [subject: string]: number } = {};
                    questionBankQuestions.forEach(q => {
                      if (q.subject && q.isComplete) {
                        counts[q.subject] = (counts[q.subject] || 0) + 1;
                      }
                    });
                    return counts;
                  })()}
                  initialSelections={randomSubjectSelections}
                  onGenerate={(selections) => {
                    // Store the subject selections for backend
                    // Questions will be randomly selected on each attempt
                    setRandomSubjectSelections(selections);
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="px-4 py-3 border-t">
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
                disabled={questionMode === "manual" ? questions.length === 0 : randomSubjectSelections.length === 0}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={
                    !title ||
                    (questionMode === "manual" ? (questions.length === 0 || hasIncompleteQuestions) : randomSubjectSelections.length === 0)
                  }
                  title={hasIncompleteQuestions ? `${incompleteQuestions.length} incomplete question(s)` : undefined}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Assessment
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuestionBankDialog
        open={showQuestionBank}
        onOpenChange={setShowQuestionBank}
        courseId={courseId}
        questions={questionBankQuestions}
        onQuestionsChange={onQuestionBankChange}
        onSelectQuestions={(selectedQuestions) => {
          const newQuestions = selectedQuestions.map((q) => ({
            id: `q-${Date.now()}-${Math.random()}`,
            text: q.text,
            type: "multiple-choice" as const,
            options: q.options || ["", "", "", ""],
            correctAnswer: q.correctAnswer,
            subject: q.subject,
          }));
          setQuestions([...questions, ...newQuestions]);
          // Expand all imported questions
          const newIds = newQuestions.map(q => q.id);
          setExpandedQuestions(new Set([...expandedQuestions, ...newIds]));
        }}
      />

      <AssessmentPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        questionBankQuestions={questionBankQuestions}
        assessmentData={{
          title,
          description,
          duration: duration ? parseInt(duration) : undefined,
          questions: questionMode === "manual" ? questions : [],
          questionMode,
          randomSubjectSelections,
        }}
      />
    </>
  );
}
