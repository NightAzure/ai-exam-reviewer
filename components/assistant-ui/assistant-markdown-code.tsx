"use client";

/**
 * Local copies of @assistant-ui/react-markdown PreOverride + CodeOverride logic.
 * The published package only exports "." so deep imports like dist/overrides/* fail under Next/Turbopack.
 */

import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import classNames from "classnames";
import type { ComponentPropsWithoutRef, ComponentType, ElementType, ReactNode } from "react";
import { createContext, memo, useContext, useMemo } from "react";

const PreContext = createContext<Record<string, unknown> | null>(null);

export function useIsMarkdownCodeBlock(): boolean {
  return useContext(PreContext) !== null;
}

type PreOverrideProps = ComponentPropsWithoutRef<"pre">;

export const PreOverride = memo(function PreOverride({ children, ...rest }: PreOverrideProps) {
  return <PreContext.Provider value={rest as Record<string, unknown>}>{children}</PreContext.Provider>;
});

function withDefaultProps(defaults: Record<string, unknown>) {
  return (props: Record<string, unknown>) => {
    const { className: classNameProp, ...restProps } = props;
    const { className: defaultClassName, ...defaultRest } = defaults;
    return {
      className: classNames(defaultClassName as string | undefined, classNameProp as string | undefined),
      ...defaultRest,
      ...restProps,
    };
  };
}

type CodeBlockComponents = {
  Pre: ElementType;
  Code: ElementType;
  SyntaxHighlighter: ElementType;
  CodeHeader: ElementType;
};

/** Same role as DefaultCodeBlockContent in @assistant-ui/react-markdown */
export function AssistantDefaultCodeBlockContent({
  node,
  components,
  code,
}: {
  node?: unknown;
  components: { Pre: ElementType; Code: ElementType };
  code: ReactNode;
}) {
  const { Pre, Code } = components;
  return (
    <Pre>
      <Code node={node}>{code}</Code>
    </Pre>
  );
}

function DefaultCodeBlock({
  node,
  components,
  language,
  code,
}: {
  node?: unknown;
  components: CodeBlockComponents;
  language: string;
  code: string;
}) {
  const { Pre, Code, SyntaxHighlighter, CodeHeader } = components;
  const inner = useMemo(() => ({ Pre, Code }), [Pre, Code]);
  const SH = language ? SyntaxHighlighter : AssistantDefaultCodeBlockContent;
  return (
    <>
      <CodeHeader node={node} language={language} code={code} />
      <SH node={node} components={inner} language={language || "unknown"} code={code} />
    </>
  );
}

type CodeOverrideProps = ComponentPropsWithoutRef<"code"> & {
  node?: unknown;
  components: CodeBlockComponents;
  componentsByLanguage?: Record<string, { SyntaxHighlighter?: ComponentType<unknown>; CodeHeader?: ComponentType<unknown> }>;
};

const CodeBlockOverride = memo(function CodeBlockOverride({
  node,
  components: { Pre, Code, SyntaxHighlighter: FallbackSyntaxHighlighter, CodeHeader: FallbackCodeHeader },
  componentsByLanguage = {},
  children,
  ...codeProps
}: CodeOverrideProps) {
  const preProps = useContext(PreContext);
  const getPreProps = withDefaultProps((preProps ?? {}) as Record<string, unknown>);
  const WrappedPre = useCallbackRef((props: Record<string, unknown>) => {
    const PreComponent = Pre as ElementType;
    return <PreComponent {...getPreProps(props)} />;
  });
  const getCodeProps = withDefaultProps(codeProps as Record<string, unknown>);
  const WrappedCode = useCallbackRef((props: Record<string, unknown>) => {
    const CodeComponent = Code as ElementType;
    return <CodeComponent {...getCodeProps(props)} />;
  });
  const className = (codeProps as { className?: string }).className ?? "";
  const language = /language-(\w+)/.exec(className)?.[1] ?? "";

  if (typeof children !== "string") {
    return (
      <AssistantDefaultCodeBlockContent
        node={node}
        components={{ Pre: WrappedPre, Code: WrappedCode }}
        code={children}
      />
    );
  }

  const SyntaxHighlighter =
    (language && componentsByLanguage[language]?.SyntaxHighlighter) || FallbackSyntaxHighlighter;
  const CodeHeader =
    (language && componentsByLanguage[language]?.CodeHeader) || FallbackCodeHeader;

  return (
    <DefaultCodeBlock
      node={node}
      components={{
        Pre: WrappedPre,
        Code: WrappedCode,
        SyntaxHighlighter: SyntaxHighlighter as ElementType,
        CodeHeader: CodeHeader as ElementType,
      }}
      language={language || "unknown"}
      code={children}
    />
  );
});

export const AssistantCodeOverride = memo(function AssistantCodeOverride({
  node,
  components,
  componentsByLanguage,
  ...props
}: CodeOverrideProps) {
  const isCodeBlock = useIsMarkdownCodeBlock();
  if (!isCodeBlock) {
    const CodeComponent = components.Code as ElementType;
    return <CodeComponent {...props} />;
  }
  return (
    <CodeBlockOverride
      node={node}
      components={components}
      componentsByLanguage={componentsByLanguage}
      {...props}
    />
  );
});
