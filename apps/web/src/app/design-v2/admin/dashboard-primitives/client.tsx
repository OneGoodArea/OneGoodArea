"use client";

/* AR-217 Phase 0 — Dashboard primitives showcase client.

   Renders each primitive in all variants + states. Each Phase 0 sub-ticket
   appends a new section here. Showcase, not a real consumer — no API
   calls, no localStorage, no side effects. Inputs are uncontrolled +
   uninteresting (just for visual verification).

   Brand v3 altitude: same vocabulary as /methodology + /products/*.
   Surface rotation (hero → quiet → dark) per feedback-design-bar.

   AR-219: <FormGroup> + <Input> + <Textarea> + <Select>. */

import { useState } from "react";
import { FormGroup, Input, Textarea, Select } from "@/app/design-v2/_shared/dashboard/form-group";
import "./client.css";

export default function DashboardPrimitivesClient() {
  return (
    <div className="oga-root oga-prim-page">
      <Hero />
      <FormGroupSection />
      <FormGroupDarkSection />
    </div>
  );
}

function Hero() {
  return (
    <section className="oga-section-hero oga-prim-hero">
      <div className="oga-prim-hero__inner">
        <p className="oga-eyebrow">AR-217 · Phase 0 · Dev only</p>
        <h1 className="oga-h1 oga-prim-hero__title">
          Dashboard primitives
        </h1>
        <p className="oga-lead oga-prim-hero__lead">
          Brand v3 components the dashboard composes from. Each Phase 0
          sub-ticket lands its primitive here for localhost verification before
          it ships to real consumer pages. Not linked from the sidebar; 404 in
          production.
        </p>
      </div>
    </section>
  );
}

function FormGroupSection() {
  const [text, setText] = useState("");
  const [textarea, setTextarea] = useState("");
  const [select, setSelect] = useState("proptech");

  return (
    <section className="oga-section-quiet oga-prim-section" aria-labelledby="ar-219-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-219 · Foundational</p>
          <h2 id="ar-219-heading" className="oga-h2 oga-prim-section__title">
            FormGroup
          </h2>
          <p className="oga-prim-section__caption">
            Label, control, then either help text or an error message. Used by
            every dashboard form: Levers CRUD, the /welcome flow, Webhooks, IP
            allowlist, Settings. Three input variants ship in this primitive
            (text, textarea, select); checkbox and radio extract on second use.
          </p>
        </header>

        <div className="oga-prim-doc">
          <Variant label="Default" caption="Label + uncontrolled text input. The control inherits all native <input> props.">
            <FormGroup label="Organisation name" htmlFor="demo-org-name">
              <Input
                id="demo-org-name"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Acme Underwriting"
              />
            </FormGroup>
          </Variant>

          <Variant label="With help" caption="Help text sits below the control. Replaced by the error message when one is present.">
            <FormGroup
              label="Workspace slug"
              htmlFor="demo-slug"
              help="Visible in API responses and the org switcher. Lowercase, no spaces."
            >
              <Input id="demo-slug" placeholder="acme-underwriting" />
            </FormGroup>
          </Variant>

          <Variant label="Required" caption="Visual indicator only. Server-side validation is the consumer's responsibility.">
            <FormGroup label="Email" htmlFor="demo-email" required>
              <Input id="demo-email" type="email" placeholder="you@company.com" />
            </FormGroup>
          </Variant>

          <Variant label="Error" caption="Border + message turn red. role=&quot;alert&quot; on the message for screen readers.">
            <FormGroup
              label="API key name"
              htmlFor="demo-key-name"
              error="A key with this name already exists in your org."
              required
            >
              <Input id="demo-key-name" defaultValue="Production" />
            </FormGroup>
          </Variant>

          <Variant label="Disabled" caption="Cream-canvas background, muted text, not-allowed cursor.">
            <FormGroup
              label="Plan tier"
              htmlFor="demo-plan"
              help="Change via the Billing page."
            >
              <Input id="demo-plan" value="Starter" disabled readOnly />
            </FormGroup>
          </Variant>

          <Variant label="Textarea" caption="Auto-height, vertical resize. Same border + focus treatment as the text input.">
            <FormGroup
              label="Webhook description"
              htmlFor="demo-desc"
              help="Optional. Visible to admins only."
            >
              <Textarea
                id="demo-desc"
                value={textarea}
                onChange={(e) => setTextarea(e.target.value)}
                placeholder="Why this webhook exists, what it routes to, who to contact when it fails."
                rows={3}
              />
            </FormGroup>
          </Variant>

          <Variant label="Textarea · error" caption="Multi-line error messaging is supported.">
            <FormGroup
              label="Cohort LSOAs"
              htmlFor="demo-cohort"
              error="3 of the codes pasted are not valid LSOA codes (E01000999, E01001000, E01001001)."
            >
              <Textarea
                id="demo-cohort"
                defaultValue={"E01000001\nE01000002\nE01000999\nE01001000\nE01001001"}
                rows={4}
              />
            </FormGroup>
          </Variant>

          <Variant label="Select" caption="Native select with a CSS chevron. No third-party dependency, accessible by default.">
            <FormGroup label="Intent" htmlFor="demo-intent" required>
              <Select
                id="demo-intent"
                value={select}
                onChange={(e) => setSelect(e.target.value)}
              >
                <option value="proptech">PropTech</option>
                <option value="lenders">Lenders</option>
                <option value="insurance">Insurance</option>
                <option value="cre">Retail / CRE</option>
                <option value="public-sector">Public Sector</option>
              </Select>
            </FormGroup>
          </Variant>

          <Variant label="Select · disabled" caption="Chevron desaturates with the rest of the control.">
            <FormGroup
              label="Engine version"
              htmlFor="demo-engine"
              help="Owner-only. Change from the Methodology page."
            >
              <Select id="demo-engine" value="2.0.2" disabled>
                <option value="2.0.2">v2.0.2 (current)</option>
              </Select>
            </FormGroup>
          </Variant>
        </div>
      </div>
    </section>
  );
}

