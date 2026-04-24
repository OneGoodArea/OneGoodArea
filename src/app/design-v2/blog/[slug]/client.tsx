"use client";

import React from "react";
import Link from "next/link";
import { Styles } from "../../_shared/styles";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import type { BlogPost } from "@/app/blog/posts";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /blog/[slug]
   Long-form editorial post template.
   - Fraunces headline, serif-leaning body
   - Chartreuse accents on callouts and H2 rules
   - Prev/Next navigation + back-to-blog footer
   ═══════════════════════════════════════════════════════════════ */

export default function PostClient({ post, prevPost, nextPost }: {
  post: BlogPost;
  prevPost: BlogPost | null;
  nextPost: BlogPost | null;
}) {
  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Header post={post} />
      <Article content={post.content} />
      <PostCta />
      <PostNav prev={prevPost} next={nextPost} />
      <Footer />
    </div>
  );
}

function Header({ post }: { post: BlogPost }) {
  return (
    <section style={{
      position: "relative",
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", top: -200, left: "50%",
          transform: "translateX(-50%)",
          width: 780, height: 460,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.12) 0%, rgba(212,243,58,0) 62%)",
        }} />
      </div>
      <div style={{
        maxWidth: 760, margin: "0 auto", padding: "100px 40px 48px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          marginBottom: 24,
        }}>
          <Link href="/blog" style={{
            fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
            letterSpacing: "0.2em", textTransform: "uppercase",
            color: "var(--text-2)", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 6,
            borderBottom: "1px solid var(--border)", paddingBottom: 2,
          }}>
            <span aria-hidden>←</span> Blog
          </Link>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.14em", color: "var(--text-3)",
          }}>
            {formatDate(post.date)}
          </span>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.14em", color: "var(--text-3)",
          }}>
            · {post.readTime} read
          </span>
        </div>
        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(34px, 4.6vw, 52px)", lineHeight: 1.08,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          margin: "0 0 18px",
        }}>
          {post.title}
        </h1>
        <p style={{
          fontFamily: "var(--display)", fontSize: 20, fontWeight: 400,
          fontStyle: "italic", lineHeight: 1.45,
          color: "var(--ink)", letterSpacing: "-0.005em",
          margin: "0 0 22px", maxWidth: "58ch",
        }}>
          {post.description}
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {post.tags.map((tag) => (
            <span key={tag} style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "var(--text-3)",
              border: "1px solid var(--border)",
              padding: "4px 9px", borderRadius: 2,
            }}>{tag}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Minimal markdown renderer · supports ## h2, ### h3, **bold**, [text](link),
   numbered lists, bullet lists, and paragraphs. Mirrors the live renderer. */

function Article({ content }: { content: string }) {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "56px 0 96px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 40px" }}>
        <article>
          {renderMarkdown(content)}
        </article>
      </div>
    </section>
  );
}

function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  let numbered: string[] = [];

  function flush() {
    if (bullets.length > 0) {
      out.push(
        <ul key={`ul-${out.length}`} style={{
          listStyle: "none", padding: 0, margin: "0 0 22px",
        }}>
          {bullets.map((b, i) => (
            <li key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "6px 0",
              fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
              lineHeight: 1.7, color: "var(--text)",
            }}>
              <span aria-hidden style={{
                flexShrink: 0, marginTop: 10,
                width: 10, height: 2, background: "var(--signal)", borderRadius: 1,
              }} />
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(b) }} />
            </li>
          ))}
        </ul>
      );
      bullets = [];
    }
    if (numbered.length > 0) {
      out.push(
        <ol key={`ol-${out.length}`} style={{
          listStyle: "none", padding: 0, margin: "0 0 22px",
          counterReset: "step",
        }}>
          {numbered.map((b, i) => (
            <li key={i} style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr",
              gap: 12, padding: "6px 0",
              fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
              lineHeight: 1.7, color: "var(--text)",
            }}>
              <span aria-hidden style={{
                fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
                letterSpacing: "0.06em",
                color: "var(--signal-ink)", background: "var(--signal)",
                width: 22, height: 22, borderRadius: "50%",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginTop: 4,
              }}>{i + 1}</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(b) }} />
            </li>
          ))}
        </ol>
      );
      numbered = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      flush();
      out.push(
        <h2 key={i} style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(24px, 3vw, 30px)", lineHeight: 1.15,
          letterSpacing: "-0.014em", color: "var(--ink-deep)",
          margin: "44px 0 18px",
          paddingTop: 16, borderTop: "1px solid var(--border-dim)",
        }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flush();
      out.push(
        <h3 key={i} style={{
          fontFamily: "var(--display)", fontWeight: 500,
          fontSize: 20, lineHeight: 1.25,
          letterSpacing: "-0.012em", color: "var(--ink-deep)",
          margin: "32px 0 12px",
        }}>
          {line.slice(4)}
        </h3>
      );
    } else if (line.trim() === "---") {
      flush();
      out.push(
        <hr key={i} style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: "40px 0",
        }} />
      );
    } else if (/^[0-9]+\. /.test(line)) {
      numbered.push(line.replace(/^[0-9]+\.\s+/, ""));
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      bullets.push(line.slice(2));
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      out.push(
        <p key={i} style={{
          fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
          lineHeight: 1.75, color: "var(--text)",
          letterSpacing: "-0.003em",
          margin: "0 0 20px",
        }}>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
        </p>
      );
    }
  }
  flush();
  return out;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--ink-deep); font-weight: 600; background: var(--signal-dim); padding: 1px 5px; border-radius: 2px;">$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: var(--ink-deep); text-decoration: none; border-bottom: 1px solid var(--ink-deep); padding-bottom: 1px;">$1</a>');
}

