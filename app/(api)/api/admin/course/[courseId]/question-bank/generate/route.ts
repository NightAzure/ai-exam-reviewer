import { NextResponse } from "next/server";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { buildFastApiHeaders } from "@/utils/fastapi-auth";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const RUNNING_STALE_AFTER_MS = 30 * 60_000;
const FASTAPI_START_TIMEOUT_MS = Number(process.env.FASTAPI_GENERATION_WORK_TIMEOUT_MS ?? 300_000);
const QUESTION_GENERATION_QUEUE_URL = process.env.QUESTION_GENERATION_QUEUE_URL?.trim();
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const SHOW_WORKER_DEBUG = process.env.NODE_ENV !== "production";
const COGNITIVE_SKILLS = new Set(["recall", "application", "analysis", "calculation"]);

type Params = { params: Promise<{ courseId: string }> };
type GenerationTarget = {
  topic_id: number;
  topic_name: string;
  subtopic_id?: number | null;
  subtopic_name?: string | null;
  count: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  cognitive_skill?: "recall" | "application" | "analysis" | "calculation";
  custom_instruction?: string;
};

async function requireCourseEditor(courseId: number) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };

  const { data: isEditor } = await supabase.rpc("is_course_editor", {
    _course_id: courseId,
    _user_id: user.id,
  });
  if (!isEditor) return { user: null, error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };

  return { supabase, user, error: null };
}

