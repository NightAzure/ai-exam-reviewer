"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileJson,
  FileText,
  Table2,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CreateAssessmentRequest, Question } from "@/types/assessment";

type ParsedImportQuestion = {
  subject?: string;
  question?: string;
  choices?: Record<string, string>;
  correct_answer?: string;
  [key: string]: string | Record<string, string> | undefined;
};

type ParsedImportResult = Omit<Partial<CreateAssessmentRequest>, "questions"> & {
  questions?: Array<CreateAssessmentRequest["questions"][number] | ParsedImportQuestion | Record<string, string>>;
  title?: string;
};

export const normalizeImportedQuestions = (
  inputQuestions: ParsedImportResult["questions"] | undefined,
): Question[] => {
  if (!inputQuestions) return [];

  return inputQuestions
    .map((question, index): Question | null => {
      const candidate = question as Partial<Question> & Record<string, unknown>;

      if (typeof candidate.text === "string" && Array.isArray(candidate.options)) {
        return {
          id: `imported-${Date.now()}-${index}`,
          text: candidate.text,
          type: "multiple-choice",
          options: candidate.options.filter(
            (option): option is string => typeof option === "string",
          ),
          correctAnswer:
            typeof candidate.correctAnswer === "string"
              ? candidate.correctAnswer
              : undefined,
          explanation:
            typeof candidate.explanation === "string"
              ? candidate.explanation
              : undefined,
          subject:
            typeof candidate.subject === "string" ? candidate.subject : undefined,
        };
      }

      if ("question" in question) {
        const choicesRecord =
          question.choices && typeof question.choices === "object"
            ? question.choices
            : null;
        const options = choicesRecord
          ? Object.keys(choicesRecord)
              .sort()
              .map((key) => choicesRecord[key] ?? "")
              .filter((value) => value.trim().length > 0)
          : [];

        const correctAnswer =
          question.correct_answer && choicesRecord
            ? choicesRecord[question.correct_answer] ?? question.correct_answer
            : question.correct_answer;

        return {
          id: `imported-${Date.now()}-${index}`,
          text: question.question ?? "",
          type: "multiple-choice",
          options,
          correctAnswer: correctAnswer ?? undefined,
          explanation: undefined,
          subject: question.subject,
        };
      }

      const record = question as Record<string, string>;
      const subject = record.subject || record.Subject || "";
      const text = record.question || record.Question || record.text || "";
      const candidateOptionKeys = ["A", "B", "C", "D", "E", "F"];
      const options = candidateOptionKeys
        .map((key) => record[key] ?? "")
        .filter((value) => value.trim().length > 0);

      const answerKey = record.correct_answer || record.correctAnswer || "";
      const correctAnswer = answerKey && record[answerKey] ? record[answerKey] : answerKey;

      if (!text) return null;

      return {
        id: `imported-${Date.now()}-${index}`,
        text,
        type: "multiple-choice",
        options,
        correctAnswer: correctAnswer || undefined,
        explanation: record.explanation || undefined,
        subject: subject || undefined,
      };
    })
    .filter((question): question is Question => {
      if (!question) return false;
      return question.text.trim().length > 0 && question.options.length >= 2;
    });
};

interface ImportAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: (data: ParsedImportResult) => void;
}

