import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { buildFastApiHeaders } from "@/utils/fastapi-auth";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

type Params = { params: Promise<{ courseId: string; assessmentId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { courseId: courseIdStr } = await params;
    const courseId = Number(courseIdStr);
    if (!Number.isFinite(courseId)) {
      return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
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

    const body = await request.json();

    const headers = await buildFastApiHeaders(supabase, { "Content-Type": "application/json" });

    const fastapiRes = await fetch(`${FASTAPI_URL}/ai/hint`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!fastapiRes.ok) {
      throw new Error(`FastAPI returned ${fastapiRes.status}`);
    }

    const data = await fastapiRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[hint]", err instanceof Error ? err.message : err);
    return NextResponse.json({ message: "Failed to generate hint" }, { status: 500 });
  }
}
