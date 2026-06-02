import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { buildFastApiHeaders } from "@/utils/fastapi-auth";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

type Params = { params: Promise<{ courseId: string; topicId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { courseId: courseIdStr, topicId: topicIdStr } = await params;
    const courseId = Number(courseIdStr);
    const topicId = Number(topicIdStr);
    if (!Number.isFinite(courseId) || !Number.isFinite(topicId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: isMember } = await supabase.rpc("is_course_member", {
      _course_id: courseId,
      _user_id: user.id,
    });
    if (!isMember) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const [topicRow, courseRow] = await Promise.all([
      adminSupabase.from("topics").select("name").eq("id", topicId).eq("course_id", courseId).maybeSingle(),
      adminSupabase.from("courses").select("title").eq("id", courseId).maybeSingle(),
    ]);

    if (!topicRow.data) {
      return NextResponse.json({ message: "Topic not found" }, { status: 404 });
    }

    const topicName = (topicRow.data as { name: string }).name;
    const courseTitle = (courseRow.data as { title?: string } | null)?.title ?? "Engineering Board Exam";

    const headers = await buildFastApiHeaders(supabase, { "Content-Type": "application/json" });

    const fastapiRes = await fetch(`${FASTAPI_URL}/ai/generate-notes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ topic: topicName, course_title: courseTitle }),
    });

    if (!fastapiRes.ok) {
      throw new Error(`FastAPI returned ${fastapiRes.status}`);
    }

    const { content } = (await fastapiRes.json()) as { content: string };

    const { data: note, error: insertError } = await adminSupabase
      .from("course_notes")
      .insert({
        course_id: courseId,
        user_id: user.id,
        topic_id: topicId,
        title: `${topicName} — AI Study Notes`,
        content,
      })
      .select("id, title, content, topic_id, created_at, updated_at")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ note });
  } catch (err) {
    console.error("[generate-note]", err instanceof Error ? err.message : err);
    return NextResponse.json({ message: "Failed to generate note" }, { status: 500 });
  }
}
