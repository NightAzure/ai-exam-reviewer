import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { isValidThumbnailUrl } from "@/utils/validation/thumbnail";

type CourseUpdatePayload = {
  title?: string;
  description?: string;
  thumbnail?: string | null;
  isActive?: boolean;
  allowSelfEnrollment?: boolean;
  requireEnrollmentApproval?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  enrollmentLimit?: number | null;
};

const requireCourseEditor = async (courseId: number) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      userId: null as string | null,
    };
  }

  const { data: isEditor, error: editorError } = await supabase.rpc("is_course_editor", {
    _course_id: courseId,
    _user_id: user.id,
  });

  if (editorError || !isEditor) {
    return {
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
    };
  }

  return { error: null, userId: user.id };
};

const requireCourseDeleteAccess = async (courseId: number) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      userId: null as string | null,
    };
  }

  const { data: course, error: courseError } = await adminSupabase
    .from("courses")
    .select("id, created_by, instructor_id")
    .eq("id", courseId)
    .single();

  if (courseError) {
    return {
      error: NextResponse.json({ message: "Course not found" }, { status: 404 }),
      userId: null as string | null,
    };
  }

  const canDelete = course.created_by === user.id || course.instructor_id === user.id;
  if (!canDelete) {
    return {
      error: NextResponse.json(
        { message: "Only the course creator or primary instructor can delete this course" },
        { status: 403 },
      ),
      userId: null as string | null,
    };
  }

  return { error: null, userId: user.id };
};

const parseCourseId = async (params: Promise<{ courseId: string }>) => {
  const { courseId } = await params;
  const parsed = Number(courseId);

  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid course id");
  }

  return parsed;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;

    const body = (await request.json()) as CourseUpdatePayload;
    const updatePayload: Record<string, unknown> = {};

    if (typeof body.title === "string") updatePayload.title = body.title.trim();
    if (typeof body.description === "string") updatePayload.description = body.description.trim();
    if (body.thumbnail !== undefined) {
      if (!isValidThumbnailUrl(body.thumbnail)) {
        return NextResponse.json(
          { message: "Thumbnail must be an https:// URL or a valid image data URL (JPEG, PNG, GIF, WebP, AVIF)." },
          { status: 400 },
        );
      }
      updatePayload.thumbnail_url = body.thumbnail;
    }
    if (typeof body.isActive === "boolean") updatePayload.is_active = body.isActive;
    if (typeof body.allowSelfEnrollment === "boolean") {
      updatePayload.allow_self_enrollment = body.allowSelfEnrollment;
    }
    if (typeof body.requireEnrollmentApproval === "boolean") {
      updatePayload.require_enrollment_approval = body.requireEnrollmentApproval;
    }
    if (body.startDate !== undefined) updatePayload.start_date = body.startDate;
    if (body.endDate !== undefined) updatePayload.end_date = body.endDate;
    if (body.enrollmentLimit !== undefined) updatePayload.enrollment_limit = body.enrollmentLimit;

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await adminSupabase.from("courses").update(updatePayload).eq("id", courseId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update course";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  void request;

  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseDeleteAccess(courseId);
    if (auth.error) return auth.error;

    const { data: documents, error: documentsError } = await adminSupabase
      .from("course_documents")
      .select("storage_bucket, storage_path")
      .eq("course_id", courseId);

    if (documentsError) throw documentsError;

    const bucketPaths = new Map<string, string[]>();
    for (const document of documents ?? []) {
      if (!document.storage_bucket || !document.storage_path) continue;

      const paths = bucketPaths.get(document.storage_bucket) ?? [];
      paths.push(document.storage_path);
      bucketPaths.set(document.storage_bucket, paths);
    }

    for (const [bucket, paths] of bucketPaths.entries()) {
      if (paths.length === 0) continue;

      const { error: storageError } = await adminSupabase.storage.from(bucket).remove(paths);
      if (storageError) throw storageError;
    }

    const { error: deleteError } = await adminSupabase.from("courses").delete().eq("id", courseId);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete course";
    return NextResponse.json({ message }, { status: 500 });
  }
}
