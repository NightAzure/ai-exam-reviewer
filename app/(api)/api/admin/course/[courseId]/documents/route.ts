import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { requireCourseEditor } from "@/utils/supabase/course-auth";
import { buildFastApiHeaders } from "@/utils/fastapi-auth";
import type { CourseDocument } from "@/types/course-document";

const BUCKET_NAME = "course-documents";

const parseCourseId = async (params: Promise<{ courseId: string }>) => {
  const { courseId } = await params;
  const parsed = Number(courseId);

  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid course id");
  }

  return parsed;
};

const mapDocumentRow = (row: {
  id: number;
  title: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number | null;
  processing_status: CourseDocument["processingStatus"];
  uploaded_at: string;
}): CourseDocument => ({
  id: String(row.id),
  title: row.title,
  originalFilename: row.original_filename,
  mimeType: row.mime_type,
  fileSizeBytes: row.file_size_bytes,
  processingStatus: row.processing_status,
  uploadedAt: row.uploaded_at,
});

const listDocuments = async (courseId: number) => {
  const { data, error } = await adminSupabase
    .from("course_documents")
    .select("id, title, original_filename, mime_type, file_size_bytes, processing_status, uploaded_at")
    .eq("course_id", courseId)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapDocumentRow);
};

const ensureBucket = async () => {
  const { data: buckets, error: bucketsError } = await adminSupabase.storage.listBuckets();
  if (bucketsError) throw bucketsError;

  if (buckets.some((bucket) => bucket.name === BUCKET_NAME)) {
    return;
  }

  const { error } = await adminSupabase.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }
};

const sanitizeFileName = (fileName: string) =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, "-");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  void request;

  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;

    const documents = await listDocuments(courseId);
    return NextResponse.json({ documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load course documents";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;
    if (!auth.userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await ensureBucket();

    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ message: "No files were provided" }, { status: 400 });
    }

    const fastapiUrl = process.env.FASTAPI_URL ?? "http://localhost:8000";
    const supabase = await createClient();
    const fastApiHeaders = await buildFastApiHeaders(supabase, {
      "Content-Type": "application/json",
    });

    for (const file of files) {
      const storagePath = `course-${courseId}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await adminSupabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: inserted, error: insertError } = await adminSupabase
        .from("course_documents")
        .insert({
          course_id: courseId,
          uploaded_by: auth.userId,
          title: file.name.replace(/\.[^.]+$/, ""),
          original_filename: file.name,
          mime_type: file.type || "application/octet-stream",
          file_size_bytes: file.size,
          storage_bucket: BUCKET_NAME,
          storage_path: storagePath,
          processing_status: "uploaded",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Trigger FastAPI ingestion — fire-and-forget (returns 202 immediately)
      if (inserted?.id) {
        fetch(`${fastapiUrl}/ai/ingest-document`, {
          method: "POST",
          headers: fastApiHeaders,
          body: JSON.stringify({ document_id: inserted.id, course_id: courseId }),
        }).catch(() => {});
      }
    }

    const documents = await listDocuments(courseId);
    return NextResponse.json({ documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload documents";
    return NextResponse.json({ message }, { status: 500 });
  }
}
