/**
 * Next.js API route: authenticates the user, loads their thread from Supabase (RLS + ownership),
 * then proxies to FastAPI with trusted conversation text for personalization.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { buildFastApiHeaders } from "@/utils/fastapi-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const FASTAPI_CHAT_TIMEOUT_MS = Number(process.env.FASTAPI_CHAT_TIMEOUT_MS ?? "55000") || 55000;

const MAX_TRUSTED_CONTEXT_CHARS = 12_000;
const MAX_MESSAGE_CONTENT_CHARS = 4_000;

const createRequestId = () =>
  `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

type IncomingMessagePart = {
  type?: string;
  text?: string;
};

type IncomingMessage = {
  role: string;
  parts?: IncomingMessagePart[];
  content?: string;
};

type ChatRequestBody = {
  messages?: IncomingMessage[];
  stream?: boolean;
  use_rag?: boolean;
  rag_results?: number;
  model?: string;
  /** Supabase chat_threads.id — server loads history only for this thread + user */
  threadId?: string | number;
  courseId?: number;
};

function formatThreadForModel(
  rows: { role: string; content: string }[],
  maxTotalChars: number,
): string {
  const lines = rows.map((row) => {
    const label = row.role === "user" ? "Student" : "Tutor";
    const text = row.content.trim().slice(0, MAX_MESSAGE_CONTENT_CHARS);
    return `${label}: ${text}`;
  });
  const acc: string[] = [];
  let len = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const piece = `${lines[i]}\n\n`;
    if (len + piece.length > maxTotalChars) {
      acc.unshift("...(earlier messages omitted)\n\n");
      break;
    }
    acc.unshift(piece);
    len += piece.length;
  }
  return acc.join("").trim();
}