function FormGroupDarkSection() {
  return (
    <section className="oga-section-dark oga-prim-section" data-oga-surface="dark" aria-labelledby="ar-219-dark-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-219 · Dark surface variant</p>
          <h2 id="ar-219-dark-heading" className="oga-h2 oga-prim-section__title">
            FormGroup on data-oga-surface=&quot;dark&quot;
          </h2>
          <p className="oga-prim-section__caption">
            Inside a modal over a dark backdrop or the sidebar org-create
            dialog. Label inverts to warm white; control background lifts to
            white-on-ink with a translucent fill.
          </p>
        </header>

        <div className="oga-prim-doc oga-prim-doc--dark">
          <Variant label="Default" caption="Same API; the wrapper inherits inverse tokens from data-oga-surface.">
            <FormGroup label="Organisation name" htmlFor="demo-dark-name" required>
              <Input id="demo-dark-name" placeholder="Acme Underwriting" />
            </FormGroup>
          </Variant>

          <Variant label="Error" caption="Status red is lifted +saturation for legibility on dark.">
            <FormGroup
              label="Slug"
              htmlFor="demo-dark-slug"
              error="That slug is already taken in this org."
              required
            >
              <Input id="demo-dark-slug" defaultValue="acme" />
            </FormGroup>
          </Variant>
        </div>
      </div>
    </section>
  );
}

/* Document-style row: variant label (mono) | live control | caption.
   Replaces the card-grid (auto-rejected per design-taste). */
function Variant({ label, caption, children }: { label: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="oga-prim-doc__row">
      <div className="oga-prim-doc__meta">
        <p className="oga-prim-doc__label">{label}</p>
        <p className="oga-prim-doc__caption">{caption}</p>
      </div>
      <div className="oga-prim-doc__demo">{children}</div>
    </div>
  );
}
