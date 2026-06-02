"use client";

import { createAssistantStream } from "assistant-stream";
import type { FC, PropsWithChildren } from "react";
import { useMemo } from "react";
import {
  RuntimeAdapterProvider,
  type ExportedMessageRepository,
  type ExportedMessageRepositoryItem,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
  type ThreadMessage,
  useAui,
} from "@assistant-ui/react";
import type {
  RemoteThreadListResponse,
  RemoteThreadMetadata,
} from "@assistant-ui/core";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseThreadListAdapterOptions = {
  courseId: number;
  model: string;
  supabase: SupabaseClient;
};

type ChatThreadRow = {
  id: number;
  title: string | null;
  archived: boolean;
  model: string | null;
  updated_at: string;
};

type ChatMessageRow = {
  id: number;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_payload: ChatMessagePayload | null;
  created_at: string;
};

type ChatMessagePayload = {
  assistantUiMessage?: ThreadMessage;
  localMessageId?: string;
  parentId?: string | null;
  runConfig?: Record<string, unknown> | null;
};

class ChatThreadNotFoundError extends Error {
  constructor() {
    super("This chat thread could not be found.");
    this.name = "ChatThreadNotFoundError";
  }
}

const DEFAULT_TITLE = "New Chat";
const EMPTY_CONTENT = "[empty message]";

const normalizeThreadMessage = (message: ThreadMessage): ThreadMessage => {
  return {
    ...message,
    createdAt:
      message.createdAt instanceof Date
        ? message.createdAt
        : new Date(message.createdAt),
  } as ThreadMessage;
};

const getMessageText = (message: ThreadMessage): string => {
  const parts = Array.isArray(message.content) ? message.content : [];
  const text = parts
    .flatMap((part) => {
      if (part.type === "text" || part.type === "reasoning") return [part.text];
      if (part.type === "tool-call") return [part.argsText];
      return [];
    })
    .join(" ")
    .trim();

  return text || EMPTY_CONTENT;
};

const toFallbackThreadMessage = (
  row: ChatMessageRow,
  localMessageId?: string,
): ThreadMessage => {
  const base = {
    id: localMessageId ?? `chat-message-${row.id}`,
    createdAt: new Date(row.created_at),
    metadata: { custom: {} },
  };

  if (row.role === "assistant") {
    return {
      ...base,
      role: "assistant",
      status: { type: "complete", reason: "unknown" },
      content: [{ type: "text", text: row.content }],
    } as unknown as ThreadMessage;
  }

  if (row.role === "system") {
    return {
      ...base,
      role: "system",
      content: [{ type: "text", text: row.content }],
    } as unknown as ThreadMessage;
  }

  return {
    ...base,
    role: row.role === "tool" ? "assistant" : "user",
    attachments: [],
    content: [{ type: "text", text: row.content }],
  } as unknown as ThreadMessage;
};

const getInitialTitle = (messages: readonly ThreadMessage[]): string => {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return DEFAULT_TITLE;

  const title = getMessageText(firstUserMessage)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return title || DEFAULT_TITLE;
};

/** Fresh `getUser()` each call so message saves and thread fetches use the current session after login. */
const createAuthUserResolver = (supabase: SupabaseClient) => {
  return async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user?.id) {
      throw new Error("You must be signed in to save chat history.");
    }
    return data.user.id;
  };
};

