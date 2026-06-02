"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Loader2,
  FileUp,
  FolderOpen,
} from "lucide-react";
import { useCourseDocuments } from "@/hooks/use-course-documents";

interface DocumentsTabProps {
  courseId: number;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const formatFileSize = (fileSizeBytes: number | null) => {
  if (!fileSizeBytes) return "Unknown size";
  if (fileSizeBytes >= 1024 * 1024) {
    return `${(fileSizeBytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`;
};

const getStatusLabel = (status: "uploaded" | "processing" | "ready" | "failed") => {
  switch (status) {
    case "ready":
      return "Ready";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    default:
      return "Uploaded";
  }
};

export function DocumentsTab({ courseId }: DocumentsTabProps) {
  const {
    documents,
    isLoading,
    isMutating,
    activeOperation,
    error,
    uploadDocuments,
    deleteDocument,
  } = useCourseDocuments(courseId);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: documents.length,
      totalSize: documents.reduce((sum, document) => sum + (document.fileSizeBytes ?? 0), 0),
      ready: documents.filter((document) => document.processingStatus === "ready").length,
    }),
    [documents],
  );

  const validateFiles = (files: File[]) => {
    const invalidType = files.find((file) => {
      const lowerName = file.name.toLowerCase();
      return !ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
    });

    if (invalidType) {
      return `${invalidType.name} is not supported. Upload PDF, DOCX, TXT, or MD files only.`;
    }

    const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      return `${tooLarge.name} is larger than 50 MB.`;
    }

    return null;
  };

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const validationError = validateFiles(files);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    await uploadDocuments(files);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await handleUpload(Array.from(files));
    event.target.value = "";
  };

  const handleDeleteDocument = async () => {
    if (!pendingDeleteId) return;
    await deleteDocument(pendingDeleteId);
    setPendingDeleteId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RAG Document Library</CardTitle>
        <CardDescription>
          Upload and manage the course documents used for retrieval and AI-assisted review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Documents</p>
            <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Stored Size</p>
            <p className="mt-2 text-2xl font-semibold">{formatFileSize(stats.totalSize)}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ready</p>
            <p className="mt-2 text-2xl font-semibold">{stats.ready}</p>
          </div>
        </div>

        <div>
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div
              className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const files = Array.from(event.dataTransfer.files ?? []);
                void handleUpload(files);
              }}
            >
              <FileUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-1 text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground">
                PDF, DOCX, TXT, and MD files supported. Maximum file size is 50 MB each.
              </p>
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(event) => {
                    event.preventDefault();
                    inputRef.current?.click();
                  }}
                  disabled={isMutating}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select Files
                </Button>
              </div>
            </div>
          </Label>
          <Input
            ref={inputRef}
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={(event) => void handleFileUpload(event)}
            className="hidden"
          />
        </div>

        {isMutating && activeOperation === "upload" && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Uploading documents...</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-medium">Uploaded Documents ({documents.length})</Label>
          </div>

          {isLoading ? (
            <div className="rounded-lg border py-12 text-center text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-12 w-12 animate-spin opacity-50" />
              <p className="text-sm">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-lg border py-12 text-center text-muted-foreground">
              <FolderOpen className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p className="text-sm font-medium">No documents uploaded yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload files here to build the course document library.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{doc.originalFilename}</p>
                          <Badge variant="outline">{getStatusLabel(doc.processingStatus)}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatFileSize(doc.fileSizeBytes)} {" • "}Uploaded{" "}
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{doc.mimeType || "Unknown type"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 lg:ml-4">
                      <Button variant="outline" asChild>
                        <a
                          href={`/api/admin/course/${courseId}/documents/${doc.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setPendingDeleteId(doc.id)}
                        disabled={isMutating}
                      >
                        {isMutating && activeOperation === "delete" && pendingDeleteId === doc.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <ConfirmationDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        onConfirm={handleDeleteDocument}
        title="Delete Document"
        description="Remove this document from the course library and delete its stored file."
        warningItems={[
          "The file will be removed from Supabase Storage",
          "Course AI retrieval will no longer be able to use this document",
          "You would need to upload it again to restore it",
        ]}
        confirmText="Delete Document"
        variant="destructive"
        isLoading={isMutating && activeOperation === "delete"}
      />
    </Card>
  );
}
