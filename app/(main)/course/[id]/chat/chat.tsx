"use client";
import React from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { createSupabaseThreadListAdapter } from "@/components/assistant-ui/supabase-thread-list-adapter";
import {
  AssistantRuntimeProvider,
  useAssistantRuntime,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  useAuiState,
} from "@assistant-ui/react";
import { QuizToolUI } from "@/components/quiz-tool";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useChatCourse } from "@/hooks/use-chat-course";
import { useCourseAnalytics } from "@/hooks/use-course-analytics";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  ChatModelRunOptions,
  ChatModelRunResult,
} from "@assistant-ui/react";
import { useSWRConfig } from "swr";

interface ChatProps {
  courseId: number;
  activeChatId?: string;
}

type ApiMessage = {
  id: string;
  role: string;
  parts: Array<{ type: "text"; text: string }>;
};

type MessageContentPart = {
  type?: string;
  text?: string;
};

type MessageInput = {
  id?: string;
  role: string;
  content?:
    | string
    | { text?: string }
    | MessageContentPart[]
    | undefined;
};

const toApiMessages = (messages: readonly MessageInput[]): ApiMessage[] => {
  return messages.map((msg) => {
    let textContent = "";

    if (typeof msg.content === "string") {
      textContent = msg.content;
    } else if (Array.isArray(msg.content)) {
      textContent = msg.content
        .filter((part): part is MessageContentPart => part.type === "text")
        .map((part) => part.text ?? "")
        .join(" ");
    } else if (msg.content?.text) {
      textContent = msg.content.text;
    }

    return {
      id: msg.id || Date.now().toString(),
      role: msg.role,
      parts: [{ type: "text", text: textContent }],
    };
  });
};

type ChatRouteSyncProps = {
  courseId: number;
  activeChatId?: string;
  onRouteIssue: (message: string | null) => void;
};

type ChatStatusBannerProps = {
  activeChatId?: string;
  routeIssue: string | null;
  sendIssue: string | null;
};

function ChatRouteSync({ courseId, activeChatId, onRouteIssue }: ChatRouteSyncProps) {
  const runtime = useAssistantRuntime();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const isLoading = useAuiState((state) => state.threads.isLoading);
  const threadIds = useAuiState((state) => state.threads.threadIds);
  const archivedThreadIds = useAuiState((state) => state.threads.archivedThreadIds);
  const remoteId = useAuiState((state) => state.threadListItem.remoteId);
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const [routeSelectionFailed, setRouteSelectionFailed] = React.useState(false);
  const hasObservedThreadListLoad = React.useRef(false);
  const prevRemoteId = React.useRef<string | null | undefined>(undefined);
  const prevIsRunning = React.useRef(false);

  React.useEffect(() => {
    if (isLoading || threadIds.length > 0 || archivedThreadIds.length > 0) {
      hasObservedThreadListLoad.current = true;
    }
  }, [archivedThreadIds.length, isLoading, threadIds.length]);

  // Revalidate sidebar threads when a new thread is initialized
  React.useEffect(() => {
    if (prevRemoteId.current !== undefined && prevRemoteId.current !== remoteId && remoteId) {
      void mutate(["sidebar-threads", courseId]);
    }
    prevRemoteId.current = remoteId;
  }, [remoteId, courseId, mutate]);

  // Revalidate sidebar threads after AI finishes (title gets written then)
  React.useEffect(() => {
    if (prevIsRunning.current && !isRunning) {
      void mutate(["sidebar-threads", courseId]);
    }
    prevIsRunning.current = isRunning;
  }, [isRunning, courseId, mutate]);

  React.useEffect(() => {
    setRouteSelectionFailed(false);
    hasObservedThreadListLoad.current = false;
    onRouteIssue(null);
  }, [activeChatId, onRouteIssue]);

  React.useEffect(() => {
    if (!activeChatId || isLoading || remoteId === activeChatId || routeSelectionFailed) return;

    const isKnownThread =
      threadIds.includes(activeChatId) || archivedThreadIds.includes(activeChatId);

    if (!isKnownThread) {
      return;
    }

    runtime.threads.switchToThread(activeChatId).catch((error) => {
      console.error("Failed to switch to chat thread from route:", error);
      setRouteSelectionFailed(true);
      onRouteIssue("That saved thread could not be opened, so you were moved to a fresh chat.");
      router.replace(`/course/${courseId}/chat`);
    });
  }, [
    activeChatId,
    archivedThreadIds,
    courseId,
    isLoading,
    onRouteIssue,
    remoteId,
    routeSelectionFailed,
    router,
    runtime,
    threadIds,
  ]);

  React.useEffect(() => {
    if (!activeChatId || routeSelectionFailed || !hasObservedThreadListLoad.current || isLoading) {
      return;
    }

    const isKnownThread =
      threadIds.includes(activeChatId) || archivedThreadIds.includes(activeChatId);

    if (!isKnownThread) {
      setRouteSelectionFailed(true);
      onRouteIssue("That saved thread no longer exists or is not available.");
      router.replace(`/course/${courseId}/chat`);
    }
  }, [activeChatId, archivedThreadIds, courseId, isLoading, onRouteIssue, routeSelectionFailed, router, threadIds]);

  React.useEffect(() => {
    const waitingForRouteThread =
      Boolean(activeChatId) &&
      !routeSelectionFailed &&
      (isLoading || remoteId !== activeChatId);

    if (waitingForRouteThread) {
      return;
    }

    const nextPath = remoteId
      ? `/course/${courseId}/chat/${remoteId}`
      : `/course/${courseId}/chat`;

    if (typeof window !== "undefined" && window.location.pathname !== nextPath) {
      window.history.replaceState(window.history.state, "", nextPath);
    }
  }, [activeChatId, courseId, isLoading, remoteId, routeSelectionFailed]);

  return null;
}

