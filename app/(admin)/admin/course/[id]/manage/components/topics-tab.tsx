"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, X, Loader2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Topic {
  id: number;
  name: string;
  progress: number;
  description?: string;
  subtopics?: Array<{
    id: number;
    name: string;
    description?: string;
    orderIndex?: number;
  }>;
}

interface TopicsManagementProps {
  courseId: number;
  initialTopics: Topic[];
}

export function TopicsManagement({ courseId, initialTopics }: TopicsManagementProps) {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [newTopicName, setNewTopicName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTopicId, setDeleteTopicId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const syncTopics = async (nextTopics: Topic[]) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/course/${courseId}/topics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: nextTopics.map((t) => ({
            id: t.id > 1000000000000 ? undefined : t.id,
            name: t.name,
            description: t.description ?? null,
            subtopics: (t.subtopics ?? []).map((subtopic) => ({
              id: subtopic.id > 1000000000000 ? undefined : subtopic.id,
              name: subtopic.name,
              description: subtopic.description ?? null,
            })),
          })),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : "Unable to save topics",
        );
      }

      setTopics(nextTopics);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save topics");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTopic = () => {
    if (!newTopicName.trim()) return;
    const newTopic: Topic = { id: Date.now(), name: newTopicName.trim(), progress: 0 };
    setNewTopicName("");
    void syncTopics([...topics, newTopic]);
  };

  const handleDeleteTopic = (id: number) => {
    setDeleteTopicId(null);
    void syncTopics(topics.filter((t) => t.id !== id));
  };

  const handleSaveTopic = () => {
    if (!editingName.trim() || editingId === null) return;
    const updated = topics.map((t) =>
      t.id === editingId ? { ...t, name: editingName.trim() } : t,
    );
    setEditingId(null);
    setEditingName("");
    void syncTopics(updated);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const addSubtopic = (topicId: number) => {
    const updated = topics.map((topic) =>
      topic.id === topicId
        ? {
            ...topic,
            subtopics: [
              ...(topic.subtopics ?? []),
              {
                id: Date.now(),
                name: "New subtopic",
                description: "",
                orderIndex: topic.subtopics?.length ?? 0,
              },
            ],
          }
        : topic,
    );
    void syncTopics(updated);
  };

  const updateSubtopic = (topicId: number, subtopicId: number, name: string) => {
    const updated = topics.map((topic) =>
      topic.id === topicId
        ? {
            ...topic,
            subtopics: (topic.subtopics ?? []).map((subtopic) =>
              subtopic.id === subtopicId ? { ...subtopic, name } : subtopic,
            ),
          }
        : topic,
    );
    setTopics(updated);
  };

  const saveSubtopics = (topicId: number) => {
    const updated = topics.map((topic) =>
      topic.id === topicId
        ? {
            ...topic,
            subtopics: (topic.subtopics ?? []).filter((subtopic) => subtopic.name.trim().length > 0),
          }
        : topic,
    );
    void syncTopics(updated);
  };

  const deleteSubtopic = (topicId: number, subtopicId: number) => {
    const updated = topics.map((topic) =>
      topic.id === topicId
        ? {
            ...topic,
            subtopics: (topic.subtopics ?? []).filter((subtopic) => subtopic.id !== subtopicId),
          }
        : topic,
    );
    void syncTopics(updated);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter topic name"
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddTopic(); }}
            className="flex-1"
            disabled={isSaving}
          />
          <Button onClick={handleAddTopic} size="default" disabled={isSaving || !newTopicName.trim()}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            {isSaving ? "Saving..." : "Add Topic"}
          </Button>
        </div>

        {topics.length === 0 ? (
          <div className="text-center py-8 text-slate">
            No topics added yet. Add your first topic above.
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Topic Name</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((topic, index) => (
                  <TableRow key={topic.id}>
                    <TableCell className="font-medium text-slate align-top">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      {editingId === topic.id ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveTopic();
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                            className="max-w-md"
                            autoFocus
                          />
                          <Button onClick={handleSaveTopic} size="sm" variant="default" disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </Button>
                          <Button onClick={handleCancelEdit} size="sm" variant="ghost" disabled={isSaving}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <span className="font-medium">{topic.name}</span>
                          <div className="space-y-2">
                            {(topic.subtopics ?? []).map((subtopic) => (
                              <div key={subtopic.id} className="flex gap-2 items-center max-w-xl">
                                <Input
                                  value={subtopic.name}
                                  onChange={(e) => updateSubtopic(topic.id, subtopic.id, e.target.value)}
                                  onBlur={() => saveSubtopics(topic.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveSubtopics(topic.id);
                                  }}
                                  className="h-8 text-sm"
                                  disabled={isSaving}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={isSaving}
                                  onClick={() => deleteSubtopic(topic.id, subtopic.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isSaving}
                              onClick={() => addSubtopic(topic.id)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-2" />
                              Add Subtopic
                            </Button>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right align-top">
                      {editingId !== topic.id && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            onClick={() => { setEditingId(topic.id); setEditingName(topic.name); }}
                            variant="outline"
                            size="sm"
                            disabled={isSaving}
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => setDeleteTopicId(topic.id)}
                            variant="destructive"
                            size="sm"
                            disabled={isSaving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={deleteTopicId !== null}
        onOpenChange={() => setDeleteTopicId(null)}
        onConfirm={() => deleteTopicId && handleDeleteTopic(deleteTopicId)}
        title="Delete Topic"
        description="Are you sure you want to delete this topic? This action cannot be undone."
        warningItems={[
          "Student progress data for this topic",
          "Analytics and statistics related to this topic",
          "Course completion tracking",
        ]}
        confirmText="Delete Topic"
        variant="destructive"
      />
    </>
  );
}
