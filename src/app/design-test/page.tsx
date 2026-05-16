"use client";

/* ============================================================
   OneGoodArea — Brand v3 (Plotted) design-test surface

   AR-151 deliverable. Renders every brand primitive in isolation
   so Pedro can smoke-test the system before any live surface
   adopts it. Toggle at top of page flips data-oga-surface on
   <body> for whole-page dark-mode preview.

   This route is intentionally NOT linked from any nav. Visit
   directly: /design-test
   ============================================================ */

import { useEffect, useState } from "react";

const MARK_SVG_INLINE = (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="OneGoodArea Plotted mark" role="img">
    <g fill="currentColor">
      <circle cx="60" cy="18" r="2.6" />
      <circle cx="32" cy="32" r="2.6" /><circle cx="46" cy="32" r="2.6" /><circle cx="60" cy="32" r="2.6" /><circle cx="74" cy="32" r="2.6" /><circle cx="88" cy="32" r="2.6" />
      <circle cx="18" cy="46" r="2.6" /><circle cx="32" cy="46" r="2.6" /><circle cx="46" cy="46" r="2.6" /><circle cx="60" cy="46" r="2.6" /><circle cx="74" cy="46" r="2.6" /><circle cx="88" cy="46" r="2.6" /><circle cx="102" cy="46" r="2.6" />
      <circle cx="18" cy="60" r="2.6" /><circle cx="32" cy="60" r="2.6" /><circle cx="46" cy="60" r="2.6" /><circle cx="60" cy="60" r="5" /><circle cx="74" cy="60" r="2.6" /><circle cx="88" cy="60" r="2.6" /><circle cx="102" cy="60" r="2.6" />
      <circle cx="18" cy="74" r="2.6" /><circle cx="32" cy="74" r="2.6" /><circle cx="46" cy="74" r="2.6" /><circle cx="60" cy="74" r="2.6" /><circle cx="74" cy="74" r="2.6" /><circle cx="88" cy="74" r="2.6" /><circle cx="102" cy="74" r="2.6" />
      <circle cx="32" cy="88" r="2.6" /><circle cx="46" cy="88" r="2.6" /><circle cx="60" cy="88" r="2.6" /><circle cx="74" cy="88" r="2.6" /><circle cx="88" cy="88" r="2.6" />
      <circle cx="60" cy="102" r="2.6" />
    </g>
  </svg>
);

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ padding: "var(--oga-7) 0", borderTop: "1px solid var(--oga-border)" }}>
      <div className="oga-eyebrow" style={{ marginBottom: "var(--oga-2)" }}>{eyebrow}</div>
      <h2 className="oga-h2" style={{ margin: 0, marginBottom: "var(--oga-6)" }}>{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ label, color, value }: { label: string; color: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--oga-2)" }}>
      <div style={{
        width: "100%",
        aspectRatio: "1 / 1",
        background: color,
        borderRadius: "var(--oga-radius-md)",
        border: "1px solid var(--oga-border)",
      }} />
      <div className="oga-label" style={{ color: "var(--oga-fg)" }}>{label}</div>
      <div style={{ fontFamily: "var(--oga-font-mono)", fontSize: "11px", color: "var(--oga-fg-muted)" }}>{value}</div>
    </div>
  );
}

