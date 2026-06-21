/* AR-240 (Dashboard redesign Epic AR-217 — Phase 0.5): code block primitive.

   The "Show the curl" pattern (Stripe + Linear convention) is the
   signature affordance across the dashboard:
   - Every product playground (Signals / Scores / Intelligence) shows
     the equivalent curl for the query the user just composed
   - The public /playground renders prebaked curls for each demo
   - The Webhooks signing-secret reveal-once flow renders the secret
     in a code-block for the user to copy
   - Settings + IP allowlist show config snippets

   5+ planned consumers.

   Composition model:
   - Full-width monospace block with line numbers + token-coloured
     syntax + optional header strip + optional copy button
   - Three minimal grammars: bash / json / typescript. Each tokeniser
     is a small focused regex set. We do NOT pull in a syntax-
     highlighting library — shipping prismjs (~25kb) for three
     dashboard languages would be wasteful, and the existing
     .oga-code-panel token classes (__key / __str / __num-val /
     __punct / __comment / __fn) are already canonical across the
     marketing surfaces.
   - Light surface (default) matches the homepage .oga-code-panel
     recipe — warm-white gradient + edge-lit material shadow. Dark
     surface inverts to graphite gradient + dot-field motif, same
     vocabulary as DataTable + Sidebar dark.
   - Copy button: top-right, flips label to "Copied" for 1.5s on
     click. Uses navigator.clipboard.writeText. */

"use client";

import { useCallback, useState, type ReactNode } from "react";
import "./code-block.css";

/* ============================================================
   Types
   ============================================================ */

export type CodeBlockLanguage = "bash" | "json" | "typescript";

export interface CodeBlockProps {
  /** The code content (multiline). Preserved as-is — leading whitespace,
      blank lines, exact characters all kept. */
  code: string;
  /** Token-highlighting grammar. Default "bash". */
  language?: CodeBlockLanguage;
  /** Optional header strip rendered above the code (e.g.
      "REQUEST · POST /v1/score"). Pass a string OR a ReactNode for
      richer composition (live indicator + path + meta). */
  header?: ReactNode;
  /** Render the copy-to-clipboard button. Default true. */
  copyable?: boolean;
  /** Surface variant. Default "light". */
  surface?: "light" | "dark";
}

/* ============================================================
   Component
   ============================================================ */

