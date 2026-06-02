"use client";

import "@assistant-ui/react-markdown/styles/dot.css";
import "katex/dist/katex.min.css";

import { INTERNAL, useMessagePartText } from "@assistant-ui/react";
import {
  CodeHeaderProps,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
} from "@assistant-ui/react-markdown";
import classNames from "classnames";
import { CheckIcon, CopyIcon, Loader2 } from "lucide-react";
import type { ComponentPropsWithoutRef, FC } from "react";
import { forwardRef, memo, useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import {
  AssistantCodeOverride,
  AssistantDefaultCodeBlockContent,
  PreOverride,
  useIsMarkdownCodeBlock,
} from "@/components/assistant-ui/assistant-markdown-code";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  preprocessMathExpressions,
  splitForIncrementalMathMarkdown,
} from "@/lib/math-preprocessor";
import { cn } from "@/lib/utils";

const { useSmooth, useSmoothStatus, withSmoothContextProvider } = INTERNAL;

function MarkdownFencePre(props: ComponentPropsWithoutRef<"pre">) {
  return (
    <pre
      className={cn("overflow-x-auto rounded-b-lg bg-black p-4 text-white", props.className)}
      {...props}
    />
  );
}

function MarkdownFenceCode(props: ComponentPropsWithoutRef<"code">) {
  return <code {...props} />;
}

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-t-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
      <span className="lowercase [&>span]:text-xs">{language}</span>
      <TooltipIconButton tooltip="Copy" onClick={onCopy}>
        {!isCopied && <CopyIcon />}
        {isCopied && <CheckIcon />}
      </TooltipIconButton>
    </div>
  );
};

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};

const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1 className={cn("mb-8 scroll-m-20 text-4xl font-extrabold tracking-tight last:mb-0", className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className={cn("mb-4 mt-8 scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 last:mb-0", className)} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn("mb-4 mt-6 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0", className)} {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={cn("mb-4 mt-6 scroll-m-20 text-xl font-semibold tracking-tight first:mt-0 last:mb-0", className)} {...props} />
  ),
  h5: ({ className, ...props }) => (
    <h5 className={cn("my-4 text-lg font-semibold first:mt-0 last:mb-0", className)} {...props} />
  ),
  h6: ({ className, ...props }) => (
    <h6 className={cn("my-4 font-semibold first:mt-0 last:mb-0", className)} {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className={cn("mb-5 mt-5 leading-7 first:mt-0 last:mb-0", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a className={cn("text-primary font-medium underline underline-offset-4", className)} {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote className={cn("border-l-2 pl-6 italic", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("my-5 ml-6 list-disc [&>li]:mt-2", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("my-5 ml-6 list-decimal [&>li]:mt-2", className)} {...props} />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("my-5 border-b", className)} {...props} />
  ),
  table: ({ className, ...props }) => (
    <table className={cn("my-5 w-full border-separate border-spacing-0 overflow-y-auto", className)} {...props} />
  ),
  th: ({ className, ...props }) => (
    <th className={cn("bg-muted px-4 py-2 text-left font-bold first:rounded-tl-lg last:rounded-tr-lg [&[align=center]]:text-center [&[align=right]]:text-right", className)} {...props} />
  ),
  td: ({ className, ...props }) => (
    <td className={cn("border-b border-l px-4 py-2 text-left last:border-r [&[align=center]]:text-center [&[align=right]]:text-right", className)} {...props} />
  ),
  tr: ({ className, ...props }) => (
    <tr className={cn("m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg", className)} {...props} />
  ),
  sup: ({ className, ...props }) => (
    <sup className={cn("[&>a]:text-xs [&>a]:no-underline", className)} {...props} />
  ),
  pre: ({ className, ...props }) => (
    <pre className={cn("overflow-x-auto rounded-b-lg bg-black p-4 text-white", className)} {...props} />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(!isCodeBlock && "bg-muted rounded border font-semibold", className)}
        {...props}
      />
    );
  },
  CodeHeader,
});

const MarkdownTextInner = () => {
  const messagePartText = useMessagePartText();

  const processedMessagePart = useMemo(() => {
    const streaming = messagePartText.status.type === "running";
    return {
      ...messagePartText,
      text: preprocessMathExpressions(messagePartText.text, { streaming }),
    };
  }, [messagePartText]);

  const { text: visibleText } = useSmooth(processedMessagePart, true);
  const isRunningEmpty =
    messagePartText.status.type === "running" && visibleText.trim().length === 0;

  const { markdown, plainTail } = useMemo(
    () => splitForIncrementalMathMarkdown(visibleText),
    [visibleText],
  );

  const useCodeOverrideComponents = useMemo(
    () => ({
      Pre: MarkdownFencePre,
      Code: MarkdownFenceCode,
      SyntaxHighlighter: AssistantDefaultCodeBlockContent,
      CodeHeader,
    }),
    [],
  );
  const CodeComponent = useCallback(
    (props: ComponentPropsWithoutRef<"code"> & { node?: unknown }) => (
      <AssistantCodeOverride components={useCodeOverrideComponents} {...props} />
    ),
    [useCodeOverrideComponents],
  );
  const components = useMemo(
    () => ({
      ...defaultComponents,
      pre: PreOverride,
      code: CodeComponent,
    }),
    [CodeComponent],
  );

  if (isRunningEmpty) {
    return (
      <div className="flex w-fit max-w-full items-center gap-3 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="size-4 shrink-0 animate-spin text-foreground/70" />
        <span className="min-w-0 truncate">Thinking through the best explanation</span>
        <span className="flex gap-1" aria-hidden>
          <span className="size-1 rounded-full bg-muted-foreground/60 animate-pulse" />
          <span className="size-1 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
          <span className="size-1 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
        </span>
      </div>
    );
  }

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              strict: "ignore",
              errorColor: "#9ca3af",
            },
          ],
        ]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
      {plainTail ? (
        <span className="whitespace-pre-wrap wrap-break-word text-foreground/80">{plainTail}</span>
      ) : null}
    </>
  );
};

const MarkdownTextPrimitiveImpl = forwardRef<HTMLDivElement, { className?: string }>(
  ({ className }, forwardedRef) => {
    const status = useSmoothStatus();
    return (
      <div
        ref={forwardedRef}
        data-status={status.type}
        className={classNames(
          "aui-md",
          "min-w-0 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] [&_*]:max-w-full",
          "[&_.katex]:text-[1.15em] [&_.katex]:leading-relaxed [&_.katex-display]:my-6 [&_.katex-display]:overflow-x-auto [&_.katex-display]:text-center",
          className,
        )}
      >
        <MarkdownTextInner />
      </div>
    );
  },
);
MarkdownTextPrimitiveImpl.displayName = "MarkdownTextPrimitiveImpl";

const MarkdownTextWithProvider = withSmoothContextProvider(MarkdownTextPrimitiveImpl);

function MarkdownTextRoot() {
  return <MarkdownTextWithProvider />;
}
MarkdownTextRoot.displayName = "MarkdownText";

export const MarkdownText = memo(MarkdownTextRoot);
