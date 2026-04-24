import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BLOG_POSTS } from "./posts";

export const metadata: Metadata = {
  title: "Blog | OneGoodArea",
  description: "Area intelligence insights, UK property data analysis, and guides for home buyers, investors, and agents. Powered by real government data.",
  openGraph: {
    title: "Blog | OneGoodArea",
    description: "Area intelligence insights, UK property data analysis, and guides.",
    type: "website",
    url: "https://www.area-iq.co.uk/blog",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Blog | OneGoodArea", description: "Area intelligence insights, UK property data analysis, and guides." },
  alternates: { canonical: "https://www.area-iq.co.uk/blog" },
};

export default function BlogPage() {
  const [featured, ...rest] = BLOG_POSTS;

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Blog" }]} maxWidth="900px">
        <Link
          href="/report"
          className="h-8 px-4 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          Go to App
          <ArrowRight size={12} />
        </Link>
      </Navbar>

      <main className="flex-1 max-w-[900px] w-full mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[28px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            Blog
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Area intelligence insights, property data analysis, and practical guides. All backed by real government data.
          </p>
        </div>

        {/* Featured post */}
        <Link
          href={`/blog/${featured.slug}`}
          className="block border p-8 mb-10 transition-colors group"
          style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5"
              style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}
            >
              Latest
            </span>
            <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              {new Date(featured.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          <h2
            className="text-[22px] font-semibold tracking-tight mb-3 transition-colors group-hover:opacity-80"
            style={{ color: "var(--text-primary)" }}
          >
            {featured.title}
          </h2>
          <p className="text-[14px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
            {featured.description}
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              <Clock size={11} />
              {featured.readTime} read
            </span>
            {featured.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5"
                style={{ color: "var(--text-tertiary)", border: "1px solid var(--border)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </Link>

        {/* Remaining posts */}
        <div className="grid gap-4">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block border px-6 py-5 transition-colors group"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-[16px] font-semibold tracking-tight mb-2 transition-colors group-hover:opacity-80"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {post.title}
                  </h2>
                  <p className="text-[13px] leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                    {post.description}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                      {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                      <Clock size={11} />
                      {post.readTime}
                    </span>
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5"
                        style={{ color: "var(--text-tertiary)", border: "1px solid var(--border)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="mt-1 shrink-0 opacity-30 group-hover:opacity-70 transition-opacity"
                  style={{ color: "var(--text-tertiary)" }}
                />
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer maxWidth="900px" />
    </div>
  );
}
