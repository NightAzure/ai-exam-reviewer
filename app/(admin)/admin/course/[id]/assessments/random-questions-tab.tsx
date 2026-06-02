"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SubjectCount {
  id: string;
  subject: string;
  count: number;
}

interface RandomQuestionsTabProps {
  availableSubjects: string[];
  questionCounts: { [subject: string]: number };
  initialSelections?: {subject: string; count: number}[];
  onGenerate: (subjects: SubjectCount[]) => void;
}

export function RandomQuestionsTab({
  availableSubjects,
  questionCounts,
  initialSelections = [],
  onGenerate,
}: RandomQuestionsTabProps) {
  const [subjectSelections, setSubjectSelections] = useState<SubjectCount[]>(
    initialSelections.map((selection, index) => ({
      id: `sel-${index}-${selection.subject}`,
      subject: selection.subject,
      count: selection.count,
    })),
  );
  const [errors, setErrors] = useState<{ [id: string]: string }>({});

  const addSubject = () => {
    const newSelection: SubjectCount = {
      id: `sel-${Date.now()}`,
      subject: "",
      count: 1,
    };
    setSubjectSelections([...subjectSelections, newSelection]);
  };

  const removeSubject = (id: string) => {
    setSubjectSelections(subjectSelections.filter((s) => s.id !== id));
    const newErrors = { ...errors };
    delete newErrors[id];
    setErrors(newErrors);
  };

  const updateSubject = (id: string, field: "subject" | "count", value: string | number) => {
    setSubjectSelections(
      subjectSelections.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    );

    // Validate
    if (field === "count" || field === "subject") {
      validateSelection(id, field === "subject" ? value as string : subjectSelections.find(s => s.id === id)?.subject || "", field === "count" ? value as number : subjectSelections.find(s => s.id === id)?.count || 0);
    }
  };

  const validateSelection = (id: string, subject: string, count: number) => {
    const newErrors = { ...errors };

    if (!subject) {
      newErrors[id] = "Please select a subject";
    } else if (count <= 0) {
      newErrors[id] = "Count must be greater than 0";
    } else if (count > (questionCounts[subject] || 0)) {
      newErrors[id] = `Only ${questionCounts[subject] || 0} questions available for ${subject}`;
    } else {
      delete newErrors[id];
    }

    setErrors(newErrors);
  };

  const handleGenerate = () => {
    // Validate all selections
    const newErrors: { [id: string]: string } = {};
    subjectSelections.forEach((sel) => {
      if (!sel.subject) {
        newErrors[sel.id] = "Please select a subject";
      } else if (sel.count <= 0) {
        newErrors[sel.id] = "Count must be greater than 0";
      } else if (sel.count > (questionCounts[sel.subject] || 0)) {
        newErrors[sel.id] = `Only ${questionCounts[sel.subject] || 0} questions available for ${sel.subject}`;
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0 && subjectSelections.length > 0) {
      onGenerate(subjectSelections);
    }
  };

  const totalQuestions = subjectSelections.reduce((sum, sel) => sum + (sel.count || 0), 0);

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Configure random question selection by subject. Each time a student takes this assessment, the system will randomly pick fresh questions matching your criteria from the question bank.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Subject Selection</h3>
              <p className="text-sm text-gray-500">
                Add subjects and specify how many questions to randomly select from each
              </p>
            </div>
            <Button onClick={addSubject} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </div>

          {subjectSelections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No subjects added yet. Click &quot;Add Subject&quot; to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {subjectSelections.map((selection) => (
                <Card key={selection.id} className={errors[selection.id] ? "border-red-300" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">Subject</Label>
                          <Select
                            value={selection.subject}
                            onValueChange={(val) => updateSubject(selection.id, "subject", val)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSubjects.map((subject) => (
                                <SelectItem key={subject} value={subject}>
                                  {subject} ({questionCounts[subject] || 0} available)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm">Number of Questions</Label>
                          <Input
                            type="number"
                            min="1"
                            value={selection.count}
                            onChange={(e) =>
                              updateSubject(selection.id, "count", parseInt(e.target.value) || 0)
                            }
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mt-6 text-red-600 hover:text-red-700"
                        onClick={() => removeSubject(selection.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {errors[selection.id] && (
                      <p className="text-sm text-red-600 mt-2">{errors[selection.id]}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {subjectSelections.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-700">
                  Total: {totalQuestions} questions
                </Badge>
                {Object.keys(errors).length > 0 && (
                  <Badge className="bg-red-100 text-red-700">
                    {Object.keys(errors).length} error(s)
                  </Badge>
                )}
              </div>
              <Button
                onClick={handleGenerate}
                disabled={subjectSelections.length === 0 || Object.keys(errors).length > 0}
              >
                Save Configuration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
