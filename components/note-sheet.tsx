"use client";

import { ChevronDown, X, FileText, Download, Pencil } from "lucide-react";
import { Sheet, SheetContent } from "./ui/sheet";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { CourseNote, Note } from "@/types/course";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import NoteEditor from "./note-editor";
import { useEffect, useState } from "react";

interface NoteProps {
  open: boolean;
  currentNote: Note | CourseNote | undefined;
  setOpen: (open: boolean) => void;
  onSave?: (noteId: number, title: string, content: string) => Promise<void>;
  isSaving?: boolean;
}

export default function NoteSheet({ open, currentNote, setOpen, onSave, isSaving }: NoteProps) {
  const noteTimestamp =
    (currentNote as CourseNote | undefined)?.updatedAt ?? currentNote?.createdAt ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);

  const handleEditStart = () => {
    const note = currentNote as CourseNote | undefined;
    setEditTitle(note?.title ?? currentNote?.title ?? "");
    setEditContent(note?.content ?? currentNote?.preview ?? "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!onSave || !currentNote) return;
    await onSave((currentNote as CourseNote).id, editTitle, editContent);
    setIsEditing(false);
  };

  const handleExportText = () => {
    if (!currentNote) return;
    const content = (currentNote as CourseNote | undefined)?.content ?? currentNote?.preview ?? "";
    const title = currentNote.title ?? "note";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const noteContent = (currentNote as CourseNote | undefined)?.content ?? currentNote?.preview ?? "";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="[&>button:last-child]:hidden min-w-[85vw] sm:min-w-[80vw] md:min-w-[70vw] lg:min-w-[60vw] xl:min-w-[60vw] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between py-4 px-5 border-b bg-secondary/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
              <FileText className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground truncate">
                {isEditing ? (editTitle || "Untitled Note") : (currentNote?.title || "Untitled Note")}
              </h2>
              {currentNote?.createdAt && (
                <p className="text-sm text-muted-foreground">
                  Created {new Date(currentNote.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onSave && !isEditing && (
              <Button variant="outline" size="sm" className="gap-2" onClick={handleEditStart}>
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="size-4" />
                  Export
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onClick={handlePrint}>
                  <FileText className="size-4" />
                  Save as PDF
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={handleExportText}>
                  <FileText className="size-4" />
                  Export as Text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="size-9 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto print-note-content">
          <div className="pt-8 max-w-4xl mx-10">
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Note title"
                />
                <NoteEditor
                  key={`sheet-edit-${(currentNote as CourseNote | undefined)?.id ?? "new"}`}
                  value={editContent}
                  onChange={setEditContent}
                  minHeight="320px"
                />
              </div>
            ) : noteContent ? (
              <div className="prose prose-sm max-w-none dark:prose-invert text-foreground leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{noteContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-muted/50 rounded-full mb-4">
                  <FileText className="size-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No Content Available</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  This note appears to be empty or the content is still loading.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-background/95 backdrop-blur-sm p-4">
          {isEditing ? (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={isSaving || !editTitle.trim()}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  {noteContent.trim().split(/\s+/).filter(Boolean).length} words
                </span>
                <span>
                  Modified {noteTimestamp ? new Date(noteTimestamp).toLocaleString() : "Unknown"}
                </span>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
