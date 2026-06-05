"use client";

/* AR-217 Phase 0 — Dashboard primitives showcase client.

   Renders each primitive in all variants + states. Each Phase 0 sub-ticket
   appends a new section here. Showcase, not a real consumer — no API
   calls, no localStorage, no side effects. Inputs are uncontrolled +
   uninteresting (just for visual verification).

   Brand v3 altitude: same vocabulary as /methodology + /products/*.
   Surface rotation (hero → quiet → dark) per feedback-design-bar.

   AR-219: <FormGroup> + <Input> + <Textarea> + <Select>.
   AR-220: <Modal>. */

import { useState } from "react";
import { FormGroup, Input, Textarea, Select } from "@/app/design-v2/_shared/dashboard/form-group";
import { Modal } from "@/app/design-v2/_shared/dashboard/modal";
import { DropdownMenu } from "@/app/design-v2/_shared/dashboard/dropdown-menu";
import "./client.css";

export default function DashboardPrimitivesClient() {
  return (
    <div className="oga-root oga-prim-page">
      <Hero />
      <FormGroupSection />
      <FormGroupDarkSection />
      <ModalSection />
      <DropdownMenuSection />
      <DropdownMenuDarkSection />
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

/* ============================================================
   AR-221 <DropdownMenu>
   ============================================================ */

function ChevronIcon() {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="14" height="3" viewBox="0 0 14 3" fill="none" aria-hidden="true">
      <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
      <circle cx="7" cy="1.5" r="1.5" fill="currentColor" />
      <circle cx="12.5" cy="1.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function DropdownMenuSection() {
  return (
    <section className="oga-section-quiet oga-prim-section" aria-labelledby="ar-221-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-221 · Foundational</p>
          <h2 id="ar-221-heading" className="oga-h2 oga-prim-section__title">
            DropdownMenu
          </h2>
          <p className="oga-prim-section__caption">
            Trigger + floating panel of actions. Full keyboard navigation
            (arrow keys, Home/End, Escape, Enter), click-outside-to-close,
            focus returns to trigger on close. Used by the org switcher in
            the sidebar, the user menu, row actions on every data table, and
            sort selectors.
          </p>
        </header>

        <div className="oga-prim-doc">
          <Variant label="User menu" caption='Editorial header + grouped items via a labelled divider. The "Account" / sign-out groups are visually distinct.'>
            <DropdownMenu
              trigger={
                <span className="oga-prim-trigger">
                  ptengelmann@gmail.com
                  <ChevronIcon />
                </span>
              }
              triggerClassName="oga-btn oga-btn-secondary"
              header="Signed in as ptengelmann"
              items={[
                { label: "Profile", onClick: () => {} },
                { label: "Settings", onClick: () => {} },
                { label: "Billing", onClick: () => {} },
                { divider: true, label: "Session" },
                { label: "Sign out", danger: true, onClick: () => {} },
              ]}
            />
          </Variant>

          <Variant label="With icons + shortcuts" caption="Icons live on the left at 16px; shortcut hints right-align in mono.">
            <DropdownMenu
              trigger={
                <span className="oga-prim-trigger">
                  Actions
                  <ChevronIcon />
                </span>
              }
              triggerClassName="oga-btn oga-btn-secondary"
              items={[
                {
                  label: "Edit",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M9 2l3 3-7 7H2v-3l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    </svg>
                  ),
                  shortcut: "E",
                  onClick: () => {},
                },
                {
                  label: "Duplicate",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
                      <rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  ),
                  shortcut: "⌘D",
                  onClick: () => {},
                },
                {
                  label: "Copy ID",
                  shortcut: "⌘C",
                  onClick: () => {},
                },
              ]}
            />
          </Variant>

          <Variant label="With destructive action" caption='data-danger="true" renders in status red. Hover bumps to red-tinted bg.'>
            <DropdownMenu
              trigger={
                <span className="oga-prim-trigger oga-prim-trigger--icon" aria-label="Row actions">
                  <MoreIcon />
                </span>
              }
              triggerLabel="Row actions"
              triggerClassName="oga-prim-icon-button"
              items={[
                { label: "Edit portfolio", onClick: () => {} },
                { label: "Enrich now", onClick: () => {} },
                { label: "Export as CSV", onClick: () => {} },
                { label: "Delete portfolio", danger: true, onClick: () => {} },
              ]}
            />
          </Variant>

          <Variant label="With disabled items" caption="Disabled items are skipped by keyboard nav (arrow keys jump past them).">
            <DropdownMenu
              trigger={
                <span className="oga-prim-trigger">
                  Sort by
                  <ChevronIcon />
                </span>
              }
              triggerClassName="oga-btn oga-btn-secondary"
              items={[
                { label: "Most recent", onClick: () => {} },
                { label: "Oldest first", onClick: () => {} },
                { label: "Most active", onClick: () => {}, disabled: true },
                { label: "By score", onClick: () => {} },
                { label: "Custom order", onClick: () => {}, disabled: true },
              ]}
            />
          </Variant>

          <Variant label="End-aligned" caption='align="end" right-aligns the panel with the trigger — for action menus near the right edge.'>
            <div className="oga-prim-end-row">
              <DropdownMenu
                trigger={
                  <span className="oga-prim-trigger oga-prim-trigger--icon" aria-label="Row actions">
                    <MoreIcon />
                  </span>
                }
                triggerLabel="Row actions"
                triggerClassName="oga-prim-icon-button"
                align="end"
                items={[
                  { label: "Rename", onClick: () => {} },
                  { label: "Archive", onClick: () => {} },
                  { label: "Delete", danger: true, onClick: () => {} },
                ]}
              />
            </div>
          </Variant>
        </div>
      </div>
    </section>
  );
}

