import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/app/design-v2/_shared/nav";
import "@/app/design-v2/_shared/nav.css";
import "./data-policy.css";

/* AR-385: public Data Policy page. The single source of truth is
   `docs/DATA_POLICY.md` at the repo root — this page reads it at
   request time and renders. Updates to the MD ship without code
   changes. Robots-indexable; designed to be linkable from the footer,
   from the API-key creation disclosure modal, and from cold sign-ups.

   Renderer is intentionally minimal — handles only the features used
   by the source MD today (h1/h2/h3/h4, paragraphs, blockquote, hr,
   unordered lists, **bold**, `code`, [link](url)). If we ever need
   tables / images / nested lists / footnotes, swap in react-markdown
   then. Not before. */

export const metadata: Metadata = {
  title: "Data Policy | OneGoodArea",
  description:
    "What OneGoodArea stores when you call the API, how long we keep it, who can read it, and how to opt out of AI training data capture.",
  robots: { index: true, follow: true },
};

function readDataPolicy(): string {
  /* The repo root is two levels up from apps/web. Build-host paths
     match this layout — Vercel runs from the repo root, Render is
     containerized but apps/web is unaffected (this page is server-
     rendered in apps/web). */
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  return fs.readFileSync(path.join(repoRoot, "docs/DATA_POLICY.md"), "utf-8");
}

/** Lightweight inline-markdown → JSX. Only supports what's in the policy. */
function renderInline(text: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  let cursor = 0;
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      out.push(text.slice(cursor, match.index));
    }
    if (match[2] !== undefined) {
      out.push(<strong key={out.length}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      out.push(<code key={out.length}>{match[3]}</code>);
    } else if (match[4] !== undefined && match[5] !== undefined) {
      const href = match[5];
      const isInternal = href.startsWith("/");
      out.push(
        isInternal ? (
          <Link key={out.length} href={href}>
            {match[4]}
          </Link>
        ) : (
          <a key={out.length} href={href} target="_blank" rel="noopener">
            {match[4]}
          </a>
        ),
      );
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

/** Block-level renderer. Groups consecutive list items into a single <ul>
    and treats blank lines as paragraph separators. */
function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={blocks.length} />);
      i++;
      continue;
    }

    // Headings
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      const Tag = (`h${level}` as unknown) as keyof React.JSX.IntrinsicElements;
      blocks.push(<Tag key={blocks.length}>{renderInline(text)}</Tag>);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoted.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote key={blocks.length}>
          {renderInline(quoted.join(" "))}
        </blockquote>,
      );
      continue;
    }

    // Unordered list
    if (/^-\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(
          <li key={items.length}>{renderInline(lines[i].replace(/^-\s+/, ""))}</li>,
        );
        i++;
      }
      blocks.push(<ul key={blocks.length}>{items}</ul>);
      continue;
    }

    // Blank line — paragraph separator
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph: consume lines until blank or block-level start.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,4}\s|>\s|-\s|---+$)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(<p key={blocks.length}>{renderInline(para.join(" "))}</p>);
  }
  return blocks;
}

export default function DataPolicyPage() {
  const md = readDataPolicy();
  const rendered = renderMarkdown(md);

  return (
    <>
      <Nav />
      <main className="oga-data-policy">
        <article className="oga-data-policy__content">{rendered}</article>
      </main>
    </>
  );
}
