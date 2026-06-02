"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import type { BlogPost } from "@/app/blog/posts";
import "./post.css";

/* /blog/[slug] long-form post — Brand v3 rewrite (AR-204 PR).
   Replaces the 403 LOC legacy Fraunces + .aiq + inline-style post.

   Locked surface plan (per Pedro's surface-rotation rule):
     Header  cream-quiet
     Article cream
     PostCta DARK
     PostNav cream-quiet  (bookend match w/ header)

   Preserves the legacy markdown subset (## h2, ### h3, --- hr,
   numbered lists, bullet lists, **bold**, paragraph) but renders
   it through CSS classes instead of inline styles. */

export default function PostClient({
  post,
  prevPost,
  nextPost,
}: {
  post: BlogPost;
  prevPost: BlogPost | null;
  nextPost: BlogPost | null;
}) {
  return (
    <div className="oga-root oga-post">
      <Nav />
      <Header post={post} />
      <Article content={post.content} />
      <PostCta />
      <PostNav prev={prevPost} next={nextPost} />
      <Footer />
    </div>
  );
}

/* ============================================================
   HEADER (cream-quiet)
   ============================================================ */
function Header({ post }: { post: BlogPost }) {
  return (
    <section
      className="oga-section-quiet oga-post-header"
      data-oga-surface="light"
    >
      <div className="oga-post-header__inner">
        <Link href="/blog" className="oga-post-header__back">
          <span aria-hidden>←</span>
          Back to blog
        </Link>

        <div className="oga-post-header__meta">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span className="oga-post-header__meta-dot" aria-hidden />
          <span>{post.readTime}</span>
        </div>

        <h1 className="oga-post-header__title">{post.title}</h1>

        <p className="oga-post-header__lead">{post.description}</p>

        <ul className="oga-post-header__tags">
          {post.tags.map((t) => (
            <li key={t} className="oga-post-header__tag">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ============================================================
   ARTICLE (cream) — markdown rendered into branded prose
   ============================================================ */
function Article({ content }: { content: string }) {
  return (
    <section className="oga-post-article" data-oga-surface="light">
      <div className="oga-post-article__inner">
        <article className="oga-post-prose">{renderMarkdown(content)}</article>
      </div>
    </section>
  );
}

/* ============================================================
   POST CTA (DARK) — mid-page promotion to the product
   ============================================================ */
function PostCta() {
  return (
    <section
      className="oga-section-dark oga-post-cta"
      data-oga-surface="dark"
    >
      <div className="oga-post-cta__inner">
        <h2 className="oga-post-cta__title">
          Want this data through an API?
        </h2>
        <p className="oga-post-cta__lead">
          Every number cited here comes from the same engine you can call
          directly. Same methodology, same version stamp, replayable on
          your timetable.
        </p>
        <div className="oga-post-cta__buttons">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get started
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   POST NAV (cream-quiet) — prev/next
   ============================================================ */
function PostNav({
  prev,
  next,
}: {
  prev: BlogPost | null;
  next: BlogPost | null;
}) {
  if (!prev && !next) return null;
  return (
    <section
      className="oga-section-quiet oga-post-nav"
      data-oga-surface="light"
    >
      <div className="oga-post-nav__inner">
        <div className="oga-post-nav__eyebrow oga-eyebrow">
          <span className="oga-eyebrow-mono">CONTINUE READING</span>
          <span className="oga-eyebrow-rule" aria-hidden />
        </div>
        <div className="oga-post-nav__grid">
          {prev ? (
            <Link
              href={`/blog/${prev.slug}`}
              className="oga-post-nav__card"
              data-direction="prev"
            >
              <span className="oga-post-nav__card-direction">
                <span aria-hidden>←</span> Previous
              </span>
              <span className="oga-post-nav__card-title">{prev.title}</span>
            </Link>
          ) : (
            <span aria-hidden />
          )}
          {next ? (
            <Link
              href={`/blog/${next.slug}`}
              className="oga-post-nav__card"
              data-direction="next"
            >
              <span className="oga-post-nav__card-direction">
                Next <span aria-hidden>→</span>
              </span>
              <span className="oga-post-nav__card-title">{next.title}</span>
            </Link>
          ) : (
            <span aria-hidden />
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Markdown -> branded React. Same subset as the legacy renderer
   (## h2, ### h3, --- hr, `1.`/bullets, **bold** inline) but
   emits class names that pick up the oga-post-prose styles in
   post.css. Inline bold becomes <strong> — no dangerouslySetInnerHTML.
   ============================================================ */
function renderMarkdown(content: string): ReactNode[] {
  const lines = content.split("\n");
  const out: ReactNode[] = [];
  let bullets: string[] = [];
  let numbered: string[] = [];

  function flush() {
    if (bullets.length > 0) {
      out.push(
        <ul key={`ul-${out.length}`} className="oga-post-prose__ul">
          {bullets.map((b, i) => (
            <li key={i} className="oga-post-prose__li">
              {renderInline(b)}
            </li>
          ))}
        </ul>,
      );
      bullets = [];
    }
    if (numbered.length > 0) {
      out.push(
        <ol key={`ol-${out.length}`} className="oga-post-prose__ol">
          {numbered.map((b, i) => (
            <li key={i} className="oga-post-prose__li">
              <span aria-hidden className="oga-post-prose__li-num">
                {i + 1}
              </span>
              <span>{renderInline(b)}</span>
            </li>
          ))}
        </ol>,
      );
      numbered = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      flush();
      out.push(
        <h2 key={i} className="oga-post-prose__h2">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("### ")) {
      flush();
      out.push(
        <h3 key={i} className="oga-post-prose__h3">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.trim() === "---") {
      flush();
      out.push(<hr key={i} className="oga-post-prose__hr" />);
    } else if (/^[0-9]+\. /.test(line)) {
      numbered.push(line.replace(/^[0-9]+\.\s+/, ""));
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      bullets.push(line.slice(2));
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      out.push(
        <p key={i} className="oga-post-prose__p">
          {renderInline(line)}
        </p>,
      );
    }
  }
  flush();
  return out;
}

/* renderInline splits a string on **bold** runs and emits a mix of
   strings + <strong> elements, returning a fragment. Safer than
   dangerouslySetInnerHTML (no XSS surface, no string escaping). */
function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={`t-${i}`}>{text.slice(lastIndex, match.index)}</Fragment>,
      );
    }
    parts.push(
      <strong key={`b-${i}`} className="oga-post-prose__strong">
        {match[1]}
      </strong>,
    );
    lastIndex = match.index + match[0].length;
    i += 1;
  }
  if (lastIndex < text.length) {
    parts.push(
      <Fragment key={`t-${i}`}>{text.slice(lastIndex)}</Fragment>,
    );
  }
  return parts;
}

function formatDate(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