function DropdownMenuDarkSection() {
  return (
    <section
      className="oga-section-dark oga-prim-section"
      data-oga-surface="dark"
      aria-labelledby="ar-221-dark-heading"
    >
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-221 · Dark surface variant</p>
          <h2 id="ar-221-dark-heading" className="oga-h2 oga-prim-section__title">
            DropdownMenu on dark
          </h2>
          <p className="oga-prim-section__caption">
            Used inside the sidebar (org switcher, user menu) and on any
            dark-surface page that needs action menus. Same API; the panel
            inverts to graphite-ink with warm-white text and the soft-warm
            hover signature (matching the /about page card recipe).
          </p>
        </header>

        <div className="oga-prim-doc oga-prim-doc--dark">
          <Variant label="Org switcher" caption="The exact pattern AR-234 OrgSwitcher will use. Editorial header + divider separating membership from the create action.">
            <DropdownMenu
              trigger={
                <span className="oga-prim-trigger oga-prim-trigger--dark">
                  <span className="oga-prim-trigger__primary">Acme Underwriting</span>
                  <span className="oga-prim-trigger__role">Owner</span>
                  <ChevronIcon />
                </span>
              }
              triggerClassName="oga-prim-sidebar-trigger"
              header="Switch organisation"
              items={[
                { label: "Acme Underwriting (owner)", onClick: () => {} },
                { label: "ptengelmann's workspace (owner)", onClick: () => {} },
                { label: "BrightStar Lending (member)", onClick: () => {} },
                { divider: true },
                {
                  label: "Create new org…",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ),
                  onClick: () => {},
                },
              ]}
            />
          </Variant>

          <Variant label="User menu" caption="Bottom-of-sidebar profile menu. End-aligned, danger sign-out.">
            <div className="oga-prim-end-row">
              <DropdownMenu
                trigger={
                  <span className="oga-prim-trigger oga-prim-trigger--dark">
                    ptengelmann
                    <ChevronIcon />
                  </span>
                }
                triggerClassName="oga-prim-sidebar-trigger"
                align="end"
                items={[
                  { label: "Profile", onClick: () => {} },
                  { label: "Switch theme", onClick: () => {} },
                  { label: "Settings", onClick: () => {} },
                  { label: "Sign out", danger: true, onClick: () => {} },
                ]}
              />
            </div>
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

/* ============================================================
   AR-220 <Modal>
   ============================================================ */

function ModalSection() {
  const [defaultOpen, setDefaultOpen] = useState(false);
  const [smOpen, setSmOpen] = useState(false);
  const [lgOpen, setLgOpen] = useState(false);
  const [mustConfirmOpen, setMustConfirmOpen] = useState(false);
  const [darkOpen, setDarkOpen] = useState(false);
  const [withFormOpen, setWithFormOpen] = useState(false);

  return (
    <section className="oga-section-quiet oga-prim-section" aria-labelledby="ar-220-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-220 · Foundational</p>
          <h2 id="ar-220-heading" className="oga-h2 oga-prim-section__title">
            Modal
          </h2>
          <p className="oga-prim-section__caption">
            Focused overlay built on the native <code className="oga-prim-code">&lt;dialog&gt;</code> element.
            Focus trap, escape key, body scroll lock, top-layer positioning all come
            for free. Used for delete confirmations, create dialogs, reveal-once
            secrets (API key + webhook secret), and the &quot;Show the curl&quot; panel
            from Intelligence.
          </p>
        </header>

        <div className="oga-prim-doc">
          <Variant label="Default · md" caption="The standard shape: title, body, footer with cancel + confirm.">
            <button type="button" className="oga-btn oga-btn-secondary" onClick={() => setDefaultOpen(true)}>
              Open default modal
            </button>
            <Modal
              open={defaultOpen}
              onClose={() => setDefaultOpen(false)}
              title="Rename portfolio"
              footer={
                <>
                  <button type="button" className="oga-btn oga-btn-secondary" onClick={() => setDefaultOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="oga-btn oga-btn-primary" onClick={() => setDefaultOpen(false)}>
                    Save
                  </button>
                </>
              }
            >
              <p>Pick a new name for this portfolio. Members will see the new name on their next sync.</p>
            </Modal>
          </Variant>

          <Variant label="Small" caption="400px max. For quick yes/no confirmations.">
            <button type="button" className="oga-btn oga-btn-secondary" onClick={() => setSmOpen(true)}>
              Open small modal
            </button>
            <Modal
              open={smOpen}
              onClose={() => setSmOpen(false)}
              title="Delete this preset?"
              size="sm"
              footer={
                <>
                  <button type="button" className="oga-btn oga-btn-secondary" onClick={() => setSmOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="oga-btn oga-btn-primary" onClick={() => setSmOpen(false)}>
                    Delete
                  </button>
                </>
              }
            >
              <p>The preset will be permanently removed from your org. This cannot be undone.</p>
            </Modal>
          </Variant>

          <Variant label="Large" caption="720px max. For richer content — code blocks, multi-section dialogs.">
            <button type="button" className="oga-btn oga-btn-secondary" onClick={() => setLgOpen(true)}>
              Open large modal
            </button>
            <Modal
              open={lgOpen}
              onClose={() => setLgOpen(false)}
              title="Show the curl"
              size="lg"
              footer={
                <button type="button" className="oga-btn oga-btn-primary" onClick={() => setLgOpen(false)}>
                  Close
                </button>
              }
            >
              <p>The Intelligence query you just ran, as a programmatic plan you can replay from your own backend:</p>
              <pre className="oga-prim-pre">
{`curl -X POST https://api.onegoodarea.com/v1/query \\
  -H "Authorization: Bearer oga_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "plan": {
      "op": "rank_areas",
      "signals": [
        { "key": "property.price_change_pct_yoy",
          "filter": { "gt": 0 } },
        { "key": "crime.total_12m_percentile",
          "filter": { "lte": 50 } }
      ],
      "sort_by": "property.price_change_pct_yoy",
      "order": "desc",
      "limit": 5
    }
  }'`}
              </pre>
            </Modal>
          </Variant>

          <Variant label="Must confirm" caption="closeOnBackdrop=false. User has to explicitly cancel — backdrop clicks ignored.">
            <button type="button" className="oga-btn oga-btn-secondary" onClick={() => setMustConfirmOpen(true)}>
              Open must-confirm modal
            </button>
            <Modal
              open={mustConfirmOpen}
              onClose={() => setMustConfirmOpen(false)}
              title="Delete this org and all data?"
              size="sm"
              closeOnBackdrop={false}
              footer={
                <>
                  <button type="button" className="oga-btn oga-btn-secondary" onClick={() => setMustConfirmOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="oga-btn oga-btn-primary" onClick={() => setMustConfirmOpen(false)}>
                    Delete org
                  </button>
                </>
              }
            >
              <p>All members, portfolios, bundles, presets, cohorts, and API keys will be permanently deleted. This cannot be undone.</p>
            </Modal>
          </Variant>

          <Variant label="With form" caption="Modal body composes other primitives. FormGroup + Input fit naturally inside.">
            <button type="button" className="oga-btn oga-btn-secondary" onClick={() => setWithFormOpen(true)}>
              Open create-org dialog
            </button>
            <Modal
              open={withFormOpen}
              onClose={() => setWithFormOpen(false)}
              title="Create new org"
              footer={
                <>
                  <button type="button" className="oga-btn oga-btn-secondary" onClick={() => setWithFormOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="oga-btn oga-btn-primary" onClick={() => setWithFormOpen(false)}>
                    Create org
                  </button>
                </>
              }
            >
              <div className="oga-prim-form-stack">
                <FormGroup
                  label="Organisation name"
                  htmlFor="modal-org-name"
                  help="Visible to your team and on /v1/me responses."
                  required
                >
                  <Input id="modal-org-name" placeholder="Acme Underwriting" />
                </FormGroup>
                <FormGroup
                  label="Slug"
                  htmlFor="modal-org-slug"
                  help="Lowercase, no spaces. Used in API responses."
                >
                  <Input id="modal-org-slug" placeholder="acme-underwriting" />
                </FormGroup>
              </div>
            </Modal>
          </Variant>

          <Variant label="Dark variant" caption='data-oga-surface="dark". Used to escalate destructive moments — the surface change carries the gravity.'>
            <button type="button" className="oga-btn oga-btn-secondary" onClick={() => setDarkOpen(true)}>
              Open dark modal
            </button>
            <Modal
              open={darkOpen}
              onClose={() => setDarkOpen(false)}
              title="Revoke this API key?"
              size="sm"
              surface="dark"
              footer={
                <>
                  <button type="button" className="oga-btn oga-btn-secondary" onClick={() => setDarkOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="oga-btn oga-btn-primary" onClick={() => setDarkOpen(false)}>
                    Revoke key
                  </button>
                </>
              }
            >
              <p>The key &quot;Production&quot; will stop validating immediately. Any service calling the API with this key will start failing with 401.</p>
            </Modal>
          </Variant>
        </div>
      </div>
    </section>
  );
}
