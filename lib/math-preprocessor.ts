/**
 * Normalizes AI-generated LaTeX/markdown before remark-math + rehype-katex.
 *
 * Common failures we fix:
 * - `$\boxed{ \begin{aligned}$$` (inline `$` + accidental `$$`) → proper display block
 * - `\end{aligned}} $` style closers → `$$`
 * - Lines that are only `$` / `$$` (orphan delimiters)
 * - `$$\n$...$\n$$` (display wrapper + redundant inline `$`) → single display block
 * - Unbalanced single `$` only while the assistant message is still streaming from the API
 * - **Bare LaTeX lines** (e.g. `\log_b\left(...\right) = ...` with no `$`) → wrapped in `$$...$$`
 * - **Closing-only `$`**: `\log_2(8) = 3$` (opening `$` missing) → `$\log_2(8) = 3$`
 * - **`$\boxed{...}$$`**: inline math closed with an extra `$` (broken tail) → `$\boxed{...}$`
 * - **`Given \log... : $`**: prose + LaTeX + lone closing `$` → `Given $\log...$` (KaTeX can't parse English inside math)
 */

export type PreprocessMathOptions = {
  /** When true, append a closing `$` if there is an odd count of single `$` (streaming partial). */
  streaming?: boolean;
};

/** Unescaped `$` that starts a single-dollar delimiter (not `$$`). */
function isSingleDollarOpen(text: string, index: number): boolean {
  if (text[index] !== "$") return false;
  if (index > 0 && text[index - 1] === "\\") return false;
  if (index + 1 < text.length && text[index + 1] === "$") return false;
  return true;
}

function balanceTrailingSingleDollarDelimiters(text: string): string {
  let singles = 0;
  for (let i = 0; i < text.length; i++) {
    if (!isSingleDollarOpen(text, i)) continue;
    singles++;
  }
  if (singles % 2 === 1) return `${text}$`;
  return text;
}

/** Remove lines that are only `$`, `$$`, or `\$` (models often emit spurious separator lines). */
function stripOrphanDollarLines(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.replace(/\u00a0/g, " ").trim();
      if (t === "$" || t === "$$" || t === "\\$") return false;
      return true;
    })
    .join("\n");
}

/**
 * Collapse "$" that sits on its own between newlines (paragraph-only dollars).
 */
function collapseLonelyDollarParagraphs(text: string): string {
  let prev = "";
  let out = text;
  for (let k = 0; k < 10 && out !== prev; k++) {
    prev = out;
    out = out
      .replace(/(^|\n)\s*\$\s*(?=\r?\n|$)/g, "$1")
      .replace(/\r?\n{3,}/g, "\n\n");
  }
  return out;
}

/**
 * `$$\n$...$\n$$` → `$$\n...\n$$` (strip redundant inline dollars inside a display block).
 */
function unwrapDisplayWrappedInlineDollars(text: string): string {
  return text.replace(
    /^\$\$\s*\r?\n\s*\$\s*([\s\S]*?)\s*\$\s*\r?\n\s*\$\$/gm,
    (_m, inner: string) => `$$\n${inner.trim()}\n$$`,
  );
}

function repairBoxedAlignedDelimiterGlitch(text: string): string {
  return text.replace(
    /\$\s*\\boxed\{\s*\\begin\{aligned\}\s*\$\$/g,
    "$$\n\\boxed{\n\\begin{aligned}",
  );
}

function repairAlignedEndDollar(text: string): string {
  return text.replace(/\\end\{aligned\}(\})+\s*\$/g, (m) => m.replace(/\s*\$/, "\n$$"));
}

/**
 * `$\boxed{c^2 = a^2 + b^2}$$` — models often emit inline `$...$` plus a stray `$` (reads as `$$`).
 * Not part of display `$$...$$` because the opening was a single `$`.
 */
function repairInlineMathTrailingDoubleDollar(text: string): string {
  return text.replace(/(^|[^$\n\\])\$([^$\n]+)\$\$/gm, (full, pre: string, body: string) => {
    if (!/\\[a-zA-Z]/.test(body)) return full;
    return `${pre}$${body}$`;
  });
}

/** Phrase + backslash-math + optional colon + closing-only `$` (see screenshot: "Given \log_{10}(-100) : $"). */
const PROSE_THEN_MATH_LINE =
  /^(\s*)(Given|Let|Suppose|Assume|If|When|Thus|Therefore|Hence|So|For\s+example|For\s+instance|Note\s+that|Recall\s+that|Here)\s+(\\[a-zA-Z][^\n$]*?)(?:\s*:\s*)?\$\s*$/i;