function PostCta() {
  return (
    <section style={{
      background: "var(--bg-off)",
      borderBottom: "1px solid var(--border)",
      padding: "80px 0",
    }}>
      <div style={{
        maxWidth: 760, margin: "0 auto", padding: "0 40px",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-2)", marginBottom: 14,
          display: "inline-flex", alignItems: "center", gap: 9,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
          }} />
          Try it yourself
        </div>
        <h3 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(26px, 3.4vw, 36px)", lineHeight: 1.1,
          letterSpacing: "-0.016em", color: "var(--ink-deep)",
          margin: "0 0 14px",
        }}>
          Score any UK postcode <em style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "2.5px solid var(--signal)", paddingBottom: 1,
          }}>in seconds.</em>
        </h3>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 15, fontWeight: 400,
          lineHeight: 1.5, color: "var(--text-2)",
          margin: "0 auto 26px", maxWidth: "46ch",
        }}>
          Seven live data sources. Reproducible scoring. Written narrative. Three free reports per month, no card required.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/sign-up" style={{
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--signal-ink)", background: "var(--signal)",
            padding: "12px 22px", borderRadius: 999, textDecoration: "none",
            border: "1px solid var(--ink-deep)",
            display: "inline-flex", alignItems: "center", gap: 9,
          }}>
            Start free
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </Link>
          <Link href="/pricing" style={{
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--ink)", background: "transparent",
            padding: "12px 22px", borderRadius: 999, textDecoration: "none",
            border: "1px solid var(--border)",
            display: "inline-flex", alignItems: "center", gap: 9,
          }}>
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}

function PostNav({ prev, next }: { prev: BlogPost | null; next: BlogPost | null }) {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "56px 0 80px",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 40px" }}>
        <div className="aiq-post-nav" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14, marginBottom: 28,
        }}>
          {prev ? <PrevNextCard post={prev} direction="prev" /> : <div />}
          {next ? <PrevNextCard post={next} direction="next" /> : <div />}
        </div>
        <div style={{ textAlign: "center" }}>
          <Link href="/blog" style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--text-2)", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 8,
            borderBottom: "1px solid var(--border)", paddingBottom: 2,
          }}>
            <span aria-hidden>←</span> All posts
          </Link>
        </div>
      </div>
    </section>
  );
}

function PrevNextCard({ post, direction }: {
  post: BlogPost; direction: "prev" | "next";
}) {
  const [hover, setHover] = React.useState(false);
  const isPrev = direction === "prev";
  return (
    <Link
      href={`/blog/${post.slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        border: "1px solid var(--border)",
        padding: "18px 22px",
        textDecoration: "none",
        textAlign: isPrev ? "left" : "right",
        transition: "border-color 160ms ease, background 160ms ease",
        background: hover ? "var(--bg-off)" : "var(--bg)",
        borderColor: hover ? "var(--ink)" : "var(--border)",
      }}
    >
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-3)", marginBottom: 8,
        display: "inline-flex", alignItems: "center", gap: 6,
        justifyContent: isPrev ? "flex-start" : "flex-end",
      }}>
        {isPrev ? <><span aria-hidden>←</span> Previous</> : <>Next <span aria-hidden>→</span></>}
      </div>
      <div style={{
        fontFamily: "var(--display)", fontSize: 16, fontWeight: 500,
        letterSpacing: "-0.012em", color: "var(--ink-deep)",
        lineHeight: 1.3,
      }}>{post.title}</div>
    </Link>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
