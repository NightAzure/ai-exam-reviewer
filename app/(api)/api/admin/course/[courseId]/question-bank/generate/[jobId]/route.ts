import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";

type Params = { params: Promise<{ courseId: string; jobId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { courseId: courseIdStr, jobId: jobIdStr } = await params;
    const courseId = Number(courseIdStr);
    const jobId = Number(jobIdStr);
    if (!Number.isFinite(courseId) || !Number.isFinite(jobId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: isEditor } = await supabase.rpc("is_course_editor", {
      _course_id: courseId,
      _user_id: user.id,
    });
    if (!isEditor) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { data: job, error: jobError } = await adminSupabase
      .from("generation_jobs")
      .select("id, status, result, error, input_params, completed_at, attempt_count, max_attempts, heartbeat_at, run_after")
      .eq("id", jobId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (jobError) throw jobError;
    if (!job) return NextResponse.json({ message: "Job not found" }, { status: 404 });

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      questions: job.status === "done" ? job.result : null,
      error: job.error ?? null,
      completedAt: job.completed_at ?? null,
      attemptCount: job.attempt_count ?? 0,
      maxAttempts: job.max_attempts ?? 3,
      heartbeatAt: job.heartbeat_at ?? null,
      runAfter: job.run_after ?? null,
    });
  } catch (err) {
    console.error("[question-bank/generate GET]", err instanceof Error ? err.message : err);
    return NextResponse.json({ message: "Failed to fetch job status" }, { status: 500 });
  }
}