function repairProseLeadThenLatexClosingDollar(text: string): string {
  let inFence = false;
  return text
    .split(/\r?\n/)
    .map((line) => {
      const fence = line.match(/^\s*(`{3,}|~{3,})/);
      if (fence) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line.replace(PROSE_THEN_MATH_LINE, (_, ind, lead, math) => `${ind}${lead} $${math}$`);
    })
    .join("\n");
}

/** Same pattern inside a paragraph (no line break before "Given"). */
function repairProseLeadMathTrailingDollarLoose(text: string): string {
  return text.replace(
    /\b(Given|Let|Suppose|Assume)\s+(\\[a-zA-Z][^$\n]{0,240}?)(?:\s*:\s*)?\$/gi,
    (_, lead, math) => `${lead} $${math}$`,
  );
}

/** True if a substring looks like TeX math (not prose). Used for closing-only `$` repair. */
function looksLikeMathFragment(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  if (/\\[a-zA-Z]+/.test(t)) return true;
  if (/\d\s*\\cdot\s*\\log/.test(t)) return true;
  if (/\\/.test(t) && (/_(\d|\{)/.test(t) || /\^(\d|\{|\()/.test(t))) return true;
  return false;
}

/**
 * `\log_2(8) = 3$` or `... = 3 \cdot \log(2)$` — only a closing delimiter.
 * Prepend matching `$` or `$$` so remark-math can parse. Skips fenced code.
 */
function repairClosingOnlyDollarLines(text: string): string {
  const lines = text.split(/\r?\n/);
  let inFence = false;

  return lines
    .map((line) => {
      const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
      if (fenceMatch) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;

      const m = line.match(/^(\s*)(.*)$/);
      if (!m) return line;
      const indent = m[1];
      const trimmed = m[2].trimEnd();
      if (!trimmed.length) return line;

      if (trimmed.endsWith("$$")) {
        const inner = trimmed.slice(0, -2).trimEnd();
        if (!inner.includes("$") && looksLikeMathFragment(inner)) {
          return `${indent}$$${inner}$$`;
        }
        return line;
      }

      if (trimmed.endsWith("$")) {
        const inner = trimmed.slice(0, -1).trimEnd();
        if (!inner.includes("$") && looksLikeMathFragment(inner)) {
          return `${indent}$${inner}$`;
        }
      }

      return line;
    })
    .join("\n");
}

/** Max length of a "word" of plain Latin letters; longer runs suggest prose, not a formula line. */
const LONG_LATIN_RUN = /[a-zA-Z]{14,}/;

/**
 * True if this single line looks like a LaTeX expression but has no math delimiters.
 * Models often emit `\frac{...}{...}` on its own line without wrapping in `$`.
 */
function looksLikeBareLatexLine(trimmed: string): boolean {
  if (trimmed.length < 4) return false;
  if (trimmed.includes("$")) return false;
  if (/^#{1,6}\s/.test(trimmed)) return false;
  if (/^>\s/.test(trimmed)) return false;
  if (/^[-*+]\s/.test(trimmed)) return false;
  if (/^\d+\.\s/.test(trimmed)) return false;
  if (/^\*\*.+\*\*$/.test(trimmed)) return false;
  if (!/\\[a-zA-Z]+/.test(trimmed)) return false;
  if (/\\(?:Users|Program|Windows|System|Desktop|Documents)(?:\\|\s|$)/i.test(trimmed)) return false;
  if (LONG_LATIN_RUN.test(trimmed.replace(/\\[a-zA-Z]+/g, ""))) return false;

  if (trimmed.startsWith("\\")) return true;

  if (
    /^[a-zA-Z0-9_{}\s,]+\s*=\s*.+\\[a-zA-Z]+/.test(trimmed) &&
    (trimmed.match(/[a-zA-Z]{5,}/g) ?? []).length <= 2
  ) {
    return true;
  }

  const compact = trimmed.replace(/\s/g, "");
  if (compact.length < 8) return false;
  const mathy = (compact.match(/[0-9+\-*/().,;:^_=\\|[\]{}≤≥≠≈]/g) ?? []).length;
  return mathy / compact.length >= 0.45 && /\\(frac|sqrt|sum|int|lim|log|ln|left|right|cdot|times|leq|geq|text|mathrm|mathbf|boxed|begin|end)/.test(trimmed);
}

/**
 * Wrap bare LaTeX lines in display math. Skips fenced code blocks (``` / ~~~).
 */
function wrapBareLatexLines(text: string): string {
  const lines = text.split(/\r?\n/);
  let inFence = false;

  return lines
    .map((line) => {
      const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
      if (fenceMatch) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;

      const m = line.match(/^(\s*)(.*)$/);
      if (!m) return line;
      const indent = m[1];
      const rest = m[2];
      if (!looksLikeBareLatexLine(rest.trim())) return line;
      return `${indent}$$${rest}$$`;
    })
    .join("\n");
}

/**
 * `\log(8) = ... \log(2)$` — exactly one `$` and it is the last character (closing-only).
 * The incremental scanner would treat that `$` as an *opening* delimiter, leaving the TeX
 * outside math. Heal to proper inline math before scanning.
 */
function healProseLeadMathForSplit(source: string): string | null {
  const t = source.trimEnd();
  const m = t.match(PROSE_THEN_MATH_LINE);
  if (!m) return null;
  const trailingWs = source.length > t.length ? source.slice(t.length) : "";
  return `${m[1]}${m[2]} $${m[3]}$${trailingWs}`;
}

function healClosingOnlyDollarForSplit(source: string): string | null {
  const t = source.trimEnd();
  if (!t.endsWith("$")) return null;
  const last = t.lastIndexOf("$");
  if (last < 0) return null;
  if (last > 0 && t[last - 1] === "$") return null;
  if (t.indexOf("$") !== last) return null;
  const body = t.slice(0, last).trimEnd();
  if (!body.length || body.includes("$")) return null;
  if (!looksLikeMathFragment(body)) return null;
  const trailingWs = source.slice(t.length);
  return `$${body}$${trailingWs}`;
}

/**
 * Split text so remark-math only sees **balanced** `$` / `$$` regions.
 * The tail is shown as plain text while typing or when delimiters are still open.
 */
export function splitForIncrementalMathMarkdown(source: string): {
  markdown: string;
  plainTail: string;
} {
  let s = source;
  const proseHealed = healProseLeadMathForSplit(s);
  if (proseHealed !== null) s = proseHealed;

  const closingHealed = healClosingOnlyDollarForSplit(s);
  if (closingHealed !== null) {
    return { markdown: closingHealed, plainTail: "" };
  }

  let i = 0;
  let mode: "text" | "inline" | "display" = "text";
  let inlineOpen = -1;
  let displayOpen = -1;

  while (i < s.length) {
    const ch = s[i];
    if (ch === "$" && (i === 0 || s[i - 1] !== "\\")) {
      if (i + 1 < s.length && s[i + 1] === "$") {
        if (mode === "text") {
          mode = "display";
          displayOpen = i;
          i += 2;
        } else if (mode === "display") {
          mode = "text";
          displayOpen = -1;
          i += 2;
        } else {
          i += 1;
        }
      } else {
        if (mode === "text") {
          mode = "inline";
          inlineOpen = i;
          i += 1;
        } else if (mode === "inline") {
          mode = "text";
          inlineOpen = -1;
          i += 1;
        } else {
          i += 1;
        }
      }
    } else {
      i += 1;
    }
  }

  if (mode === "text") {
    return { markdown: s, plainTail: "" };
  }
  const cut = mode === "inline" ? inlineOpen : displayOpen;
  if (cut < 0) {
    return { markdown: s, plainTail: "" };
  }
  return {
    markdown: s.slice(0, cut),
    plainTail: s.slice(cut),
  };
}

export function preprocessMathExpressions(
  text: string,
  options?: PreprocessMathOptions,
): string {
  const streaming = options?.streaming ?? false;
  let out = text;

  out = stripOrphanDollarLines(out);
  out = repairProseLeadThenLatexClosingDollar(out);
  out = repairProseLeadMathTrailingDollarLoose(out);
  out = repairClosingOnlyDollarLines(out);
  out = repairInlineMathTrailingDoubleDollar(out);
  out = collapseLonelyDollarParagraphs(out);
  out = wrapBareLatexLines(out);
  out = unwrapDisplayWrappedInlineDollars(out);
  out = repairBoxedAlignedDelimiterGlitch(out);
  out = repairAlignedEndDollar(out);

  out = out.replace(/\$\s*\n+([\s\S]*?)\n+\s*\$/g, (match, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return match;
    const looksLikeDisplay =
      trimmed.length > 48 ||
      /\\(frac|sqrt|sum|int|lim|log_|begin\{)/.test(trimmed) ||
      trimmed.includes("\\\\") ||
      trimmed.includes("&");
    if (looksLikeDisplay) return `\n\n$$\n${trimmed}\n$$\n\n`;
    return ` $${trimmed}$ `;
  });

  out = out.replace(/\\\[\s*/g, "\n\n$$\n");
  out = out.replace(/\s*\\\]/g, "\n$$\n\n");
  out = out.replace(/\\\(/g, "$");
  out = out.replace(/\\\)/g, "$");

  out = out.replace(/\\boxed\{([^}]*?)\$/g, "\\boxed{$1");
  out = out.replace(/\\text\{([^}]*?)\$/g, "\\text{$1");

  out = out.replace(/\n{3,}/g, "\n\n");

  out = stripOrphanDollarLines(out);
  out = repairProseLeadThenLatexClosingDollar(out);
  out = repairProseLeadMathTrailingDollarLoose(out);
  out = repairClosingOnlyDollarLines(out);
  out = repairInlineMathTrailingDoubleDollar(out);
  out = collapseLonelyDollarParagraphs(out);
  out = wrapBareLatexLines(out);

  if (streaming) {
    out = balanceTrailingSingleDollarDelimiters(out);
  }

  return out;
}
