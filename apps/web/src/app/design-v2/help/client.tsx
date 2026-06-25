"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { XIcon, LinkedInIcon, EmailIcon } from "../_shared/social-icons";
import { TOPICS, type Topic, type QA } from "./topics";
import "./help.css";

/* /help — Brand v3 rewrite (AR-204 PR).
   Replaces the 374 LOC legacy Fraunces + .aiq + inline-style page.

   IA (10 sections + final CTA):
     Hero (cream, eyebrow + H1 + lead + search input)
     01 Getting started        (cream-quiet)
     02 Signals                (cream)
     03 Scores                 (cream-quiet)
     04 Monitor                (cream)
     05 Intelligence           (cream-quiet)
     06 Methodology and data   (cream)
     07 API access             (cream-quiet)
     08 Billing and plans      (cream)
     09 Account                (cream-quiet)
     Talk to us                  (DARK, 3 contact cards)

   Behaviour:
   - Single text input filters all Q&As in real-time via lowercase
     includes match across both Q and A strings. Topics with zero
     matches hide entirely. Total match count surfaces under the
     input.
   - Each Q&A row is a native <details> element so each row's open
     state is independent of the search filter; accessible by
     default, no keyboard listeners required.

   Hard rules: zero inline styles, no aiq_, no em dashes, no fake
   links, no invented numbers (all stats verified against
   stripe.ts PLANS + ADDONS + RATE_LIMITS). */

function filterTopic(topic: Topic, query: string): Topic | null {
  if (!query) return topic;
  const matched = topic.items.filter(
    (qa) =>
      qa.q.toLowerCase().includes(query) ||
      qa.a.toLowerCase().includes(query),
  );
  if (matched.length === 0) return null;
  return { ...topic, items: matched };
}

const CONTACT_CHANNELS = [
  {
    label: "Email",
    value: "operation@onegoodarea.co.uk",
    href: "mailto:operation@onegoodarea.co.uk",
    note: "Account, billing, deletion, and anything not covered above.",
    Icon: EmailIcon,
  },
  {
    label: "X",
    value: "@onegoodarea",
    href: "https://x.com/onegoodarea",
    note: "Status notes and changelog highlights as we ship.",
    Icon: XIcon,
  },
  {
    label: "LinkedIn",
    value: "company/onegoodarea",
    href: "https://www.linkedin.com/company/onegoodarea",
    note: "Longer-form notes and hiring when we open roles.",
    Icon: LinkedInIcon,
  },
];

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="oga-help-mark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function QaRow({ item, query }: { item: QA; query: string }) {
  return (
    <details className="oga-help-qa">
      <summary className="oga-help-qa__q">
        <span className="oga-help-qa__q-text">
          <HighlightedText text={item.q} query={query} />
        </span>
        <span className="oga-help-qa__chevron" aria-hidden />
      </summary>
      <div className="oga-help-qa__a">
        <p>
          <HighlightedText text={item.a} query={query} />
        </p>
      </div>
    </details>
  );
}