export default function DesignTestPage() {
  const [surface, setSurface] = useState<"light" | "dark">("light");

  useEffect(() => {
    const body = document.body;
    const prev = body.getAttribute("data-oga-surface");
    if (surface === "dark") body.setAttribute("data-oga-surface", "dark");
    else body.removeAttribute("data-oga-surface");
    return () => {
      if (prev === null) body.removeAttribute("data-oga-surface");
      else body.setAttribute("data-oga-surface", prev);
    };
  }, [surface]);

  return (
    <main className="oga-root" style={{
      minHeight: "100vh",
      background: surface === "dark" ? "var(--oga-green)" : "var(--oga-canvas)",
      color: "var(--oga-fg)",
      padding: "var(--oga-7) var(--oga-7)",
    }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--oga-5)", marginBottom: "var(--oga-7)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--oga-4)" }}>
            <span className="oga-mark oga-mark-md">{MARK_SVG_INLINE}</span>
            <div>
              <div className="oga-eyebrow">Brand v3 · Plotted · AR-151</div>
              <h1 className="oga-h3" style={{ margin: 0 }}>design-test</h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--oga-3)" }}>
            <span className="oga-label">Surface</span>
            <button
              type="button"
              className="oga-btn oga-btn-secondary"
              onClick={() => setSurface(s => s === "light" ? "dark" : "light")}
            >
              {surface === "light" ? "Switch to dark" : "Switch to light"}
            </button>
          </div>
        </header>

        {/* Index */}
        <nav style={{ marginBottom: "var(--oga-7)", fontFamily: "var(--oga-font-mono)", fontSize: "13px", color: "var(--oga-fg-muted)" }}>
          {[
            ["type", "Type scale"],
            ["color", "Color"],
            ["mark", "Mark"],
            ["icon-tiles", "Icon tiles"],
            ["buttons", "Buttons"],
            ["cards", "Cards"],
            ["status", "Status palette"],
            ["dot-field", "Dot field motif"],
            ["fades", "Fade masks"],
            ["dividers", "Dividers"],
            ["sections", "Section shells"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} style={{ marginRight: "var(--oga-4)", color: "inherit", textDecoration: "none", borderBottom: "1px dashed var(--oga-border)" }}>
              {label}
            </a>
          ))}
        </nav>

        {/* ---------- Type ---------- */}
        <Section id="type" eyebrow="01 - Foundation" title="Type scale">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--oga-4)" }}>
            <div className="oga-eyebrow">eyebrow / mono / 11px / 0.22em</div>
            <div className="oga-label">label / mono / 13px / 0.18em</div>
            <div className="oga-display">display 72px</div>
            <h1 className="oga-h1" style={{ margin: 0 }}>headline h1 / 48px</h1>
            <h2 className="oga-h2" style={{ margin: 0 }}>headline h2 / 36px</h2>
            <h3 className="oga-h3" style={{ margin: 0 }}>headline h3 / 26px</h3>
            <h4 className="oga-h4" style={{ margin: 0 }}>headline h4 / 20px</h4>
            <p className="oga-lead" style={{ margin: 0 }}>lead paragraph at 18px. used for sub-heroes, intro paragraphs, and pull quotes. text-wrap: pretty handles widows.</p>
            <p style={{ margin: 0, color: "var(--oga-fg)" }}>body paragraph at 16px. the default reading surface. lowercase sentence case is the brand default; mono labels are the only place that goes UPPERCASE.</p>
          </div>
        </Section>

        {/* ---------- Color ---------- */}
        <Section id="color" eyebrow="02 - Foundation" title="Color tokens">
          <div className="oga-label" style={{ marginBottom: "var(--oga-3)" }}>Brand (two-color only)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "var(--oga-4)", marginBottom: "var(--oga-6)" }}>
            <Swatch label="green" color="#0E3B2A" value="--oga-green / #0E3B2A" />
            <Swatch label="white" color="#FAF8F4" value="--oga-white / #FAF8F4" />
            <Swatch label="canvas" color="#EFECE6" value="--oga-canvas / #EFECE6" />
          </div>

          <div className="oga-label" style={{ marginBottom: "var(--oga-3)" }}>Derived tints (typography only — not new brand colors)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "var(--oga-4)", marginBottom: "var(--oga-6)" }}>
            <Swatch label="green-95" color="#DCE3DF" value="hairline borders" />
            <Swatch label="green-80" color="#B6C2BC" value="—" />
            <Swatch label="green-50" color="#87958D" value="muted body" />
            <Swatch label="green-30" color="#4E5F56" value="secondary text" />
          </div>

          <div className="oga-label" style={{ marginBottom: "var(--oga-3)" }}>Status palette (product surface only, never marketing chrome)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "var(--oga-4)" }}>
            <Swatch label="status-red" color="var(--oga-status-red)" value="error / risk / 0-39" />
            <Swatch label="status-amber" color="var(--oga-status-amber)" value="caution / 40-69" />
            <Swatch label="status-yellow" color="var(--oga-status-yellow)" value="info / pending" />
            <Swatch label="status-green" color="var(--oga-status-green)" value="ok / 70-100" />
          </div>
        </Section>

        {/* ---------- Mark ---------- */}
        <Section id="mark" eyebrow="03 - Brand asset" title="Plotted mark">
          <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--oga-6)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--oga-2)", alignItems: "center" }}>
              <span className="oga-mark oga-mark-sm">{MARK_SVG_INLINE}</span>
              <span className="oga-label">sm / 24px</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--oga-2)", alignItems: "center" }}>
              <span className="oga-mark oga-mark-md">{MARK_SVG_INLINE}</span>
              <span className="oga-label">md / 40px</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--oga-2)", alignItems: "center" }}>
              <span className="oga-mark oga-mark-lg">{MARK_SVG_INLINE}</span>
              <span className="oga-label">lg / 72px</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--oga-2)", alignItems: "center" }}>
              <span className="oga-mark oga-mark-xl">{MARK_SVG_INLINE}</span>
              <span className="oga-label">xl / 128px</span>
            </div>
          </div>
          <p className="oga-label" style={{ marginTop: "var(--oga-5)" }}>
            Mark inherits color from `currentColor`. Light/dark inverts automatically with surface.
          </p>
        </Section>

        {/* ---------- Icon tiles ---------- */}
        <Section id="icon-tiles" eyebrow="04 - Brand asset" title="App-icon tiles (squircle)">
          <div style={{ display: "flex", gap: "var(--oga-5)", flexWrap: "wrap" }}>
            <div className="oga-icon-tile">
              <span className="oga-mark">{MARK_SVG_INLINE}</span>
            </div>
            <div className="oga-icon-tile" data-variant="dark">
              <span className="oga-mark">{MARK_SVG_INLINE}</span>
            </div>
          </div>
        </Section>

        {/* ---------- Buttons ---------- */}
        <Section id="buttons" eyebrow="05 - Components" title="Buttons">
          <div className="oga-label" style={{ marginBottom: "var(--oga-3)" }}>Default (38px) — Anthropic / macOS altitude</div>
          <div style={{ display: "flex", gap: "var(--oga-3)", flexWrap: "wrap", marginBottom: "var(--oga-5)" }}>
            <button type="button" className="oga-btn oga-btn-primary">Primary action</button>
            <button type="button" className="oga-btn oga-btn-secondary">Secondary</button>
            <button type="button" className="oga-btn oga-btn-ghost">Ghost</button>
          </div>

          <div className="oga-label" style={{ marginBottom: "var(--oga-3)" }}>Small (30px) — for dense UIs, nav bars, table actions</div>
          <div style={{ display: "flex", gap: "var(--oga-3)", flexWrap: "wrap", marginBottom: "var(--oga-5)" }}>
            <button type="button" className="oga-btn oga-btn-sm oga-btn-primary">Primary</button>
            <button type="button" className="oga-btn oga-btn-sm oga-btn-secondary">Secondary</button>
            <button type="button" className="oga-btn oga-btn-sm oga-btn-ghost">Ghost</button>
          </div>

          <div className="oga-label" style={{ marginBottom: "var(--oga-3)" }}>Large (44px) — hero CTAs only</div>
          <div style={{ display: "flex", gap: "var(--oga-3)", flexWrap: "wrap" }}>
            <button type="button" className="oga-btn oga-btn-lg oga-btn-primary">Get started</button>
            <button type="button" className="oga-btn oga-btn-lg oga-btn-secondary">Book a call</button>
          </div>
        </Section>

        {/* ---------- Cards ---------- */}
        <Section id="cards" eyebrow="06 - Components" title="Card">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--oga-4)" }}>
            <div className="oga-card">
              <div className="oga-eyebrow" style={{ marginBottom: "var(--oga-2)" }}>Sample card</div>
              <h3 className="oga-h4" style={{ margin: 0, marginBottom: "var(--oga-3)" }}>area intelligence layer</h3>
              <p style={{ margin: 0, color: "var(--oga-fg-subtle)" }}>
                Deterministic numbers. Cited sources. Version-pinned methodology.
              </p>
            </div>
            <div className="oga-card">
              <div className="oga-eyebrow" style={{ marginBottom: "var(--oga-2)" }}>Stat</div>
              <div style={{ fontFamily: "var(--oga-font-mono)", fontSize: "32px", fontWeight: 500, marginBottom: "var(--oga-2)" }}>97<span style={{ color: "var(--oga-fg-muted)", fontSize: "20px" }}>/100</span></div>
              <div className="oga-label">Engine confidence</div>
            </div>
          </div>
        </Section>

        {/* ---------- Status palette ---------- */}
        <Section id="status" eyebrow="07 - Components" title="Status pills">
          <div style={{ display: "flex", gap: "var(--oga-3)", flexWrap: "wrap" }}>
            <span className="oga-status oga-status-red">0-39 / risk</span>
            <span className="oga-status oga-status-amber">40-69 / caution</span>
            <span className="oga-status oga-status-yellow">pending / info</span>
            <span className="oga-status oga-status-green">70-100 / ok</span>
          </div>
        </Section>

        {/* ---------- Dot field ---------- */}
        <Section id="dot-field" eyebrow="08 - Motif" title="Plotted dot field">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--oga-4)" }}>
            <div className="oga-bg-dots" style={{ height: 140, borderRadius: "var(--oga-radius-md)" }}>
              <div className="oga-label" style={{ padding: "var(--oga-3)" }}>default / 14px</div>
            </div>
            <div className="oga-bg-dots oga-bg-dots-dense" style={{ height: 140, borderRadius: "var(--oga-radius-md)" }}>
              <div className="oga-label" style={{ padding: "var(--oga-3)" }}>dense / 10px</div>
            </div>
            <div className="oga-bg-dots oga-bg-dots-loose" style={{ height: 140, borderRadius: "var(--oga-radius-md)" }}>
              <div className="oga-label" style={{ padding: "var(--oga-3)" }}>loose / 22px</div>
            </div>
            <div className="oga-bg-dots oga-bg-dots-faint" style={{ height: 140, borderRadius: "var(--oga-radius-md)" }}>
              <div className="oga-label" style={{ padding: "var(--oga-3)" }}>faint</div>
            </div>
            <div className="oga-bg-dots oga-bg-dots-strong" style={{ height: 140, borderRadius: "var(--oga-radius-md)" }}>
              <div className="oga-label" style={{ padding: "var(--oga-3)" }}>strong</div>
            </div>
            <div className="oga-bg-dots-on-dark" style={{ height: 140, borderRadius: "var(--oga-radius-md)" }}>
              <div className="oga-label" style={{ padding: "var(--oga-3)", color: "var(--oga-white)" }}>on dark</div>
            </div>
          </div>
        </Section>

        {/* ---------- Fade masks ---------- */}
        <Section id="fades" eyebrow="09 - Motif" title="Fade masks">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--oga-4)" }}>
            <div className="oga-bg-dots oga-fade-right" style={{ height: 120, borderRadius: "var(--oga-radius-md)" }}>
              <div className="oga-label" style={{ padding: "var(--oga-3)" }}>fade right</div>
            </div>
            <div className="oga-bg-dots oga-fade-left" style={{ height: 120, borderRadius: "var(--oga-radius-md)" }}>
              <div className="oga-label" style={{ padding: "var(--oga-3)" }}>fade left</div>
            </div>
            <div className="oga-bg-dots oga-fade-vignette" style={{ height: 120, borderRadius: "var(--oga-radius-md)" }}>
              <div className="oga-label" style={{ padding: "var(--oga-3)" }}>vignette</div>
            </div>
            <div className="oga-bg-dots oga-fade-edges" style={{ height: 120, borderRadius: "var(--oga-radius-md)" }}>
              <div className="oga-label" style={{ padding: "var(--oga-3)" }}>edges</div>
            </div>
          </div>
        </Section>

        {/* ---------- Dividers ---------- */}
        <Section id="dividers" eyebrow="10 - Motif" title="Dividers">
          <div className="oga-rule-mark" aria-hidden="true"></div>

          <div className="oga-rule-mark">
            <span className="oga-rule-mark__line"></span>
            <span className="oga-rule-mark__mark"></span>
            <span className="oga-rule-mark__label">02 · METHOD</span>
            <span className="oga-rule-mark__line"></span>
          </div>

          <hr className="oga-rule-plain" />
        </Section>

        {/* ---------- Section shells ---------- */}
        <Section id="sections" eyebrow="11 - Composition" title="Section shells">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--oga-4)" }}>
            <div className="oga-section-hero" style={{ borderRadius: "var(--oga-radius-lg)", padding: "var(--oga-7) var(--oga-6)" }}>
              <div className="oga-eyebrow">hero shell</div>
              <h3 className="oga-h2" style={{ margin: "var(--oga-3) 0" }}>the decision-grade area intelligence layer for UK property workflows</h3>
              <p className="oga-lead" style={{ margin: 0 }}>
                Deterministic numbers. Cited sources. Version-pinned methodology.
              </p>
            </div>

            <div className="oga-section-quiet" style={{ borderRadius: "var(--oga-radius-lg)", padding: "var(--oga-7) var(--oga-6)" }}>
              <div className="oga-eyebrow">quiet shell</div>
              <h3 className="oga-h3" style={{ margin: "var(--oga-3) 0" }}>between dense sections</h3>
              <p style={{ margin: 0, color: "var(--oga-fg-subtle)" }}>White surface, faint mark watermark in the bottom-right corner.</p>
            </div>

            <div className="oga-section-dark" style={{ borderRadius: "var(--oga-radius-lg)", padding: "var(--oga-7) var(--oga-6)" }}>
              <div className="oga-eyebrow" style={{ color: "rgba(250,248,244,0.65)" }}>dark shell</div>
              <h3 className="oga-h3" style={{ margin: "var(--oga-3) 0" }}>the layer LLMs call when the answer has to be auditable</h3>
              <p style={{ margin: 0, color: "rgba(250,248,244,0.65)" }}>Forest green surface with inverted dot field.</p>
            </div>
          </div>
        </Section>

        <footer style={{ marginTop: "var(--oga-9)", paddingTop: "var(--oga-5)", borderTop: "1px solid var(--oga-border)" }}>
          <div className="oga-label">end · AR-151 · brand v3 (plotted)</div>
        </footer>
      </div>
    </main>
  );
}