export function ImportAssessmentDialog({
  open,
  onOpenChange,
  onImport,
}: ImportAssessmentDialogProps) {
  const [importType, setImportType] = useState<"json" | "csv" | "text">("json");
  const [importData, setImportData] = useState("");
  const [parseStatus, setParseStatus] = useState<"success" | "error" | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportData(content);

      // Auto-detect and parse
      if (file.name.endsWith(".json")) {
        setImportType("json");
        tryParseJSON(content);
      } else if (file.name.endsWith(".csv")) {
        setImportType("csv");
        tryParseCSV(content);
      }
    };
    reader.readAsText(file);
  };

  const tryParseJSON = (data: string) => {
    try {
      const parsed = JSON.parse(data) as ParsedImportResult;
      setParsedResult(parsed);
      setParseStatus("success");
    } catch {
      setParseStatus("error");
      setParsedResult(null);
    }
  };

  const tryParseCSV = (data: string) => {
    try {
      const lines = data.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim());
      const questions = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const question: Record<string, string> = {};
        headers.forEach((header, idx) => {
          question[header] = values[idx];
        });
        return question;
      });
      setParsedResult({ questions });
      setParseStatus("success");
    } catch {
      setParseStatus("error");
      setParsedResult(null);
    }
  };

  const handleImport = () => {
    if (parsedResult && onImport) {
      onImport(parsedResult);
      onOpenChange(false);
      setImportData("");
      setParsedResult(null);
      setParseStatus(null);
    }
  };

  const jsonExample = `{
  "title": "Sample Assessment",
  "description": "Description here",
  "duration": 60,
  "questions": [
    {
      "subject": "LAWS",
      "question": "What is 2+2?",
      "choices": {
        "A": "3",
        "B": "4",
        "C": "5",
        "D": "6"
      },
      "correct_answer": "B"
    },
    {
      "subject": "Mathematics",
      "question": "The sky is blue.",
      "choices": {
        "A": "True",
        "B": "False"
      },
      "correct_answer": "A"
    }
  ]
}`;

  const csvExample = `subject,question,A,B,C,D,correct_answer
LAWS,What is 2+2?,3,4,5,6,B
Mathematics,What is 3+3?,5,6,7,8,B
Physics,The sky is blue?,True,False,,,A`;

  const textExample = `Format: Subject | Question | A | B | C | D | Correct Answer

LAWS | What is 2+2? | 3 | 4 | 5 | 6 | B
Mathematics | The sky is blue? | True | False | | | A
Physics | Explain recursion. | | | | | (leave blank for incomplete)`;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[85vw]! sm:max-w-4xl! h-[90vh] max-w-none! flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Assessment
            </DialogTitle>
          </DialogHeader>

          <Tabs
            value={importType}
            onValueChange={(v) => setImportType(v as "json" | "csv" | "text")}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="mx-4 mt-3">
              <TabsTrigger value="json">
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </TabsTrigger>
              <TabsTrigger value="csv">
                <Table2 className="w-4 h-4 mr-2" />
                CSV
              </TabsTrigger>
              <TabsTrigger value="text">
                <FileText className="w-4 h-4 mr-2" />
                Text
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto space-y-3 px-4 py-3">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Import questions with Subject field. Format: {`{"subject": "LAWS", "question": "...", "choices": {"A": "1", "B": "2"}, "correct_answer": "A"}`}
                </AlertDescription>
              </Alert>

              <TabsContent value="json" className="space-y-4 mt-0">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">Upload JSON File or Paste Content</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Upload File
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paste JSON content here..."
                    value={importData}
                    onChange={(e) => {
                      setImportData(e.target.value);
                      if (e.target.value) {
                        tryParseJSON(e.target.value);
                      } else {
                        setParseStatus(null);
                      }
                    }}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Info className="w-4 h-4 text-evidence mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-1">JSON Format Example</p>
                        <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto">
                          {jsonExample}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4 mt-0">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">Upload CSV File or Paste Content</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Upload File
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paste CSV content here..."
                    value={importData}
                    onChange={(e) => {
                      setImportData(e.target.value);
                      if (e.target.value) {
                        tryParseCSV(e.target.value);
                      } else {
                        setParseStatus(null);
                      }
                    }}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Info className="w-4 h-4 text-evidence mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-1">CSV Format Example</p>
                        <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto">
                          {csvExample}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="text" className="space-y-4 mt-0">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">Paste Text Content</p>
                  </div>
                  <Textarea
                    placeholder="Paste text content here..."
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Info className="w-4 h-4 text-evidence mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-1">Text Format Example</p>
                        <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto">
                          {textExample}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Parse Status */}
              {parseStatus && (
                <Alert
                  variant={parseStatus === "success" ? "default" : "destructive"}
                  className={
                    parseStatus === "success"
                      ? "bg-proficient/10 text-green-900 border-proficient/20"
                      : ""
                  }
                >
                  {parseStatus === "success" ? (
                    <CheckCircle className="w-4 h-4 text-proficient" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <AlertDescription>
                    {parseStatus === "success" ? (
                      <div>
                        <p className="font-medium">Successfully parsed!</p>
                        {parsedResult && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs">
                              Found {parsedResult.questions?.length || 0} questions
                            </p>
                            {parsedResult.title && (
                              <p className="text-xs">Title: {parsedResult.title}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">Failed to parse content</p>
                        <p className="text-xs mt-1">
                          Please check the format and try again.
                        </p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Tabs>

          <DialogFooter className="border-t px-4 py-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={parseStatus !== "success"}
            >
              Import Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
