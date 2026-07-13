import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalShell,
  LegalSection,
  type LegalSection as LegalSectionType,
} from "@/app/design-v2/_shared/legal-shell";
import "./data-policy.css";

/* Public Data Policy page. The single source of truth is
   `docs/DATA_POLICY.md` at the repo root; this server component reads
   it at request time and renders it through the shared LegalShell (the
   same hero + sticky TOC + contact CTA + footer used by /privacy and
   /terms), so the three legal pages read as one family. Updates to the
   MD ship without code changes; the section list + TOC are derived from
   the H2 headings.

   Inline renderer is intentionally minimal; handles only the features
   used by the source MD today (h3/h4 sub-headings, paragraphs,
   blockquote, unordered lists, **bold**, `code`, [link](url)). If we
   ever need tables / images / nested lists, swap in react-markdown
   then. Not before. */

export const metadata: Metadata = {
  title: "Data Policy | OneGoodArea",
  description:
    "What OneGoodArea stores when you call the API, how long we keep it, who can read it, and how to opt out of AI training data capture.",
  robots: { index: true, follow: true },
};

function readDataPolicy(): string {
  /* The repo root is two levels up from apps/web. Build-host paths
     match this layout. Vercel runs from the repo root, Render is
     containerized but apps/web is unaffected (this page is server-
     rendered in apps/web). */
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  return fs.readFileSync(path.join(repoRoot, "docs/DATA_POLICY.md"), "utf-8");
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

interface PolicySection {
  id: string;
  label: string;
  body: string;
}

/** Split the source MD into a hero (title / intro / last-updated) plus
    one section per H2 heading. The `---` rules that separate sections in
    the source are dropped; LegalShell gives each section its own head. */
function parsePolicy(md: string): {
  title: string;
  intro: string;
  lastUpdated: string | null;
  sections: PolicySection[];
} {
  const lines = md.split("\n");
  let title = "Data Policy";
  let intro = "";
  let lastUpdated: string | null = null;
  const sections: PolicySection[] = [];

  let i = 0;
  for (; i < lines.length; i++) {
    const m = /^#\s+(.*)$/.exec(lines[i]);
    if (m) {
      title = m[1].trim();
      i++;
      break;
    }
  }

  // Preamble (everything before the first H2): supplies intro + last-updated.
  for (; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) break;
    const t = lines[i].trim();
    if (!t) continue;
    if (t.startsWith(">")) {
      const lu = /last updated\s+(.+?)\.?$/i.exec(t.replace(/^>\s*/, ""));
      if (lu) lastUpdated = lu[1].trim();
      continue;
    }
    if (/^---+$/.test(t)) continue;
    if (!intro) intro = t;
  }

  // Sections, one per H2.
  while (i < lines.length) {
    const h2 = /^##\s+(.*)$/.exec(lines[i]);
    if (!h2) {
      i++;
      continue;
    }
    const label = h2[1].trim();
    i++;
    const body: string[] = [];
    for (; i < lines.length; i++) {
      if (/^##\s+/.test(lines[i])) break;
      if (/^---+$/.test(lines[i].trim())) continue;
      body.push(lines[i]);
    }
    sections.push({ id: slug(label), label, body: body.join("\n") });
  }

  return { title, intro, lastUpdated, sections };
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

/** Block-level renderer for a single section body. Groups consecutive
    list items into one <ul>; treats blank lines as paragraph separators. */
function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Sub-headings (h3 / h4). H1 / H2 never reach here (section boundaries).
    const h = /^(#{3,4})\s+(.*)$/.exec(line);
    if (h) {
      const text = h[2].trim();
      const Tag = (`h${h[1].length}` as unknown) as keyof React.JSX.IntrinsicElements;
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
      blocks.push(<blockquote key={blocks.length}>{renderInline(quoted.join(" "))}</blockquote>);
      continue;
    }

    // Unordered list
    if (/^-\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(<li key={items.length}>{renderInline(lines[i].replace(/^-\s+/, ""))}</li>);
        i++;
      }
      blocks.push(<ul key={blocks.length}>{items}</ul>);
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{3,4}\s|>\s|-\s)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(<p key={blocks.length}>{renderInline(para.join(" "))}</p>);
  }
  return blocks;
}

export default function DataPolicyPage() {
  const { title, intro, lastUpdated, sections } = parsePolicy(readDataPolicy());

  const toc: LegalSectionType[] = sections.map((s) => ({
    id: s.id,
    // Trim the trailing parenthetical for a compact sidebar label.
    label: s.label.replace(/\s*\([^)]*\)\s*$/, ""),
  }));

  return (
    <LegalShell
      eyebrow="Legal · Data Policy"
      title={title}
      lastUpdated={lastUpdated ?? "13 July 2026"}
      intro={intro}
      sections={toc}
    >
      {sections.map((s, i) => (
        <LegalSection key={s.id} id={s.id} n={i + 1} title={s.label}>
          <div className="oga-legal-md">{renderMarkdown(s.body)}</div>
        </LegalSection>
      ))}
    </LegalShell>
  );
}
