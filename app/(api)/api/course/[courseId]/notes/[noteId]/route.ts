import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import type { CourseNote } from "@/types/course";

type NotePayload = {
  title?: string;
  content?: string;
  topicId?: number | null;
};

const parseParams = async (params: Promise<{ courseId: string; noteId: string }>) => {
  const { courseId, noteId } = await params;
  const parsedCourseId = Number(courseId);
  const parsedNoteId = Number(noteId);

  if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedNoteId)) {
    throw new Error("Invalid route parameters");
  }

  return { courseId: parsedCourseId, noteId: parsedNoteId };
};

const requireCourseMember = async (courseId: number) => {
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

  const { data: isMember, error: memberError } = await supabase.rpc("is_course_member", {
    _course_id: courseId,
    _user_id: user.id,
  });

  if (memberError || !isMember) {
    return {
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
    };
  }

  return { error: null, userId: user.id };
};

const mapNoteRow = (row: {
  id: number;
  title: string;
  content: string;
  topic_id?: number | null;
  created_at: string;
  updated_at: string;
}): CourseNote => ({
  id: row.id,
  title: row.title,
  content: row.content,
  preview: row.content,
  topicId: row.topic_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const loadNotes = async (courseId: number, userId: string) => {
  const { data, error } = await adminSupabase
    .from("course_notes")
    .select("id, title, content, topic_id, created_at, updated_at")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapNoteRow);
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string; noteId: string }> },
) {
  try {
    const { courseId, noteId } = await parseParams(params);
    const auth = await requireCourseMember(courseId);
    if (auth.error) return auth.error;
    if (!auth.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as NotePayload;
    const title = body.title?.trim();
    const content = body.content?.trim() ?? "";

    if (!title) {
      return NextResponse.json({ message: "A note title is required" }, { status: 400 });
    }

    const { error } = await adminSupabase
      .from("course_notes")
      .update({
        title,
        content,
        topic_id: body.topicId ?? null,
      })
      .eq("id", noteId)
      .eq("course_id", courseId)
      .eq("user_id", auth.userId);

    if (error) throw error;

    const notes = await loadNotes(courseId, auth.userId);
    return NextResponse.json({ notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update note";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string; noteId: string }> },
) {
  void request;

  try {
    const { courseId, noteId } = await parseParams(params);
    const auth = await requireCourseMember(courseId);
    if (auth.error) return auth.error;
    if (!auth.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { error } = await adminSupabase
      .from("course_notes")
      .delete()
      .eq("id", noteId)
      .eq("course_id", courseId)
      .eq("user_id", auth.userId);

    if (error) throw error;

    const notes = await loadNotes(courseId, auth.userId);
    return NextResponse.json({ notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete note";
    return NextResponse.json({ message }, { status: 500 });
  }
}