export function CodeBlock({
  code,
  language = "bash",
  header,
  copyable = true,
  surface = "light",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Older browsers + permission failures: fail quietly. The
         user can still select + copy manually. */
    }
  }, [code]);

  const lines = code.split("\n");

  return (
    <div
      className="oga-code-block"
      data-surface={surface}
      /* Also surface the dark context as data-oga-surface so the
         shared .oga-verb--{verb} dark-brightening rules apply
         regardless of whether an ancestor set it. */
      data-oga-surface={surface === "dark" ? "dark" : undefined}
    >
      {header ? <div className="oga-code-block__header">{header}</div> : null}

      {copyable ? (
        <button
          type="button"
          className="oga-code-block__copy"
          onClick={handleCopy}
          aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      ) : null}

      <pre className="oga-code-block__body">
        {lines.map((line, i) => (
          <div key={i} className="oga-code-block__line">
            <span className="oga-code-block__num" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="oga-code-block__text">
              {tokenize(line, language).map((t, j) =>
                t.cls ? (
                  <span key={j} className={t.cls}>
                    {t.text}
                  </span>
                ) : (
                  <span key={j}>{t.text}</span>
                ),
              )}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
}

/* ============================================================
   Tokenizers
   ============================================================
   Each language returns an array of { text, cls? } chunks. The
   tokenisers share the canonical .oga-code-panel__* class names
   per the Jira hard rule. Unmatched text passes through plain
   (no class), so the consumer's default body colour applies. */

interface Token {
  text: string;
  cls?: string;
}

function tokenize(line: string, language: CodeBlockLanguage): Token[] {
  switch (language) {
    case "bash":
      return tokenizeBash(line);
    case "json":
      return tokenizeJson(line);
    case "typescript":
      return tokenizeTypescript(line);
    default:
      return [{ text: line }];
  }
}

/* ---------- bash ----------
   Captures: shell comments (#), strings ("..." and '...'), HTTP
   verbs (GET/POST/...), header keys (Authorization/Content-Type),
   flags (-X, --header), URLs, numbers. */
const BASH_RE = /(#.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:GET|POST|PUT|DELETE|PATCH)\b|\b(?:Authorization|Content-Type|Accept)\b|--?[A-Za-z][A-Za-z0-9-]*|https?:\/\/[^\s"']+|\b\d+(?:\.\d+)?\b)/g;

function tokenizeBash(line: string): Token[] {
  return runRegexTokenizer(line, BASH_RE, (match) => {
    if (match.startsWith("#")) return "oga-code-panel__comment";
    if (match.startsWith('"') || match.startsWith("'")) return "oga-code-panel__str";
    /* HTTP verbs use the canonical .oga-verb--{verb} colour set
       (status green / amber / yellow / red per components.css).
       Dark surfaces auto-brighten via the [data-oga-surface="dark"]
       descendant selector. */
    if (/^GET$/.test(match)) return "oga-verb oga-verb--get";
    if (/^POST$/.test(match)) return "oga-verb oga-verb--post";
    if (/^PUT$/.test(match)) return "oga-verb oga-verb--put";
    if (/^DELETE$/.test(match)) return "oga-verb oga-verb--delete";
    if (/^PATCH$/.test(match)) return "oga-verb oga-verb--patch";
    if (/^(Authorization|Content-Type|Accept)$/.test(match)) return "oga-code-panel__key";
    if (match.startsWith("--") || match.startsWith("-")) return "oga-code-panel__punct";
    if (match.startsWith("http")) return "oga-code-panel__str";
    if (/^-?\d/.test(match)) return "oga-code-panel__num-val";
    return undefined;
  });
}

/* ---------- json ----------
   Captures: line comments (// — non-standard JSON but supported for
   inline annotations in showcase examples), strings, numbers,
   booleans + null. Keys are detected by trailing ":" in the post-
   process pass. */
const JSON_RE = /(\/\/.*$|"(?:[^"\\]|\\.)*"\s*:|"(?:[^"\\]|\\.)*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?)/g;

function tokenizeJson(line: string): Token[] {
  return runRegexTokenizer(line, JSON_RE, (match) => {
    if (match.startsWith("//")) return "oga-code-panel__comment";
    if (match.endsWith(":") || match.endsWith(": ")) return "oga-code-panel__key";
    if (match.startsWith('"')) return "oga-code-panel__str";
    if (/^(true|false|null)$/.test(match)) return "oga-code-panel__fn";
    if (/^-?\d/.test(match)) return "oga-code-panel__num-val";
    return undefined;
  });
}

/* ---------- typescript ----------
   Captures: comments (// and /* ... *\/), strings + template
   literals, numbers, keywords, function calls. Punctuation (braces,
   semicolons, etc.) passes through plain. */
const TS_RE = /(\/\/.*$|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:const|let|var|function|return|if|else|import|export|from|interface|type|class|extends|implements|new|async|await|true|false|null|undefined)\b|-?\d+(?:\.\d+)?|\b[A-Za-z_$][\w$]*(?=\())/g;

const TS_KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else",
  "import", "export", "from", "interface", "type", "class",
  "extends", "implements", "new", "async", "await",
  "true", "false", "null", "undefined",
]);

function tokenizeTypescript(line: string): Token[] {
  return runRegexTokenizer(line, TS_RE, (match) => {
    if (match.startsWith("//") || match.startsWith("/*")) return "oga-code-panel__comment";
    if (match.startsWith('"') || match.startsWith("'") || match.startsWith("`"))
      return "oga-code-panel__str";
    if (TS_KEYWORDS.has(match)) return "oga-code-panel__key";
    if (/^-?\d/.test(match)) return "oga-code-panel__num-val";
    if (/^[A-Za-z_$][\w$]*$/.test(match)) return "oga-code-panel__fn";
    return undefined;
  });
}

/* ---------- shared regex runner ----------
   Walks the regex matches across the line, emitting alternating
   plain + classed Tokens. Anything not captured by the regex is
   passed through unclassed. */

function runRegexTokenizer(
  line: string,
  re: RegExp,
  classify: (match: string) => string | undefined,
): Token[] {
  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      out.push({ text: line.slice(last, m.index) });
    }
    const text = m[0];
    const cls = classify(text);
    out.push(cls ? { text, cls } : { text });
    last = m.index + text.length;
  }
  if (last < line.length) {
    out.push({ text: line.slice(last) });
  }
  return out.length ? out : [{ text: line }];
}