function TopicSection({
  topic,
  query,
  altSurface,
}: {
  topic: Topic;
  query: string;
  altSurface: boolean;
}) {
  return (
    <section
      className={
        altSurface
          ? "oga-section-quiet oga-help-topic"
          : "oga-help-topic oga-help-topic--cream"
      }
    >
      <div className="oga-help-topic__inner">
        <header className="oga-help-topic__head">
          <div className="oga-help-topic__eyebrow oga-eyebrow">
            <span className="oga-help-topic__eyebrow-num">{topic.num}</span>
            <span className="oga-help-topic__eyebrow-rule" aria-hidden />
            <span>{topic.title}</span>
          </div>
          <h2 className="oga-help-topic__title">{topic.title}</h2>
          {topic.lead ? (
            <p className="oga-help-topic__lead">{topic.lead}</p>
          ) : null}
        </header>

        <div className="oga-help-topic__list">
          {topic.items.map((item) => (
            <QaRow key={item.q} item={item} query={query} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HelpClient() {
  const [rawQuery, setRawQuery] = useState("");
  const query = rawQuery.trim().toLowerCase();

  const filteredTopics = useMemo(
    () =>
      TOPICS.map((t) => filterTopic(t, query)).filter(
        (t): t is Topic => t !== null,
      ),
    [query],
  );

  const totalMatches = useMemo(
    () => filteredTopics.reduce((acc, t) => acc + t.items.length, 0),
    [filteredTopics],
  );

  const hasQuery = query.length > 0;

  return (
    <div className="oga-root oga-help">
      <Nav />

      {/* HERO ---------------------------------------------------- */}
      <section className="oga-help-hero" data-oga-surface="light">
        <div className="oga-help-hero__inner">
          <div className="oga-help-hero__eyebrow oga-eyebrow">
            <span className="oga-eyebrow-dot" aria-hidden />
            <span>Help &amp; FAQs</span>
          </div>

          <h1 className="oga-help-hero__title">
            What do you want to know about OneGoodArea?
          </h1>

          <p className="oga-help-hero__lead">
            Documentation lives at{" "}
            <Link href="/docs" className="oga-help-hero__link">
              /docs
            </Link>
            . Methodology lives at{" "}
            <Link href="/methodology" className="oga-help-hero__link">
              /methodology
            </Link>
            . Below is the FAQ that covers the common product, API, billing,
            and account questions.
          </p>

          <div className="oga-help-hero__search">
            <label htmlFor="help-search" className="oga-help-hero__search-label">
              Search the FAQ
            </label>
            <div className="oga-help-hero__search-row">
              <svg
                className="oga-help-hero__search-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="help-search"
                type="search"
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                placeholder="Try: rate limit, soft cap, peer cohort, fetch_mode"
                className="oga-help-hero__search-input"
                autoComplete="off"
              />
              {hasQuery ? (
                <button
                  type="button"
                  className="oga-help-hero__search-clear"
                  onClick={() => setRawQuery("")}
                  aria-label="Clear search"
                >
                  Clear
                </button>
              ) : null}
            </div>
            {hasQuery ? (
              <p className="oga-help-hero__search-status">
                {totalMatches === 0
                  ? `No matches for ${'"'}${rawQuery}${'"'}. Try a different term or `
                  : `${totalMatches} match${totalMatches === 1 ? "" : "es"} across ${filteredTopics.length} topic${filteredTopics.length === 1 ? "" : "s"}. `}
                {totalMatches === 0 ? (
                  <a href="mailto:operation@onegoodarea.co.uk" className="oga-help-hero__link">
                    email us
                  </a>
                ) : null}
                {totalMatches === 0 ? "." : null}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* TOPIC SECTIONS ------------------------------------------ */}
      {filteredTopics.length === 0 && hasQuery ? null : (
        <div className="oga-help-topics">
          {filteredTopics.map((topic, i) => (
            <TopicSection
              key={topic.num}
              topic={topic}
              query={query}
              altSurface={i % 2 === 0}
            />
          ))}
        </div>
      )}

      {/* TALK TO US (DARK CTA) ----------------------------------- */}
      <section className="oga-section-dark oga-help-contact" data-oga-surface="dark">
        <div className="oga-help-contact__inner">
          <div className="oga-help-contact__eyebrow oga-eyebrow oga-eyebrow--inverse">
            <span className="oga-help-contact__eyebrow-num">10</span>
            <span className="oga-help-contact__eyebrow-rule" aria-hidden />
            <span>Talk to us</span>
          </div>

          <h2 className="oga-help-contact__title">
            Something here didn&rsquo;t answer your question?
          </h2>

          <p className="oga-help-contact__lead">
            We read every email that lands at operation@onegoodarea.co.uk and we
            usually reply within one business day.
          </p>

          <ul className="oga-help-contact__grid">
            {CONTACT_CHANNELS.map((c) => {
              const external = c.href.startsWith("http");
              return (
                <li key={c.label} className="oga-help-contact__card">
                  <div className="oga-help-contact__card-icon" aria-hidden>
                    <c.Icon />
                  </div>
                  <div className="oga-help-contact__card-label">{c.label}</div>
                  <a
                    className="oga-help-contact__card-value"
                    href={c.href}
                    {...(external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                  >
                    {c.value}
                    <span className="oga-help-contact__card-arrow" aria-hidden>
                      {external ? "↗" : "→"}
                    </span>
                  </a>
                  <p className="oga-help-contact__card-note">{c.note}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
