"use client";

import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { BLOG_POSTS, type BlogPost } from "@/app/blog/posts";
import "./blog.css";

/* /blog list page — Brand v3 rewrite (AR-204 PR).
   Replaces the 350 LOC legacy Fraunces + .aiq + inline-style index.

   Locked surface plan (per Pedro's surface-rotation rule):
     Hero       DARK   (data-oga-surface="dark")
     Featured   cream
     Grid       cream-quiet
     CTA        DARK   (bookend match w/ hero)

   Posts are sourced from apps/web/src/app/blog/posts.ts (kept as-is
   per the rewrite scope decision; visual reskin only on this PR).
   The first post (newest) is rendered as the Featured card; the
   rest fill the grid. */

const SORTED = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
const [featured, ...rest] = SORTED;

function formatDate(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PostMeta({ post }: { post: BlogPost }) {
  return (
    <div className="oga-blog-meta">
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      <span className="oga-blog-meta__dot" aria-hidden />
      <span>{post.readTime}</span>
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <ul className="oga-blog-tags">
      {tags.map((t) => (
        <li key={t} className="oga-blog-tag">
          {t}
        </li>
      ))}
    </ul>
  );
}

export default function BlogClient() {
  return (
    <div className="oga-root oga-blog">
      <Nav />

      {/* HERO (DARK) ------------------------------------------- */}
      <section
        className="oga-section-dark oga-blog-hero"
        data-oga-surface="dark"
      >
        <div className="oga-blog-hero__inner">
          <div className="oga-blog-hero__eyebrow oga-eyebrow oga-eyebrow--inverse">
            <span className="oga-eyebrow-dot" aria-hidden />
            <span>Blog &amp; insights</span>
          </div>

          <h1 className="oga-blog-hero__title">
            Notes on building the UK property intelligence layer.
          </h1>

          <p className="oga-blog-hero__lead">
            Engineering notes, methodology deep-dives, and field-tested
            workflows. New entries land as we ship.
          </p>

          <div className="oga-blog-hero__stats">
            <div className="oga-blog-hero__stat">
              <span className="oga-blog-hero__stat-value">{SORTED.length}</span>
              <span className="oga-blog-hero__stat-label">Posts published</span>
            </div>
            <div className="oga-blog-hero__stat">
              <span className="oga-blog-hero__stat-value">
                {formatDate(SORTED[0].date)}
              </span>
              <span className="oga-blog-hero__stat-label">Most recent</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED (cream) -------------------------------------- */}
      <section className="oga-blog-featured" data-oga-surface="light">
        <div className="oga-blog-featured__inner">
          <div className="oga-blog-featured__eyebrow oga-eyebrow">
            <span className="oga-eyebrow-mono">FEATURED</span>
            <span className="oga-eyebrow-rule" aria-hidden />
            <span>Most recent</span>
          </div>

          <Link
            href={`/blog/${featured.slug}`}
            className="oga-blog-featured__card"
          >
            <div className="oga-blog-featured__card-body">
              <PostMeta post={featured} />
              <h2 className="oga-blog-featured__card-title">
                {featured.title}
              </h2>
              <p className="oga-blog-featured__card-desc">
                {featured.description}
              </p>
              <TagList tags={featured.tags} />
              <span className="oga-blog-featured__card-cta">
                Read article
                <span className="oga-blog-featured__card-arrow" aria-hidden>
                  →
                </span>
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* GRID (cream-quiet) ------------------------------------ */}
      <section
        className="oga-section-quiet oga-blog-grid"
        data-oga-surface="light"
      >
        <div className="oga-blog-grid__inner">
          <div className="oga-blog-grid__eyebrow oga-eyebrow">
            <span className="oga-eyebrow-mono">ARCHIVE</span>
            <span className="oga-eyebrow-rule" aria-hidden />
            <span>The rest of the catalogue</span>
          </div>

          <ul className="oga-blog-grid__list">
            {rest.map((post) => (
              <li key={post.slug} className="oga-blog-grid__item">
                <Link
                  href={`/blog/${post.slug}`}
                  className="oga-blog-grid__card"
                >
                  <PostMeta post={post} />
                  <h3 className="oga-blog-grid__card-title">{post.title}</h3>
                  <p className="oga-blog-grid__card-desc">{post.description}</p>
                  <TagList tags={post.tags} />
                  <span className="oga-blog-grid__card-cta">
                    Read article
                    <span className="oga-blog-grid__card-arrow" aria-hidden>
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FINAL CTA (DARK) -------------------------------------- */}
      <section
        className="oga-section-dark oga-blog-cta"
        data-oga-surface="dark"
      >
        <div className="oga-blog-cta__inner">
          <h2 className="oga-blog-cta__title">
            Want the data behind these posts?
          </h2>
          <p className="oga-blog-cta__lead">
            The same engine that ranks areas in our case studies is the
            engine you call through the API. One methodology, version-pinned
            per organisation, stamped on every response.
          </p>
          <div className="oga-blog-cta__buttons">
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

      <Footer />
    </div>
  );
}
