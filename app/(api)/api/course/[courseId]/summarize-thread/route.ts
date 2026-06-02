import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { buildFastApiHeaders } from "@/utils/fastapi-auth";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

type ThreadMessage = { role: string; content: string };
type RequestBody = { messages: ThreadMessage[]; topicId?: number | null };
type Params = { params: Promise<{ courseId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { courseId: courseIdStr } = await params;
    const courseId = Number(courseIdStr);
    if (!Number.isFinite(courseId)) {
      return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: isMember } = await supabase.rpc("is_course_member", {
      _course_id: courseId,
      _user_id: user.id,
    });
    if (!isMember) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as RequestBody;
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ message: "messages array required" }, { status: 400 });
    }

    const { data: courseRow } = await adminSupabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .maybeSingle();
    const courseTitle =
      (courseRow as { title?: string } | null)?.title ?? "Engineering Board Exam";

    const headers = await buildFastApiHeaders(supabase, { "Content-Type": "application/json" });

    const fastapiRes = await fetch(`${FASTAPI_URL}/ai/summarize-thread`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: body.messages,
        course_title: courseTitle,
        topic_id: body.topicId ?? null,
      }),
    });

    if (!fastapiRes.ok) {
      throw new Error(`FastAPI returned ${fastapiRes.status}`);
    }

    const { title, content } = (await fastapiRes.json()) as {
      title: string;
      content: string;
    };

    const { error: insertError } = await adminSupabase.from("course_notes").insert({
      course_id: courseId,
      user_id: user.id,
      topic_id: body.topicId ?? null,
      title,
      content,
    });
    if (insertError) throw insertError;

    const { data: notes } = await adminSupabase
      .from("course_notes")
      .select("id, title, content, topic_id, created_at, updated_at")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    return NextResponse.json({ notes: notes ?? [] });
  } catch (err) {
    console.error("[summarize-thread]", err instanceof Error ? err.message : err);
    return NextResponse.json({ message: "Failed to summarize thread" }, { status: 500 });
  }
}
