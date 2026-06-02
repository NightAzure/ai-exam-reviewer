import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import type { CourseNote } from "@/types/course";

type NotePayload = {
  title?: string;
  content?: string;
  topicId?: number | null;
};

const parseCourseId = async (params: Promise<{ courseId: string }>) => {
  const { courseId } = await params;
  const parsed = Number(courseId);

  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid course id");
  }

  return parsed;
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  void request;

  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseMember(courseId);
    if (auth.error) return auth.error;
    if (!auth.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const notes = await loadNotes(courseId, auth.userId);
    return NextResponse.json({ notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notes";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const courseId = await parseCourseId(params);
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

    const { error } = await adminSupabase.from("course_notes").insert({
      course_id: courseId,
      user_id: auth.userId,
      topic_id: body.topicId ?? null,
      title,
      content,
    });

    if (error) throw error;

    const notes = await loadNotes(courseId, auth.userId);
    return NextResponse.json({ notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create note";
    return NextResponse.json({ message }, { status: 500 });
  }
}