class SupabaseThreadHistoryAdapter implements ThreadHistoryAdapter {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly aui: ReturnType<typeof useAui>,
    private readonly model: string,
    private readonly courseId: number,
    private readonly getUserId: () => Promise<string>,
  ) {}

  private async getRemoteThreadId() {
    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return null;

    const threadId = Number(remoteId);
    return Number.isFinite(threadId) ? threadId : null;
  }

  private async touchThread(threadId: number, titleHint?: string) {
    await this.assertThreadAccess(threadId);
    const update: Record<string, unknown> = { model: this.model };

    if (titleHint) {
      const { data: thread } = await this.supabase
        .from("chat_threads")
        .select("title")
        .eq("id", threadId)
        .single();

      if (!thread?.title) {
        update.title = titleHint;
      }
    }

    const { error } = await this.supabase
      .from("chat_threads")
      .update(update)
      .eq("id", threadId);

    if (error) throw error;
  }

  private async assertThreadAccess(threadId: number) {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from("chat_threads")
      .select("id")
      .eq("id", threadId)
      .eq("course_id", this.courseId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new ChatThreadNotFoundError();
    }
  }

  async load(): Promise<ExportedMessageRepository> {
    const threadId = await this.getRemoteThreadId();
    if (!threadId) return { messages: [] };
    await this.assertThreadAccess(threadId);

    const { data, error } = await this.supabase
      .from("chat_messages")
      .select("id, role, content, tool_payload, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as ChatMessageRow[];
    let previousId: string | null = null;

    const messages = rows.map((row) => {
      const payload = row.tool_payload ?? null;
      const normalizedMessage = payload?.assistantUiMessage
        ? normalizeThreadMessage(payload.assistantUiMessage)
        : toFallbackThreadMessage(row, payload?.localMessageId);

      const parentId =
        payload?.parentId === undefined ? previousId : payload.parentId;

      previousId = normalizedMessage.id;

      return {
        parentId,
        message: normalizedMessage,
        runConfig: payload?.runConfig ?? undefined,
      };
    });

    return {
      headId: previousId,
      messages,
    };
  }

  async append(item: ExportedMessageRepositoryItem): Promise<void> {
    const { remoteId } = await this.aui.threadListItem().initialize();
    const threadId = Number(remoteId);

    if (!Number.isFinite(threadId)) {
      throw new Error("Invalid remote thread ID.");
    }

    await this.assertThreadAccess(threadId);
    const userId = await this.getUserId();

    const payload: ChatMessagePayload = {
      assistantUiMessage: item.message,
      localMessageId: item.message.id,
      parentId: item.parentId,
      runConfig:
        item.runConfig && Object.keys(item.runConfig).length > 0
          ? item.runConfig
          : null,
    };

    const titleHint =
      item.message.role === "user" ? getInitialTitle([item.message]) : undefined;

    const { data: existing, error: existingError } = await this.supabase
      .from("chat_messages")
      .select("id")
      .eq("thread_id", threadId)
      .contains("tool_payload", { localMessageId: item.message.id })
      .maybeSingle();

    if (existingError) throw existingError;

    const messageRecord = {
      thread_id: threadId,
      role: item.message.role,
      user_id: userId,
      model: this.model,
      content: getMessageText(item.message),
      tool_payload: payload,
      created_at: item.message.createdAt.toISOString(),
    };

    if (existing?.id) {
      const { error } = await this.supabase
        .from("chat_messages")
        .update(messageRecord)
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      const { error } = await this.supabase
        .from("chat_messages")
        .insert(messageRecord);

      if (error) throw error;
    }

    await this.touchThread(threadId, titleHint);
  }
}

const createHistoryProvider = (
  supabase: SupabaseClient,
  model: string,
  courseId: number,
  getUserId: () => Promise<string>,
): FC<PropsWithChildren> => {
  const Provider: FC<PropsWithChildren> = ({ children }) => {
    const aui = useAui();
    const history = useMemo(
      () => new SupabaseThreadHistoryAdapter(supabase, aui, model, courseId, getUserId),
      [aui],
    );

    const adapters = useMemo(() => ({ history }), [history]);

    return (
      <RuntimeAdapterProvider adapters={adapters}>
        {children}
      </RuntimeAdapterProvider>
    );
  };

  return Provider;
};