async function loadTrustedConversationForUser(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  courseId: number;
  threadId: number;
}): Promise<string | null> {
  const { supabase, userId, courseId, threadId } = params;

  const { data: thread, error: threadError } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("id", threadId)
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (threadError) {
    console.error("[api/chat] thread ownership check:", threadError.message);
    return null;
  }
  if (!thread) {
    return null;
  }

  const { data: messages, error: msgError } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(120);

  if (msgError) {
    console.error("[api/chat] chat_messages:", msgError.message);
    return null;
  }

  const rows = (messages ?? [])
    .filter((m) => {
      const role = String(m.role ?? "").toLowerCase();
      return (role === "user" || role === "assistant") && typeof m.content === "string";
    })
    .map((m) => ({
      role: (m.role as string) === "user" ? "user" : "assistant",
      content: m.content as string,
    }));

  if (rows.length === 0) return null;

  const formatted = formatThreadForModel(rows, MAX_TRUSTED_CONTEXT_CHARS);
  return formatted || null;
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const body = (await request.json()) as ChatRequestBody;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to use the exam reviewer chat." },
        { status: 401 },
      );
    }

    const transformedMessages = (body.messages || []).map((message) => {
      let content = "";

      if (message.parts && Array.isArray(message.parts)) {
        content = message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text ?? "")
          .join(" ");
      } else if (message.content) {
        content = message.content;
      }

      return {
        role: message.role,
        content,
      };
    });

    let trustedConversationContext: string | null = null;
    let courseTitle: string | null = null;
    const courseId =
      typeof body.courseId === "number" && Number.isFinite(body.courseId)
        ? body.courseId
        : undefined;
    const rawThreadId = body.threadId;
    const threadIdNum =
      rawThreadId !== undefined && rawThreadId !== null && rawThreadId !== ""
        ? Number(rawThreadId)
        : NaN;

    if (courseId !== undefined && Number.isFinite(threadIdNum)) {
      const [conversationContext, courseRow] = await Promise.all([
        loadTrustedConversationForUser({
          supabase,
          userId: user.id,
          courseId,
          threadId: threadIdNum,
        }),
        supabase.from("courses").select("title").eq("id", courseId).maybeSingle(),
      ]);

      trustedConversationContext = conversationContext;

      if (courseRow.data && typeof (courseRow.data as { title?: string }).title === "string") {
        courseTitle = (courseRow.data as { title: string }).title;
      }
    }

    // Inject subject mastery context so the AI personalizes responses to the student's weak areas
    if (courseId !== undefined) {
      const { data: masteryRows } = await supabase
        .from("subject_mastery")
        .select("subject, mastery_score")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .order("mastery_score", { ascending: true })
        .limit(10);

      if (masteryRows && masteryRows.length > 0) {
        const rows = masteryRows as Array<{ subject: string; mastery_score: number }>;
        const weak = rows.slice(0, 3).map((r) => `${r.subject} (${r.mastery_score}%)`).join(", ");
        const strong = [...rows].reverse().slice(0, 3).map((r) => `${r.subject} (${r.mastery_score}%)`).join(", ");
        const masteryNote = `[Student mastery data — do not reveal these numbers directly]\nWeak subjects: ${weak}. Strong subjects: ${strong}.`;
        trustedConversationContext = trustedConversationContext
          ? `${trustedConversationContext}\n\n${masteryNote}`
          : masteryNote;
      }
    }

    const transformedBody = {
      messages: transformedMessages,
      stream: true,
      use_rag: body.use_rag !== undefined ? body.use_rag : true,
      rag_results:
        typeof body.rag_results === "number" && body.rag_results >= 1 && body.rag_results <= 20
          ? body.rag_results
          : 5,
      model: "ollama",
      trusted_conversation_context: trustedConversationContext ?? undefined,
      course_id: courseId,
      course_title: courseTitle ?? undefined,
      request_id: requestId,
    };

    const upstreamHeaders = await buildFastApiHeaders(supabase, {
      "Content-Type": "application/json",
    });

    const workerUrl = `${FASTAPI_URL}/chat/stream`;
    console.info("[api/chat] forwarding", {
      requestId,
      workerUrl,
      courseId,
      threadId: Number.isFinite(threadIdNum) ? threadIdNum : null,
      messageCount: transformedMessages.length,
      latestMessageLength: transformedMessages.at(-1)?.content?.length ?? 0,
      useRag: transformedBody.use_rag,
      ragResults: transformedBody.rag_results,
      hasTrustedContext: Boolean(trustedConversationContext),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FASTAPI_CHAT_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(workerUrl, {
        method: "POST",
        headers: upstreamHeaders,
        body: JSON.stringify(transformedBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const workerMessage = await response.text().catch(() => "");
      console.error("[api/chat] FastAPI error", {
        requestId,
        workerUrl,
        status: response.status,
        statusText: response.statusText,
        workerMessage,
      });
      return NextResponse.json(
        {
          error: `Backend error: ${response.status}`,
          debug: {
            requestId,
            workerUrl,
            workerStatus: response.status,
            workerMessage,
          },
        },
        { status: response.status },
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Chat-Request-Id": requestId,
      },
    });
  } catch (error) {
    console.error("[api/chat] route failed", { requestId, error });

    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      return NextResponse.json(
        {
          error: "Cannot connect to backend server. Make sure FastAPI is running at FASTAPI_URL.",
          debug: {
            requestId,
            workerUrl: `${FASTAPI_URL}/chat/stream`,
          },
          hint:
            "If the model runs on your PC: start Ollama + uvicorn, expose FastAPI with a tunnel if needed (see server/HOME_GPU_PROXY.md), then set FASTAPI_URL and TUTOR_API_KEY on the Next.js host.",
        },
        { status: 503 },
      );
    }

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          error: "Backend chat request timed out.",
          debug: {
            requestId,
            workerUrl: `${FASTAPI_URL}/chat/stream`,
            timeoutMs: FASTAPI_CHAT_TIMEOUT_MS,
          },
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        debug: { requestId },
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Chat API Route",
    backend: FASTAPI_URL,
    status: "Use POST (signed in) to send messages",
  });
}
