import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ErrorPrimitive,
  useAuiState,
  useMessage,
} from "@assistant-ui/react";
import type { FC } from "react";
import React, { createContext, useContext, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  CopyIcon,
  CheckIcon,
  PencilIcon,
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Square,
  Bookmark,
  Sparkles,
} from "lucide-react";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarkdownText } from "./markdown-text";
import { ToolFallback } from "./tool-fallback";
import { Input } from "../ui/input";
import { DetailedCourse } from "@/types/course";
import OverviewPopover from "../topics-popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { mutate as swrMutate } from "swr";


const CourseIdContext = createContext<number | null>(null);

//temp
interface ThreadProps {
  course: DetailedCourse;
  activeChatId?: string;
}
export const Thread: FC<ThreadProps> = ({course, activeChatId}) => {
  const remoteId = useAuiState((state) => state.threadListItem.remoteId);
  const isLoadingThreads = useAuiState((state) => state.threads.isLoading);
  const isRestoringThread =
    Boolean(activeChatId) &&
    (isLoadingThreads || remoteId == null || remoteId !== activeChatId);

  return (
    <CourseIdContext.Provider value={course.id}>
    <ThreadPrimitive.Root
      // aui-thread-root
      className="bg-canvas flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "48rem",
        ["--thread-padding-x" as string]: "1rem",
      }}
    >
      {/* aui-thread-viewport */}
      <ThreadPrimitive.Viewport className="relative flex min-w-0 flex-1 flex-col gap-6 overflow-y-scroll">
        {isRestoringThread ? <ThreadRestoreSkeleton /> : <ThreadWelcome course={course} />}

        {!isRestoringThread && (
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              EditComposer,
              AssistantMessage,
            }}
          />
        )}

        <ThreadPrimitive.If empty={false}>
          {/* aui-thread-viewport-spacer */}
          <motion.div className="min-h-6 min-w-6 shrink-0" />
        </ThreadPrimitive.If>
      </ThreadPrimitive.Viewport>

      <Composer course={course} activeChatId={activeChatId} />
    </ThreadPrimitive.Root>
    </CourseIdContext.Provider>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        // aui-thread-scroll-to-bottom
        className="dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const formatTopicLabel = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const buildWelcomeSuggestions = (course: DetailedCourse) => {
  const weakAreas = course.weaknesses.slice(0, 2);
  const lowProgressTopics = [...course.topics]
    .filter((topic) => topic.progress > 0 && topic.progress < 75)
    .sort((left, right) => left.progress - right.progress)
    .slice(0, 2)
    .map((topic) => topic.name);
  const starterTopics = course.topics.slice(0, 2).map((topic) => topic.name);
  const focusTopics = [...weakAreas, ...lowProgressTopics, ...starterTopics]
    .map(formatTopicLabel)
    .filter((topic, index, list) => topic && list.indexOf(topic) === index);

  const suggestions = focusTopics.slice(0, 3).map((topic, index) => ({
    title: index === 0 && weakAreas.length > 0 ? `Review ${topic}` : `Practice ${topic}`,
    label: index === 0 && weakAreas.length > 0 ? "start with my weakest area" : "ask me a few targeted questions",
    action:
      index === 0 && weakAreas.length > 0
        ? `Help me review ${topic}. Explain the core idea, then give me two practice questions.`
        : `Quiz me on ${topic} and explain each answer after I respond.`,
  }));

  if (course.suggestions[0]) {
    suggestions.unshift({
      title: "Use my course insight",
      label: course.suggestions[0],
      action: `${course.suggestions[0]} Give me a short study plan and one practice question.`,
    });
  }

  suggestions.push({
    title: `Plan ${course.title}`,
    label: "turn my topics into a study path",
    action: `Create a focused study plan for ${course.title} using my course topics and current progress.`,
  });

  return suggestions.slice(0, 4);
};

