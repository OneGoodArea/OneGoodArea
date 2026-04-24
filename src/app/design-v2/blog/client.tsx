"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Styles } from "../_shared/styles";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { BLOG_POSTS, type BlogPost } from "@/app/blog/posts";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /blog
   Post index. Reuses BLOG_POSTS from the live site as data source.
   Editorial card list: featured lead + rest below.
   ═══════════════════════════════════════════════════════════════ */

export default function BlogClient() {
  const [featured, ...rest] = BLOG_POSTS;
  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Hero />
      <Featured post={featured} />
      <PostList posts={rest} />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Hero() {
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
          position: "absolute", top: -220, left: "50%",
          transform: "translateX(-50%)",
          width: 880, height: 520,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.14) 0%, rgba(212,243,58,0) 60%)",
        }} />
      </div>
      <div style={{
        maxWidth: 1000, margin: "0 auto", padding: "100px 40px 48px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.24em", textTransform: "uppercase",
          color: "var(--text-2)",
          display: "inline-flex", alignItems: "center", gap: 9,
          marginBottom: 22,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6,
            background: "var(--signal)",
            animation: "aiq-pulse-dot 1.6s ease-in-out infinite",
          }} />
          OneGoodArea blog
        </div>
        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(42px, 5.2vw, 62px)", lineHeight: 1.04,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          margin: "0 0 16px", maxWidth: "22ch",
        }}>
          Data-led reads on <em style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "3px solid var(--signal)", paddingBottom: 2,
          }}>UK neighbourhoods.</em>
        </h1>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 16.5, fontWeight: 400,
          lineHeight: 1.55, color: "var(--text-2)",
          margin: 0, maxWidth: "62ch",
        }}>
          Area intelligence, property data analysis, and practical guides for buyers, investors, and agents. All backed by real public data.
        </p>
      </div>
    </section>
  );
}

function Featured({ post }: { post: BlogPost }) {
  const [hover, setHover] = useState(false);
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "48px 0",
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 40px" }}>
        <Link
          href={`/design-v2/blog/${post.slug}`}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            display: "block",
            background: "var(--bg-off)",
            border: "1px solid var(--border)",
            padding: "40px 44px",
            textDecoration: "none",
            position: "relative", overflow: "hidden",
            transition: "border-color 180ms ease, transform 180ms cubic-bezier(0.16,1,0.3,1)",
            borderColor: hover ? "var(--ink)" : "var(--border)",
            transform: hover ? "translateY(-1px)" : "translateY(0)",
          }}
        >
          <div aria-hidden style={{
            position: "absolute", top: -140, right: -140,
            width: 400, height: 400,
            background: "radial-gradient(circle, rgba(212,243,58,0.14) 0%, rgba(212,243,58,0) 62%)",
            pointerEvents: "none",
          }} />

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            marginBottom: 22, position: "relative", zIndex: 1,
          }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--signal-ink)", background: "var(--signal)",
              padding: "4px 9px", borderRadius: 2,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <span aria-hidden style={{
                width: 4, height: 4, borderRadius: 4, background: "var(--ink-deep)",
              }} />
              Latest
            </span>
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

          <h2 style={{
            fontFamily: "var(--display)", fontWeight: 400,
            fontSize: "clamp(28px, 3.8vw, 42px)", lineHeight: 1.1,
            letterSpacing: "-0.018em",
            color: "var(--ink-deep)",
            margin: "0 0 16px", maxWidth: "24ch",
            position: "relative", zIndex: 1,
          }}>
            {post.title}
          </h2>
          <p style={{
            fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
            lineHeight: 1.55, color: "var(--text-2)",
            margin: "0 0 22px", maxWidth: "58ch",
            position: "relative", zIndex: 1,
          }}>
            {post.description}
          </p>

          <div style={{
            display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
            position: "relative", zIndex: 1,
          }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: "var(--ink-deep)",
              display: "inline-flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid var(--ink-deep)", paddingBottom: 2,
            }}>
              Read it
              <span aria-hidden style={{
                display: "inline-block",
                transform: hover ? "translateX(2px)" : "translateX(0)",
                transition: "transform 220ms cubic-bezier(0.16,1,0.3,1)",
              }}>→</span>
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {post.tags.map((tag) => <Tag key={tag} label={tag} />)}
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

function PostList({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "24px 0 100px",
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 40px" }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-3)", marginBottom: 22,
        }}>
          More posts
        </div>
        <div style={{
          border: "1px solid var(--border)",
          background: "var(--bg)",
        }}>
          {posts.map((p, i) => (
            <PostRow key={p.slug} post={p} isLast={i === posts.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PostRow({ post, isLast }: { post: BlogPost; isLast: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/design-v2/blog/${post.slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        padding: "24px 28px",
        borderBottom: isLast ? "none" : "1px solid var(--border-dim)",
        textDecoration: "none",
        transition: "background 160ms ease",
        background: hover ? "var(--bg-off)" : "var(--bg)",
        position: "relative",
      }}
    >
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 20, alignItems: "center",
      }}>
        <div>
          <h3 style={{
            fontFamily: "var(--display)", fontSize: "clamp(19px, 2.2vw, 22px)",
            fontWeight: 500, letterSpacing: "-0.014em",
            color: "var(--ink-deep)", lineHeight: 1.2,
            margin: "0 0 8px",
          }}>{post.title}</h3>
          <p style={{
            fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 400,
            lineHeight: 1.5, color: "var(--text-2)",
            margin: "0 0 12px", maxWidth: "64ch",
          }}>{post.description}</p>
          <div style={{
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.14em", color: "var(--text-3)",
            }}>{formatShortDate(post.date)}</span>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.14em", color: "var(--text-3)",
            }}>· {post.readTime}</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {post.tags.slice(0, 3).map((tag) => <Tag key={tag} label={tag} />)}
            </div>
          </div>
        </div>
        <span aria-hidden style={{
          fontFamily: "var(--sans)", fontSize: 18,
          color: hover ? "var(--ink-deep)" : "var(--text-3)",
          transform: hover ? "translateX(3px)" : "translateX(0)",
          transition: "transform 220ms cubic-bezier(0.16,1,0.3,1), color 160ms",
        }}>→</span>
      </div>
    </Link>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
      letterSpacing: "0.2em", textTransform: "uppercase",
      color: "var(--text-3)",
      border: "1px solid var(--border)",
      padding: "3px 8px", borderRadius: 2,
    }}>{label}</span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function FinalCta() {
  return (
    <section style={{
      background: "var(--bg-off)",
      padding: "80px 0 110px",
    }}>
      <div style={{
        maxWidth: 820, margin: "0 auto", padding: "0 40px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1.06,
          letterSpacing: "-0.018em", color: "var(--ink-deep)",
          margin: "0 0 14px",
        }}>
          Read better, <em style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "2.5px solid var(--signal)", paddingBottom: 1,
          }}>decide better.</em>
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 400,
          lineHeight: 1.5, color: "var(--text-2)",
          margin: "0 auto 28px", maxWidth: "52ch",
        }}>
          Every post is built from the same public data as the reports. Same engine, same citations, just in long form.
        </p>
        <Link href="/design-v2" style={{
          fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--signal-ink)", background: "var(--signal)",
          padding: "13px 22px", borderRadius: 999, textDecoration: "none",
          border: "1px solid var(--ink-deep)",
          display: "inline-flex", alignItems: "center", gap: 9,
        }}>
          Try a postcode
          <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
        </Link>
      </div>
    </section>
  );
}
