import { NextResponse } from "next/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { requireCourseEditor } from "@/utils/supabase/course-auth";

const parseParams = async (params: Promise<{ courseId: string; documentId: string }>) => {
  const { courseId, documentId } = await params;
  const parsedCourseId = Number(courseId);
  const parsedDocumentId = Number(documentId);

  if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedDocumentId)) {
    throw new Error("Invalid route parameters");
  }

  return { courseId: parsedCourseId, documentId: parsedDocumentId };
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; documentId: string }> },
) {
  void request;

  try {
    const { courseId, documentId } = await parseParams(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;

    const { data: document, error } = await adminSupabase
      .from("course_documents")
      .select("storage_bucket, storage_path")
      .eq("course_id", courseId)
      .eq("id", documentId)
      .single();

    if (error) throw error;
    if (!document) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 });
    }

    const { data: signedUrl, error: signedUrlError } = await adminSupabase.storage
      .from(document.storage_bucket)
      .createSignedUrl(document.storage_path, 60);

    if (signedUrlError) throw signedUrlError;

    return NextResponse.redirect(signedUrl.signedUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to download document";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string; documentId: string }> },
) {
  void request;

  try {
    const { courseId, documentId } = await parseParams(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;

    const { data: document, error } = await adminSupabase
      .from("course_documents")
      .select("storage_bucket, storage_path")
      .eq("course_id", courseId)
      .eq("id", documentId)
      .single();

    if (error) throw error;
    if (!document) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 });
    }

    const { error: storageError } = await adminSupabase.storage
      .from(document.storage_bucket)
      .remove([document.storage_path]);

    if (storageError) throw storageError;

    const { error: deleteError } = await adminSupabase
      .from("course_documents")
      .delete()
      .eq("course_id", courseId)
      .eq("id", documentId);

    if (deleteError) throw deleteError;

    const { data: documents, error: documentsError } = await adminSupabase
      .from("course_documents")
      .select("id, title, original_filename, mime_type, file_size_bytes, processing_status, uploaded_at")
      .eq("course_id", courseId)
      .order("uploaded_at", { ascending: false });

    if (documentsError) throw documentsError;

    return NextResponse.json({
      documents: (documents ?? []).map((row) => ({
        id: String(row.id),
        title: row.title,
        originalFilename: row.original_filename,
        mimeType: row.mime_type,
        fileSizeBytes: row.file_size_bytes,
        processingStatus: row.processing_status,
        uploadedAt: row.uploaded_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete document";
    return NextResponse.json({ message }, { status: 500 });
  }
}