function ChatStatusBanner({
  activeChatId,
  routeIssue,
  sendIssue,
}: ChatStatusBannerProps) {
  const isRunning = useAuiState((state) => state.thread.isRunning);

  void activeChatId;

  return (
    <>
      {routeIssue ? (
        <div className="px-4 pt-4">
          <Alert>
            <AlertTitle>Thread Restored With Fallback</AlertTitle>
            <AlertDescription>{routeIssue}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {sendIssue && !isRunning ? (
        <div className="px-4 pt-4">
          <Alert variant="destructive">
            <AlertTitle>Message Send Failed</AlertTitle>
            <AlertDescription>{sendIssue}</AlertDescription>
          </Alert>
        </div>
      ) : null}
    </>
  );
}

export default function Chat({ courseId, activeChatId }: ChatProps) {
  const { data: course } = useChatCourse(courseId);
  const { analytics } = useCourseAnalytics(courseId);
  const [threadRouteIssue, setThreadRouteIssue] = React.useState<string | null>(null);
  const [sendIssue, setSendIssue] = React.useState<string | null>(null);
  const handleThreadRouteIssue = React.useCallback((message: string | null) => {
    setThreadRouteIssue(message);
  }, []);
  const handleSendIssue = React.useCallback((message: string | null) => {
    setSendIssue(message);
  }, []);
  const supabase = React.useMemo(() => createClient(), []);

  const chatModel = React.useMemo(
    () => ({
      async *run({
        messages,
        abortSignal,
      }: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult, void> {
        const apiMessages = toApiMessages(messages as unknown as readonly MessageInput[]);
        handleSendIssue(null);

        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: apiMessages,
              model: "ollama",
              use_rag: true,
              rag_results: 5,
              courseId,
              threadId: activeChatId ?? undefined,
            }),
            signal: abortSignal,
          });
          const requestId = response.headers.get("X-Chat-Request-Id");

          if (!response.ok) {
            const errorText = await response.text();
            let message = `HTTP ${response.status}`;
            try {
              const errorJson = JSON.parse(errorText) as {
                error?: string;
                details?: string;
                debug?: { requestId?: string; workerUrl?: string; workerMessage?: string };
              };
              const debugId = errorJson.debug?.requestId ? ` requestId=${errorJson.debug.requestId}` : "";
              const workerUrl = errorJson.debug?.workerUrl ? ` worker=${errorJson.debug.workerUrl}` : "";
              const details = errorJson.details ? ` ${errorJson.details}` : "";
              const workerMessage = errorJson.debug?.workerMessage ? ` ${errorJson.debug.workerMessage}` : "";
              message = `HTTP ${response.status}: ${errorJson.error ?? errorText}${details}${workerMessage}${debugId}${workerUrl}`;
            } catch {
              message = `HTTP ${response.status}: ${errorText}`;
            }
            throw new Error(message);
          }

          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";
          let buffer = "";
          let doneReceived = false;

          while (!doneReceived) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              try {
                const parsed = JSON.parse(jsonStr) as {
                  chunk?: string;
                  done?: boolean;
                  error?: string;
                };
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.chunk) {
                  accumulated += parsed.chunk;
                  yield { content: [{ type: "text" as const, text: accumulated }] };
                }
                if (parsed.done) {
                  doneReceived = true;
                  break;
                }
              } catch (parseErr) {
                if (parseErr instanceof SyntaxError) continue;
                throw parseErr;
              }
            }
          }
          if (!accumulated.trim()) {
            throw new Error(
              `The tutor returned an empty response${requestId ? ` (requestId=${requestId})` : ""}. Check the FastAPI console for the matching chat/stream log.`,
            );
          }
        } catch (error) {
          if ((error as { name?: string }).name === "AbortError") return;
          const message = error instanceof Error ? error.message : "Unknown error";
          handleSendIssue(message);
          yield { content: [{ type: "text" as const, text: `Error: ${message}` }] };
        }
      },
    }),
    [handleSendIssue, courseId, activeChatId],
  );

  const threadListAdapter = React.useMemo(
    () =>
      createSupabaseThreadListAdapter({
        courseId,
        model: "ollama",
        supabase,
      }),
    [courseId, supabase],
  );

  function RuntimeHook() {
    return useLocalRuntime(chatModel);
  }

  const runtime = useRemoteThreadListRuntime({
    adapter: threadListAdapter,
    runtimeHook: RuntimeHook,
  });

  const courseForThread = React.useMemo(() => {
    if (!course) return course;

    return {
      ...course,
      overallProgress: analytics?.averageProgress ?? course.overallProgress,
      strengths: analytics?.strengths ?? course.strengths,
      weaknesses: analytics?.weaknesses ?? course.weaknesses,
      suggestions: analytics?.suggestions ?? course.suggestions,
      topics: course.topics.map((topic) => ({
        ...topic,
        progress:
          analytics?.topicProgress.find((entry) => entry.topicId === topic.id)?.progress ??
          topic.progress,
      })),
    };
  }, [analytics, course]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatRouteSync
        courseId={courseId}
        activeChatId={activeChatId}
        onRouteIssue={handleThreadRouteIssue}
      />
      <>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-hidden relative pt-10">
            <ChatStatusBanner
              activeChatId={activeChatId}
              routeIssue={threadRouteIssue}
              sendIssue={sendIssue}
            />
            {courseForThread && <Thread course={courseForThread} activeChatId={activeChatId} />}
          </div>
        </div>
        <QuizToolUI />
      </>
    </AssistantRuntimeProvider>
  );
}