const ThreadWelcome: FC<{ course: DetailedCourse }> = ({ course }) => {
  const focusLabel = course.weaknesses[0]
    ? formatTopicLabel(course.weaknesses[0])
    : course.topics[0]?.name;

  return (
    <ThreadPrimitive.Empty>
      {/* aui-thread-welcome-root */}
      <div className="mx-auto flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col px-[var(--thread-padding-x)]">
        {/* aui-thread-welcome-center */}
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          {/* aui-thread-welcome-message */}
          <div className="flex size-full flex-col justify-center px-8 md:mt-20">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.5 }}
              // aui-thread-welcome-message-motion-1
              className="text-2xl font-semibold"
            >
              {course.title}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.6 }}
              // aui-thread-welcome-message-motion-2
              className="text-muted-foreground/65 text-2xl"
            >
              What should we untangle first?
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.7 }}
              className="mt-4 max-w-xl rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
            >
              I can use this course&apos;s topics
              {focusLabel ? `, including ${focusLabel},` : ""} to tailor explanations and practice.
            </motion.div>
          </div>
        </div>
      </div>
    </ThreadPrimitive.Empty>
  );
};

const ThreadWelcomeSuggestions: FC<{ course: DetailedCourse }> = ({ course }) => {
  const suggestions = buildWelcomeSuggestions(course);

  return (
    // aui-thread-welcome-suggestions
    <div className="grid w-full min-w-0 gap-2 sm:grid-cols-2">
      {suggestions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          // aui-thread-welcome-suggestion-display
          className="min-w-0 [&:nth-child(n+3)]:hidden sm:[&:nth-child(n+3)]:block"
        >
          <ThreadPrimitive.Suggestion
            prompt={suggestedAction.action}
            method="replace"
            autoSend
            asChild
          >
            <Button
              variant="ghost"
              // aui-thread-welcome-suggestion
              className="dark:hover:bg-accent/60 h-auto min-h-[4.5rem] w-full min-w-0 items-start justify-start gap-1 overflow-hidden rounded-xl border px-4 py-3 text-left text-sm"
              aria-label={suggestedAction.action}
            >
              {/* aui-thread-welcome-suggestion-text-1 */}
              <span className="block w-full min-w-0 truncate font-medium">{suggestedAction.title}</span>
              {/* aui-thread-welcome-suggestion-text-2 */}
              <p className="line-clamp-2 w-full min-w-0 whitespace-normal break-words text-muted-foreground">
                {suggestedAction.label}
              </p>
            </Button>
          </ThreadPrimitive.Suggestion>
        </motion.div>
      ))}
    </div>
  );
};
//edit here to add buttons and such above the chat input
const Composer: FC<ThreadProps> = ({course, activeChatId}) => {
  const remoteId = useAuiState((state) => state.threadListItem.remoteId);
  const isLoadingThreads = useAuiState((state) => state.threads.isLoading);
  const isRestoringThread =
    Boolean(activeChatId) &&
    (isLoadingThreads || remoteId == null || remoteId !== activeChatId);

  return (
    // aui-composer-wrapper
    <div className="bg-canvas relative mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-2 px-[var(--thread-padding-x)] pb-4 md:pb-6">
      <ThreadScrollToBottom />
      {!isRestoringThread && (
        <ThreadPrimitive.Empty>
          <div className="flex flex-col gap-4">
            <ThreadWelcomeSuggestions course={course} />
            <div className="flex justify-end gap-2">
              {course && <OverviewPopover course={course}/>}
            </div>
          </div>
        </ThreadPrimitive.Empty>
      )}
      <ThreadPrimitive.If empty={false} running={false}>
        <div className="flex justify-end">
          <SummarizeAsNoteButton courseId={course.id} />
        </div>
      </ThreadPrimitive.If>
      {/* aui-composer-root */}
      <ComposerPrimitive.Root className="focus-within::ring-offset-2 relative flex w-full flex-col rounded-2xl focus-within:ring-2 focus-within:ring-black dark:focus-within:ring-white">
        {/* aui-composer-input */}
        <div className="relative flex">
          <ComposerPrimitive.Input
            placeholder="Ask about a concept, paste a problem, or request a worked solution..."
            className="bg-muted border-border dark:border-muted-foreground/15 focus:outline-primary placeholder:text-muted-foreground max-h-[calc(50dvh)] min-h-13 w-full resize-none rounded-2xl border-x border-t pr-14 pt-3 pb-3 pl-12 text-base leading-6 outline-none"
            autoFocus
            aria-label="Message input"
          />
          <TooltipIconButton
            tooltip="Attach file"
            variant="ghost"
            // aui-composer-attachment-button
            className="absolute left-2 top-3 hover:bg-foreground/15 dark:hover:bg-background/50 scale-115 p-3.5"
            disabled
          >
            <PlusIcon />
          </TooltipIconButton>
          <div className="absolute right-0 flex items-center justify-between rounded-b-2xl p-2.5">
            <ThreadPrimitive.If running={false}>
              <ComposerPrimitive.Send asChild>
                <Button
                  type="submit"
                  variant="default"
                  // aui-composer-send
                  className="dark:border-muted-foreground/90 border-muted-foreground/60 hover:bg-primary/75 size-8 rounded-full border"
                  aria-label="Send message"
                >
                  {/* aui-composer-send-icon */}
                  <ArrowUpIcon className="size-5" />
                </Button>
              </ComposerPrimitive.Send>
            </ThreadPrimitive.If>

            <ThreadPrimitive.If running>
              <ComposerPrimitive.Cancel asChild>
                <Button
                  type="button"
                  variant="default"
                  // aui-composer-cancel
                  className="dark:border-muted-foreground/90 border-muted-foreground/60 hover:bg-primary/75 size-8 rounded-full border"
                  aria-label="Stop generating"
                >
                  {/* aui-composer-cancel-icon */}
                  <Square className="size-3.5 fill-white dark:size-4 dark:fill-black" />
                </Button>
              </ComposerPrimitive.Cancel>
            </ThreadPrimitive.If>
          </div>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
};

const SkeletonLine: FC<{ className?: string }> = ({ className }) => (
  <div className={cn("h-3 animate-pulse rounded-full bg-muted", className)} />
);

const ThreadRestoreSkeleton: FC = () => {
  return (
    <div className="mx-auto flex w-full max-w-[var(--thread-max-width)] flex-1 flex-col gap-6 px-[var(--thread-padding-x)] py-8">
      <div className="space-y-2">
        <SkeletonLine className="w-36" />
        <SkeletonLine className="w-56" />
      </div>

      <div className="flex justify-end">
        <div className="w-[min(78%,34rem)] space-y-2 rounded-2xl bg-primary/10 px-4 py-3">
          <SkeletonLine className="ml-auto w-11/12 bg-primary/15" />
          <SkeletonLine className="ml-auto w-7/12 bg-primary/15" />
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="size-8 animate-pulse rounded-full bg-muted" />
        <div className="space-y-3 rounded-2xl border border-border bg-muted/40 px-4 py-4">
          <SkeletonLine className="w-11/12" />
          <SkeletonLine className="w-full" />
          <SkeletonLine className="w-8/12" />
        </div>
      </div>

      <div className="flex justify-end">
        <div className="w-[min(64%,28rem)] space-y-2 rounded-2xl bg-primary/10 px-4 py-3">
          <SkeletonLine className="ml-auto w-full bg-primary/15" />
          <SkeletonLine className="ml-auto w-5/12 bg-primary/15" />
        </div>
      </div>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      {/* aui-message-error-root */}
      <ErrorPrimitive.Root className="border-destructive bg-destructive/10 dark:bg-destructive/5 text-destructive mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        {/* aui-message-error-message */}
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root asChild>
      <motion.div
        // aui-assistant-message-root
        className="relative mx-auto grid w-full max-w-[var(--thread-max-width)] grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_1fr] px-[var(--thread-padding-x)] py-4"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role="assistant"
      >
        {/* aui-assistant-message-avatar */}
        <div className="ring-border bg-background col-start-1 row-start-1 flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
          <StarIcon size={14} />
        </div>

        {/* aui-assistant-message-content */}
        <div className="text-ink col-start-2 row-start-1 ml-4 min-w-0 max-w-[min(42rem,100%)] overflow-hidden leading-7 break-words [overflow-wrap:anywhere]">
          <MessagePrimitive.Content
            components={{
              Text: MarkdownText,
              tools: { Fallback: ToolFallback },
            }}
          />
          <MessageError />
        </div>

        <AssistantActionBar />

        {/* aui-assistant-branch-picker */}
        <BranchPicker className="col-start-2 row-start-2 mr-2 -ml-2" />
      </motion.div>
    </MessagePrimitive.Root>
  );
};

const SaveToNoteButton: FC = () => {
  const courseId = useContext(CourseIdContext);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const message = useMessage();

  const handleOpenDialog = () => {
    if (!courseId) return;
    const text = message.content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    if (!text) return;
    const suggested = text.replace(/^#+\s*/gm, "").trim().slice(0, 60);
    setNoteTitle(suggested || `AI Chat — ${new Date().toLocaleDateString()}`);
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!courseId || !noteTitle.trim()) return;
    const text = message.content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    setSaving(true);
    try {
      await fetch(`/api/course/${courseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: noteTitle, content: text }),
      });
      void swrMutate(`/api/course/${courseId}/notes`);
      toast.success("Saved to Notes");
      setDialogOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  if (!courseId) return null;

  return (
    <>
      <TooltipIconButton
        tooltip={saved ? "Saved to Notes!" : "Save as Note"}
        onClick={handleOpenDialog}
      >
        {saved ? <CheckIcon /> : <Bookmark />}
      </TooltipIconButton>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as Note</DialogTitle>
          </DialogHeader>
          <Input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirm()}
              disabled={saving || !noteTitle.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const SummarizeAsNoteButton: FC<{ courseId: number }> = ({ courseId }) => {
  const [summarizing, setSummarizing] = useState(false);
  const messages = useAuiState(
    (state) => (state as unknown as { thread: { messages: Array<{ role: string; content: Array<{ type: string; text?: string }> }> } }).thread.messages,
  );

  const handleSummarize = async () => {
    const threadMessages = (messages ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.content
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("\n"),
      }))
      .filter((m) => m.content.trim().length > 0);

    if (threadMessages.length === 0) return;

    setSummarizing(true);
    try {
      await fetch(`/api/course/${courseId}/summarize-thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: threadMessages }),
      });
      void swrMutate(`/api/course/${courseId}/notes`);
      toast.success("Thread summarized and saved to Notes");
    } catch {
      toast.error("Failed to summarize thread");
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 text-xs gap-1.5"
      onClick={() => void handleSummarize()}
      disabled={summarizing}
    >
      <Sparkles className="w-3.5 h-3.5" />
      {summarizing ? "Summarizing..." : "Summarize as Note"}
    </Button>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      // aui-assistant-action-bar-root
      className="text-muted-foreground data-floating:bg-background col-start-3 row-start-2 mt-3 ml-3 flex gap-1 data-floating:absolute data-floating:mt-2 data-floating:rounded-md data-floating:border data-floating:p-1 data-floating:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <SaveToNoteButton />
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root asChild>
      <motion.div
        // aui-user-message-root
        className="mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(0,1fr)_auto] gap-y-1 px-[var(--thread-padding-x)] py-4 [&:where(>*)]:col-start-2"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role="user"
      >
        <UserActionBar />

        {/* aui-user-message-content */}
        <div className="bg-ink/[0.06] text-ink col-start-2 max-w-[min(36rem,82vw)] min-w-0 overflow-hidden rounded-2xl border border-ink/10 px-5 py-2.5 break-words [overflow-wrap:anywhere]">
          <MessagePrimitive.Content components={{ Text: MarkdownText }} />
        </div>

        {/* aui-user-branch-picker */}
        <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
      </motion.div>
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      // aui-user-action-bar-root
      className="col-start-1 mt-2.5 mr-3 flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    // aui-edit-composer-wrapper
    <div className="mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 px-[var(--thread-padding-x)]">
      {/* aui-edit-composer-root */}
      <ComposerPrimitive.Root className="bg-muted ml-auto flex w-full max-w-7/8 flex-col rounded-xl">
        {/* aui-edit-composer-input */}
        <ComposerPrimitive.Input
          className="text-foreground flex min-h-[60px] w-full resize-none bg-transparent p-4 outline-none"
          autoFocus
        />

        {/* aui-edit-composer-footer */}
        <div className="mx-3 mb-3 flex items-center justify-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm" aria-label="Cancel edit">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm" aria-label="Update message">
              Update
            </Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      // aui-branch-picker-root
      className={cn(
        "text-muted-foreground inline-flex items-center text-xs",
        className
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      {/* aui-branch-picker-state */}
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const StarIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 0L9.79611 6.20389L16 8L9.79611 9.79611L8 16L6.20389 9.79611L0 8L6.20389 6.20389L8 0Z"
      fill="currentColor"
    />
  </svg>
);