export const createSupabaseThreadListAdapter = ({
  courseId,
  model,
  supabase,
}: SupabaseThreadListAdapterOptions): RemoteThreadListAdapter => {
  const getUserId = createAuthUserResolver(supabase);

  const dedupeThreads = (rows: ChatThreadRow[]) => {
    const seen = new Set<number>();
    return rows.filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
  };

  const mapRowToMetadata = (row: ChatThreadRow): RemoteThreadMetadata => ({
    remoteId: String(row.id),
    status: row.archived ? "archived" : "regular",
    title: row.title ?? undefined,
  });

  const findReusableDraftThread = async (userId: string) => {
    const { data: candidateData, error: candidateError } = await supabase
      .from("chat_threads")
      .select("id, title, archived, model, updated_at")
      .eq("course_id", courseId)
      .eq("user_id", userId)
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (candidateError) throw candidateError;

    const candidates = dedupeThreads((candidateData ?? []) as ChatThreadRow[]).filter(
      (thread) => !thread.title || thread.title === DEFAULT_TITLE,
    );

    if (candidates.length === 0) return null;

    const candidateIds = candidates.map((thread) => thread.id);
    const { data: messageRows, error: messageError } = await supabase
      .from("chat_messages")
      .select("thread_id")
      .in("thread_id", candidateIds);

    if (messageError) throw messageError;

    const usedThreadIds = new Set(
      (messageRows ?? []).map((row) => Number((row as { thread_id: number }).thread_id)),
    );

    return candidates.find((thread) => !usedThreadIds.has(thread.id)) ?? null;
  };

  return {
    unstable_Provider: createHistoryProvider(supabase, model, courseId, getUserId),

    async list(): Promise<RemoteThreadListResponse> {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id, title, archived, model, updated_at")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return {
        threads: dedupeThreads((data ?? []) as ChatThreadRow[]).map(mapRowToMetadata),
      };
    },

    async initialize(threadId: string) {
      void threadId;
      const userId = await getUserId();
      const reusableThread = await findReusableDraftThread(userId);

      if (reusableThread) {
        return {
          remoteId: String(reusableThread.id),
          externalId: undefined,
        };
      }

      const { data, error } = await supabase
        .from("chat_threads")
        .insert({
          course_id: courseId,
          user_id: userId,
          model,
        })
        .select("id")
        .single();

      if (error) throw error;

      return {
        remoteId: String(data.id),
        externalId: undefined,
      };
    },

    async rename(remoteId: string, newTitle: string) {
      const userId = await getUserId();
      const { error } = await supabase
        .from("chat_threads")
        .update({ title: newTitle })
        .eq("id", Number(remoteId))
        .eq("user_id", userId);

      if (error) throw error;
    },

    async archive(remoteId: string) {
      const userId = await getUserId();
      const { error } = await supabase
        .from("chat_threads")
        .update({ archived: true })
        .eq("id", Number(remoteId))
        .eq("user_id", userId);

      if (error) throw error;
    },

    async unarchive(remoteId: string) {
      const userId = await getUserId();
      const { error } = await supabase
        .from("chat_threads")
        .update({ archived: false })
        .eq("id", Number(remoteId))
        .eq("user_id", userId);

      if (error) throw error;
    },

    async delete(remoteId: string) {
      const userId = await getUserId();
      const { error } = await supabase
        .from("chat_threads")
        .delete()
        .eq("id", Number(remoteId))
        .eq("user_id", userId);

      if (error) throw error;
    },

    async fetch(threadId: string) {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id, title, archived, model, updated_at")
        .eq("id", Number(threadId))
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new ChatThreadNotFoundError();

      return mapRowToMetadata(data as ChatThreadRow);
    },

    async generateTitle(remoteId: string, messages: readonly ThreadMessage[]) {
      const title = getInitialTitle(messages);
      if (title !== DEFAULT_TITLE) {
        const userId = await getUserId();
        const { error } = await supabase
          .from("chat_threads")
          .update({ title })
          .eq("id", Number(remoteId))
          .eq("user_id", userId);

        if (error) throw error;
      }

      return createAssistantStream((controller) => {
        controller.appendText(title);
      });
    },
  };
};
