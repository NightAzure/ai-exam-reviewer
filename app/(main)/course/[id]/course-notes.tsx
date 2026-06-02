import { ConfirmationDialog } from "@/components/confirmation-dialog";
import NoteSheet from "@/components/note-sheet";
import NoteEditor from "@/components/note-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Course, CourseNote } from "@/types/course";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreVertical,
  Download,
  Trash2,
  Plus,
  Pencil,
  NotebookPen,
  Sparkles,
  ChevronDown,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { mutate as swrMutate } from "swr";
import { toast } from "sonner";
import { useCourseNotes } from "@/hooks/use-course-notes";
import {
  DropdownMenu as GenDropdownMenu,
  DropdownMenuContent as GenDropdownMenuContent,
  DropdownMenuItem as GenDropdownMenuItem,
  DropdownMenuTrigger as GenDropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CourseProps {
  course: Course;
}

export default function CourseNotes({ course }: CourseProps) {
  const { notes, isLoading, isMutating, error, createNote, updateNote, deleteNote } =
    useCourseNotes(course.id);
  const [open, setOpen] = useState(false);
  const [currentNote, setNote] = useState<CourseNote>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [generatingTopicId, setGeneratingTopicId] = useState<number | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<number | null>(null);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return [...notes]
      .filter((note) => {
        const matchesSearch =
          !q ||
          note.title.toLowerCase().includes(q) ||
          note.content.toLowerCase().includes(q);
        const matchesTopic = topicFilter === null || note.topicId === topicFilter;
        return matchesSearch && matchesTopic;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, searchQuery, topicFilter]);

  const resetEditor = () => {
    setEditingNoteId(null);
    setTitle("");
    setContent("");
  };

  const openCreateDialog = () => {
    resetEditor();
    setEditorOpen(true);
  };

  const openEditDialog = (note: CourseNote) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setEditorOpen(true);
  };

  const handleGenerateNote = async (topicId: number) => {
    setGeneratingTopicId(topicId);
    try {
      const res = await fetch(
        `/api/course/${course.id}/topics/${topicId}/generate-note`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Failed to generate note");
      }
      await swrMutate(`/api/course/${course.id}/notes`);
    } catch (err) {
      console.error("Note generation failed:", err);
      toast.error("Failed to generate note. Please try again.");
    } finally {
      setGeneratingTopicId(null);
    }
  };

  const handleSaveNote = async () => {
    if (!title.trim()) return;

    try {
      if (editingNoteId) {
        await updateNote(editingNoteId, { title, content });
      } else {
        await createNote({ title, content });
      }
      toast.success(editingNoteId ? "Note updated" : "Note created");
      setEditorOpen(false);
      resetEditor();
    } catch (err) {
      console.error("Failed to save note:", err);
      toast.error("Failed to save note. Please try again.");
    }
  };

  const downloadNote = (note: CourseNote) => {
    const blob = new Blob([note.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${note.title}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card className="border border-gray-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.09)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.13)] transition">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-900">
            <NotebookPen className="w-4 h-4 text-gray-500" />
            Personal Course Notes
          </CardTitle>
          <div className="flex items-center gap-2">
            {course.topics && course.topics.length > 0 && (
              <GenDropdownMenu>
                <GenDropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    disabled={generatingTopicId !== null}
                  >
                    {generatingTopicId !== null ? (
                      <><Sparkles className="w-3.5 h-3.5 animate-pulse" />Generating…</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" />Generate with AI<ChevronDown className="w-3 h-3" /></>
                    )}
                  </Button>
                </GenDropdownMenuTrigger>
                <GenDropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
                  {course.topics.map((topic) => (
                    <GenDropdownMenuItem
                      key={topic.id}
                      onClick={() => void handleGenerateNote(topic.id)}
                      disabled={generatingTopicId !== null}
                    >
                      {topic.name}
                    </GenDropdownMenuItem>
                  ))}
                </GenDropdownMenuContent>
              </GenDropdownMenu>
            )}
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-700 text-white"
              onClick={openCreateDialog}
            >
              <Plus className="w-3.5 h-3.5" />
              New Note
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Search + Topic Filter */}
          {!isLoading && notes.length > 0 && (
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              {course.topics && course.topics.length > 0 && (
                <Select
                  value={topicFilter === null ? "all" : String(topicFilter)}
                  onValueChange={(v) => setTopicFilter(v === "all" ? null : Number(v))}
                >
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue placeholder="All topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All topics</SelectItem>
                    {course.topics.map((topic) => (
                      <SelectItem key={topic.id} value={String(topic.id)}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-gray-100 rounded-xl p-4 flex justify-between items-start bg-gray-50"
                >
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-7 w-7 rounded-md shrink-0 ml-3" />
                </div>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            searchQuery || topicFilter !== null ? (
              <p className="text-sm text-center py-6 text-muted-foreground">
                No notes match your search.
              </p>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <NotebookPen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No notes yet</p>
                <p className="text-xs mt-1 opacity-70">
                  Create personal notes while reviewing this course.
                </p>
              </div>
            )
          ) : (
            filteredNotes.map((note) => (
              <div
                onClick={() => {
                  setOpen(true);
                  setNote(note);
                }}
                key={note.id}
                className="group border border-gray-100 rounded-xl p-4 hover:border-gray-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:bg-gray-50 transition-all flex justify-between items-start bg-gray-50/60 cursor-pointer"
              >
                <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 truncate">
                    {note.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    Updated {new Date(note.updatedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {note.content.replace(/[#*`_~>]/g, "").trim() || "No content"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="flex items-center gap-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditDialog(note);
                      }}
                    >
                      <Pencil className="w-4 h-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        downloadNote(note);
                      }}
                    >
                      <Download className="w-4 h-4" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 text-red-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteNoteId(note.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <NoteSheet
        open={open}
        setOpen={setOpen}
        currentNote={currentNote}
        onSave={async (noteId, noteTitle, noteContent) => {
          await updateNote(noteId, { title: noteTitle, content: noteContent });
          toast.success("Note updated");
          setNote((prev) =>
            prev ? { ...prev, title: noteTitle, content: noteContent } : prev,
          );
        }}
        isSaving={isMutating}
      />

      <ConfirmationDialog
        open={deleteNoteId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeleteNoteId(null);
        }}
        onConfirm={async () => {
          if (deleteNoteId === null) return;
          setIsDeletingNote(true);
          try {
            await deleteNote(deleteNoteId);
            toast.success("Note deleted");
            setDeleteNoteId(null);
          } catch (err) {
            console.error("Failed to delete note:", err);
            toast.error("Failed to delete note. Please try again.");
          } finally {
            setIsDeletingNote(false);
          }
        }}
        title="Delete Note"
        description="This note will be permanently deleted and cannot be recovered."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeletingNote}
      />

      <Dialog
        open={editorOpen}
        onOpenChange={(isOpen) => {
          setEditorOpen(isOpen);
          if (!isOpen) resetEditor();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingNoteId ? "Edit Note" : "Create Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Note title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <NoteEditor
              key={editingNoteId ?? "new"}
              value={content}
              onChange={setContent}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveNote()}
              disabled={isMutating || !title.trim()}
            >
              {isMutating ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