async function markJobFailed(jobId: number, error: string) {
  await adminSupabase
    .from("generation_jobs")
    .update({
      status: "failed",
      error,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function enqueueGenerationJob(params: {
  jobId: number;
  courseId: number;
  courseTitle: string;
}) {
  if (!QUESTION_GENERATION_QUEUE_URL) return false;

  const client = new SQSClient({ region: AWS_REGION });
  await client.send(
    new SendMessageCommand({
      QueueUrl: QUESTION_GENERATION_QUEUE_URL,
      MessageBody: JSON.stringify({
        type: "question-generation",
        job_id: params.jobId,
        course_id: params.courseId,
        course_title: params.courseTitle,
        worker_endpoint: `${FASTAPI_URL}/generate-questions/work`,
      }),
      MessageAttributes: {
        jobType: { DataType: "String", StringValue: "question-generation" },
        courseId: { DataType: "Number", StringValue: String(params.courseId) },
        jobId: { DataType: "Number", StringValue: String(params.jobId) },
      },
    }),
  );

  return true;
}

async function normalizeGenerationTargets(
  courseId: number,
  body: {
    targets?: Partial<GenerationTarget>[];
    topics?: string[];
    count_per_topic?: number;
    difficulty?: number;
  },
): Promise<GenerationTarget[]> {
  const [{ data: topicsData, error: topicsError }, { data: subtopicsData, error: subtopicsError }] =
    await Promise.all([
      adminSupabase.from("topics").select("id, name").eq("course_id", courseId),
      adminSupabase.from("topic_subtopics").select("id, topic_id, name").eq("course_id", courseId),
    ]);

  if (topicsError) throw topicsError;
  if (subtopicsError) throw subtopicsError;

  const topicsById = new Map((topicsData ?? []).map((topic) => [Number(topic.id), topic.name as string]));
  const topicsByName = new Map(
    (topicsData ?? []).map((topic) => [
      String(topic.name).trim().toLowerCase(),
      { id: Number(topic.id), name: topic.name as string },
    ]),
  );
  const subtopicsById = new Map(
    (subtopicsData ?? []).map((subtopic) => [
      Number(subtopic.id),
      { topicId: Number(subtopic.topic_id), name: subtopic.name as string },
    ]),
  );

  const requestedTargets: Partial<GenerationTarget>[] =
    Array.isArray(body.targets) && body.targets.length > 0
      ? body.targets
      : (body.topics ?? []).map((topicName) => {
          const topic = topicsByName.get(String(topicName).trim().toLowerCase());
          return {
            topic_id: topic?.id,
            topic_name: topic?.name ?? topicName,
            count: body.count_per_topic ?? 5,
            difficulty: (body.difficulty ?? 3) as GenerationTarget["difficulty"],
            cognitive_skill: "application",
          };
        });

  if (!Array.isArray(requestedTargets) || requestedTargets.length === 0) {
    throw new Error("targets must be a non-empty array");
  }
  if (requestedTargets.length > 20) {
    throw new Error("targets must contain at most 20 items");
  }

  return requestedTargets.map((target, index) => {
    const topicId = Number(target.topic_id);
    if (!Number.isFinite(topicId) || !topicsById.has(topicId)) {
      throw new Error(`Target ${index + 1} has an invalid topic_id`);
    }

    const count = Number(target.count ?? body.count_per_topic ?? 5);
    const difficulty = Number(target.difficulty ?? body.difficulty ?? 3);
    if (!Number.isInteger(count) || count < 1 || count > 10) {
      throw new Error(`Target ${index + 1} count must be 1-10`);
    }
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
      throw new Error(`Target ${index + 1} difficulty must be 1-5`);
    }

    const subtopicId =
      target.subtopic_id == null || target.subtopic_id === 0 ? null : Number(target.subtopic_id);
    let subtopicName = target.subtopic_name?.trim() || null;
    if (subtopicId != null) {
      const subtopic = subtopicsById.get(subtopicId);
      if (!subtopic || subtopic.topicId !== topicId) {
        throw new Error(`Target ${index + 1} has an invalid subtopic_id`);
      }
      subtopicName = subtopic.name;
    }

    const skill =
      typeof target.cognitive_skill === "string" && COGNITIVE_SKILLS.has(target.cognitive_skill)
        ? target.cognitive_skill
        : "application";

    return {
      topic_id: topicId,
      topic_name: topicsById.get(topicId)!,
      subtopic_id: subtopicId,
      subtopic_name: subtopicName,
      count,
      difficulty: difficulty as GenerationTarget["difficulty"],
      cognitive_skill: skill as GenerationTarget["cognitive_skill"],
      custom_instruction: target.custom_instruction?.trim().slice(0, 1000) || undefined,
    };
  });
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { courseId: courseIdStr } = await params;
    const courseId = Number(courseIdStr);
    if (!Number.isFinite(courseId)) {
      return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
    }

    const { supabase, user, error: authError } = await requireCourseEditor(courseId);
    if (authError || !user) return authError!;

    const body = (await request.json()) as {
      targets?: Partial<GenerationTarget>[];
      topics?: string[];
      count_per_topic?: number;
      difficulty?: number;
    };

    let targets: GenerationTarget[];
    try {
      targets = await normalizeGenerationTargets(courseId, body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid generation targets";
      return NextResponse.json({ message }, { status: 400 });
    }

    const now = Date.now();
    await Promise.all([
      adminSupabase
        .from("generation_jobs")
        .update({
          status: "queued",
          error: "Generation job lease expired; queued for retry.",
          run_after: new Date(now).toISOString(),
          locked_at: null,
          locked_by: null,
          heartbeat_at: null,
        })
        .eq("course_id", courseId)
        .eq("status", "running")
        .lt("heartbeat_at", new Date(now - RUNNING_STALE_AFTER_MS).toISOString()),
    ]);

    // Block if there's already an active job for this course
    const { data: activeJob } = await adminSupabase
      .from("generation_jobs")
      .select("id")
      .eq("course_id", courseId)
      .in("status", ["queued", "running"])
      .maybeSingle();

    if (activeJob) {
      return NextResponse.json(
        { message: "A generation job is already running for this course", jobId: activeJob.id },
        { status: 409 },
      );
    }

    const [courseRow, jobInsert] = await Promise.all([
      adminSupabase.from("courses").select("title").eq("id", courseId).maybeSingle(),
      adminSupabase
        .from("generation_jobs")
        .insert({
          course_id: courseId,
          created_by: user.id,
          status: "queued",
          job_type: "questions",
          input_params: { targets },
        })
        .select("id")
        .single(),
    ]);

    if (jobInsert.error || !jobInsert.data) {
      throw jobInsert.error ?? new Error("Failed to create generation job");
    }

    const jobId = jobInsert.data.id as number;
    const courseTitle = (courseRow.data as { title?: string } | null)?.title ?? "Engineering Board Exam";

    const queuedWithSqs = await enqueueGenerationJob({ jobId, courseId, courseTitle });
    if (queuedWithSqs) {
      return NextResponse.json({ jobId, status: "queued", queue: "sqs" });
    }

    const headers = await buildFastApiHeaders(supabase, { "Content-Type": "application/json" });
    const fastApiEndpoint = `${FASTAPI_URL}/generate-questions/work`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FASTAPI_START_TIMEOUT_MS);

    try {
      console.info("[question-bank/generate] Starting FastAPI worker:", {
        jobId,
        courseId,
        url: fastApiEndpoint,
      });

      const fastApiRes = await fetch(fastApiEndpoint, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          job_id: jobId,
          worker_id: `next-direct-${jobId}`,
        }),
      });

      if (!fastApiRes.ok) {
        const errorText = await fastApiRes.text().catch(() => "");
        const message = errorText || `FastAPI returned ${fastApiRes.status}`;
        const workerError = `FastAPI worker ${fastApiEndpoint} failed: ${message}`;
        console.error("[question-bank/generate] FastAPI worker returned an error:", {
          jobId,
          courseId,
          url: fastApiEndpoint,
          status: fastApiRes.status,
          message,
        });
        await markJobFailed(jobId, workerError);
        return NextResponse.json(
          {
            message: "Failed to start generation worker",
            ...(SHOW_WORKER_DEBUG ? { debug: { workerUrl: fastApiEndpoint, workerStatus: fastApiRes.status, workerMessage: message } } : {}),
          },
          { status: 502 },
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "FastAPI call failed";
      const workerError = `Failed to reach FastAPI worker ${fastApiEndpoint}: ${message}`;
      console.error("[question-bank/generate] FastAPI call failed:", {
        jobId,
        courseId,
        url: fastApiEndpoint,
        message,
      });
      await markJobFailed(jobId, workerError);
      return NextResponse.json(
        {
          message: "Failed to reach generation worker",
          ...(SHOW_WORKER_DEBUG ? { debug: { workerUrl: fastApiEndpoint, workerMessage: message } } : {}),
        },
        { status: 502 },
      );
    } finally {
      clearTimeout(timeout);
    }

    return NextResponse.json({
      jobId,
      status: "queued",
      queue: "direct-fastapi",
    });
  } catch (err) {
    console.error("[question-bank/generate POST]", err instanceof Error ? err.message : err);
    return NextResponse.json({ message: "Failed to start generation job" }, { status: 500 });
  }
}
