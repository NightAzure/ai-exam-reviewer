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
      <Card className="gap-0 rounded-2xl border-ink/10 bg-white py-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-ink/10 py-5">
          <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em] text-ink">
            <NotebookPen className="size-5 text-oxblood" />
            Course Notes
          </CardTitle>
          <div className="flex items-center gap-2">
            {course.topics && course.topics.length > 0 && (
              <GenDropdownMenu>
                <GenDropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 rounded-xl border-ink/15 bg-white text-xs text-ink hover:bg-ink/[0.03]"
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
              className="h-11 rounded-xl bg-ink text-xs text-white hover:bg-ink-raised"
              onClick={openCreateDialog}
            >
              <Plus className="w-3.5 h-3.5" />
              New Note
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 py-5">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Search + Topic Filter */}
          {!isLoading && notes.length > 0 && (
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70" />
                <Input
                  placeholder="Search notes…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-xl border-ink/15 bg-white pl-9 text-sm shadow-sm"
                />
              </div>
              {course.topics && course.topics.length > 0 && (
                <Select
                  value={topicFilter === null ? "all" : String(topicFilter)}
                  onValueChange={(v) => setTopicFilter(v === "all" ? null : Number(v))}
                >
                  <SelectTrigger className="h-11 w-36 rounded-xl border-ink/15 bg-white text-xs shadow-sm">
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
                className="flex items-start justify-between rounded-xl border border-ink/10 bg-white p-4"
                >
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="ml-3 h-11 w-11 shrink-0 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            searchQuery || topicFilter !== null ? (
              <p className="py-6 text-center text-sm text-slate">
                No notes match your search.
              </p>
            ) : (
              <div className="py-10 text-center text-slate">
                <NotebookPen className="mx-auto mb-3 size-8 text-oxblood/45" />
                <p className="font-semibold text-ink">No notes yet</p>
                <p className="mt-1 text-sm">
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
                className="group flex cursor-pointer items-start justify-between rounded-xl border border-ink/10 bg-white p-4 transition-[border-color,box-shadow] hover:border-ink/20 hover:shadow-sm"
              >
                <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                  <p className="truncate text-sm font-semibold text-ink">
                    {note.title}
                  </p>
                  <p className="text-xs text-slate">
                    Updated {new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(note.updatedAt))}
                  </p>
                  <p className="line-clamp-2 text-xs leading-relaxed text-slate">
                    {note.content.replace(/[#*`_~>]/g, "").trim() || "No content"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 rounded-xl p-0 opacity-100 transition-[background-color] hover:bg-ink/[0.04]"
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
