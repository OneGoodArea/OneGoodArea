"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClaudeLogo, CursorLogo, McpLogo } from "./editor-icons";

/* McpSection (02). MCP-native gets its own moment: query UK areas from inside
   AI tools. Dark surface, canonical Claude / Cursor / MCP logos, and a Claude
   Code-style chat that TYPES ITSELF OUT when scrolled into view: the prompt
   types, the OneGoodArea MCP tool fires, then the answer streams in.

   Degrades safely: the default (SSR / no-JS / reduced-motion) render shows the
   full prompt, tool call and answer, so nothing is ever hidden. Plan 064. */

const TOOLS: { Logo: typeof ClaudeLogo; name: string }[] = [
  { Logo: ClaudeLogo, name: "Claude Code" },
  { Logo: CursorLogo, name: "Cursor" },
  { Logo: ClaudeLogo, name: "Claude Desktop" },
  { Logo: McpLogo, name: "Any MCP client" },
];

const PROMPT = "score M1 1AE for investing and compare it to nearby areas";
const ANSWER =
  "M1 1AE scores 72/100 for investing, strong on crime (92nd percentile) and transport (81st), softer on prices (64th). The three closest comparable areas are M20 2NR, M21 8AA and SK4 3GN.";

type Phase = "idle" | "prompt" | "tool" | "answer" | "done";

export function McpSection() {
  const mockRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [promptLen, setPromptLen] = useState(PROMPT.length);
  const [answerLen, setAnswerLen] = useState(ANSWER.length);

  useEffect(() => {
    const el = mockRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // leave the full static content in place

    let played = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      if (played) return;
      played = true;
      setPromptLen(0);
      setAnswerLen(0);
      setPhase("prompt");

      let p = 0;
      const stepPrompt = () => {
        p += 1;
        setPromptLen(p);
        if (p < PROMPT.length) {
          timers.push(setTimeout(stepPrompt, 26));
          return;
        }
        timers.push(setTimeout(() => setPhase("tool"), 500));
        timers.push(
          setTimeout(() => {
            setPhase("answer");
            let a = 0;
            const stepAns = () => {
              a += 1;
              setAnswerLen(a);
              if (a < ANSWER.length) {
                timers.push(setTimeout(stepAns, 12));
                return;
              }
              setPhase("done");
            };
            stepAns();
          }, 1300),
        );
      };
      timers.push(setTimeout(stepPrompt, 350));
    };

    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  const isAnimating = phase === "prompt" || phase === "tool" || phase === "answer";
  const showTool = !isAnimating || phase === "tool" || phase === "answer";
  const showAnswer = !isAnimating || phase === "answer";
  const promptText = phase === "prompt" ? PROMPT.slice(0, promptLen) : PROMPT;

  return (
    <section className="oga-mcp" data-oga-surface="dark">
      <div className="oga-mcp__field" aria-hidden />

      <div className="oga-mcp__inner">
        <div className="oga-mcp__copy">
          <div className="oga-mcp__eyebrow">
            <span className="oga-mcp__eyebrow-num">02</span>
            <span className="oga-mcp__eyebrow-line" aria-hidden />
            <span>MCP-native</span>
          </div>
          <h2 className="oga-mcp__title">Query UK areas from inside your AI tools.</h2>
          <p className="oga-mcp__lead">
            OneGoodArea is MCP-native. Add it once and score postcodes, pull
            signals, and rank areas inline in Claude Code, Cursor, or Claude
            Desktop, without leaving your editor.
          </p>

          <ul className="oga-mcp__tools">
            {TOOLS.map((t, i) => {
              const Logo = t.Logo;
              return (
                <li key={`${t.name}-${i}`} className="oga-mcp__tool">
                  <span className="oga-mcp__tool-logo" aria-hidden>
                    <Logo />
                  </span>
                  {t.name}
                </li>
              );
            })}
          </ul>

          <Link href="/docs/mcp" className="oga-mcp__link">
            Read the MCP docs
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="oga-mcp__mock" ref={mockRef} aria-hidden>
          <div className="oga-mcp__mock-bar">
            <span className="oga-mcp__mock-logo">
              <ClaudeLogo />
            </span>
            <span>Claude Code</span>
          </div>
          <div className="oga-mcp__mock-body">
            <div className="oga-mcp__mock-prompt">
              <span className="oga-mcp__mock-caret">›</span>
              <span className="oga-mcp__mock-typed">{promptText}</span>
              {phase === "prompt" && <span className="oga-mcp__mock-cursor" />}
            </div>

            {showTool && (
              <>
                <div className="oga-mcp__mock-tool">
                  <span className="oga-mcp__mock-tool-logo">
                    <McpLogo />
                  </span>
                  <span className="oga-mcp__mock-tool-name">onegoodarea</span>
                  <span className="oga-mcp__mock-tool-call">score_postcode</span>
                </div>
                <pre className="oga-mcp__mock-args">{`{ "area": "M1 1AE", "preset": "investing" }`}</pre>
              </>
            )}

            {showAnswer && (
              <div className="oga-mcp__mock-answer">
                {phase === "answer" ? (
                  <>{ANSWER.slice(0, answerLen)}</>
                ) : (
                  <>
                    M1 1AE scores <b>72/100</b> for investing, strong on crime (92nd
                    percentile) and transport (81st), softer on prices (64th). The three
                    closest comparable areas are M20 2NR, M21 8AA and SK4 3GN.
                  </>
                )}
                {(phase === "answer" || phase === "done" || phase === "idle") && (
                  <span className="oga-mcp__mock-cursor" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
