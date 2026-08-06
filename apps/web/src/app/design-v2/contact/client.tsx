"use client";

import { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { XIcon, LinkedInIcon, EmailIcon } from "../_shared/social-icons";
import "./contact.css";

/* Contact form. Brand v3 (Plotted). AR-451.

   Public form. The page is a two-column layout: left rail carries the
   framing + direct channels (email / X / LinkedIn) as a fallback; right
   is the form card. On success the card swaps to a confirmation panel.

   Spam defence lives server-side (honeypot + per-IP rate limit +
   validation in apps/api POST /contact). The hidden `website` input
   below is the honeypot: real users never see or fill it.

   Hard rules: zero inline styles, no em dashes, no fake links, no
   invented claims (we don't promise a response SLA we can't keep). */

const ROLES: Array<{ value: string; label: string }> = [
  { value: "lender", label: "Lender" },
  { value: "insurer", label: "Insurer" },
  { value: "proptech", label: "PropTech" },
  { value: "cre", label: "Commercial real estate" },
  { value: "public-sector", label: "Public sector" },
  { value: "estate-agent", label: "Estate agent" },
  { value: "other", label: "Other" },
];

interface Channel {
  label: string;
  value: string;
  href: string;
  note: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const CHANNELS: Channel[] = [
  {
    label: "Email",
    value: "operation@onegoodarea.co.uk",
    href: "mailto:operation@onegoodarea.co.uk",
    note: "Prefer email? This reaches the same place.",
    Icon: EmailIcon,
  },
  {
    label: "X",
    value: "@onegoodarea",
    href: "https://x.com/onegoodarea",
    note: "Engineering and product updates as we ship.",
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

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactClient() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    message: "",
    website: "", // honeypot
  });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Please tell us your name.");
    if (!EMAIL_RE.test(form.email.trim())) return setError("Please enter a valid email.");
    if (form.message.trim().length < 10) return setError("Please add a little more detail.");

    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("success");
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(
        res.status === 429
          ? "You have sent a few messages already. Please try again a little later."
          : data?.error ?? "Something went wrong. Please try again, or email us directly.",
      );
      setStatus("error");
    } catch {
      setError("Something went wrong. Please try again, or email us directly.");
      setStatus("error");
    }
  }

  return (
    <div className="oga-root oga-contact">
      <Nav />

      <section className="oga-contact-hero" data-oga-surface="light">
        <div className="oga-contact__inner">
          <div className="oga-contact__grid">
            {/* LEFT: framing + direct channels --------------------- */}
            <div className="oga-contact__aside">
              <div className="oga-contact__eyebrow oga-eyebrow">
                <span className="oga-eyebrow-dot" aria-hidden />
                <span>Contact</span>
              </div>

              <h1 className="oga-contact__title">Let&rsquo;s talk.</h1>

              <p className="oga-contact__lead">
                Whether you&rsquo;re evaluating the API, procuring for a team, or
                building on top of us, tell us what you need. Your message goes
                straight to the team.
              </p>

              <ul className="oga-contact__channels">
                {CHANNELS.map((c) => {
                  const external = c.href.startsWith("http");
                  return (
                    <li key={c.label} className="oga-contact__channel">
                      <span className="oga-contact__channel-icon" aria-hidden>
                        <c.Icon />
                      </span>
                      <span className="oga-contact__channel-text">
                        <a
                          className="oga-contact__channel-value"
                          href={c.href}
                          {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                        >
                          {c.value}
                          <span className="oga-contact__channel-arrow" aria-hidden>
                            {external ? "↗" : "→"}
                          </span>
                        </a>
                        <span className="oga-contact__channel-note">{c.note}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* RIGHT: form card ------------------------------------ */}
            <div className="oga-contact__form-wrap">
              {status === "success" ? (
                <div className="oga-contact__success" role="status">
                  <div className="oga-contact__success-mark" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h2 className="oga-contact__success-title">Message sent.</h2>
                  <p className="oga-contact__success-body">
                    Thanks for reaching out. It has landed with the team and we
                    will get back to you at{" "}
                    <span className="oga-contact__success-email">{form.email.trim()}</span>.
                  </p>
                  <Link href="/methodology" className="oga-btn oga-btn-secondary">
                    Read the methodology
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              ) : (
                <form className="oga-contact__form" onSubmit={onSubmit} noValidate>
                  <div className="oga-contact__row">
                    <div className="oga-contact__field">
                      <label className="oga-contact__label" htmlFor="c-name">
                        Name
                      </label>
                      <input
                        id="c-name"
                        className="oga-contact__input"
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="oga-contact__field">
                      <label className="oga-contact__label" htmlFor="c-email">
                        Work email
                      </label>
                      <input
                        id="c-email"
                        className="oga-contact__input"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="oga-contact__row">
                    <div className="oga-contact__field">
                      <label className="oga-contact__label" htmlFor="c-company">
                        Company <span className="oga-contact__optional">(optional)</span>
                      </label>
                      <input
                        id="c-company"
                        className="oga-contact__input"
                        type="text"
                        autoComplete="organization"
                        value={form.company}
                        onChange={(e) => set("company", e.target.value)}
                      />
                    </div>
                    <div className="oga-contact__field">
                      <label className="oga-contact__label" htmlFor="c-role">
                        I&rsquo;m a&hellip; <span className="oga-contact__optional">(optional)</span>
                      </label>
                      <select
                        id="c-role"
                        className="oga-contact__input oga-contact__select"
                        value={form.role}
                        onChange={(e) => set("role", e.target.value)}
                      >
                        <option value="">Select one</option>
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="oga-contact__field">
                    <label className="oga-contact__label" htmlFor="c-message">
                      How can we help?
                    </label>
                    <textarea
                      id="c-message"
                      className="oga-contact__input oga-contact__textarea"
                      rows={5}
                      value={form.message}
                      onChange={(e) => set("message", e.target.value)}
                      required
                    />
                  </div>

                  {/* Honeypot: hidden from real users, catches naive bots. */}
                  <div className="oga-contact__hp" aria-hidden>
                    <label htmlFor="c-website">Website</label>
                    <input
                      id="c-website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={(e) => set("website", e.target.value)}
                    />
                  </div>

                  {error && (
                    <p className="oga-contact__error" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="oga-btn oga-btn-primary oga-btn-lg oga-contact__submit"
                    disabled={status === "submitting"}
                  >
                    {status === "submitting" ? "Sending…" : "Send message"}
                    {status !== "submitting" && <span aria-hidden>→</span>}
                  </button>

                  <p className="oga-contact__fineprint">
                    We use your details only to reply to this enquiry. See our{" "}
                    <Link href="/privacy">privacy policy</Link>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
