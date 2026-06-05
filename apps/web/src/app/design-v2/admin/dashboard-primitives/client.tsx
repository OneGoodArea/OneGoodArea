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
import { ToastProvider, useToast } from "@/app/design-v2/_shared/dashboard/toast";
import { Tabs } from "@/app/design-v2/_shared/dashboard/tabs";
import "./client.css";

export default function DashboardPrimitivesClient() {
  return (
    <ToastProvider>
      <div className="oga-root oga-prim-page">
        <Hero />
        <FormGroupSection />
        <FormGroupDarkSection />
        <ModalSection />
        <DropdownMenuSection />
        <DropdownMenuDarkSection />
        <ToastSection />
        <TabsSection />
        <TabsDarkSection />
      </div>
    </ToastProvider>
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

/* ============================================================
   AR-222 <Toast>
   ============================================================ */

function ToastSection() {
  const { toast, dismissAll } = useToast();

  return (
    <section className="oga-section-quiet oga-prim-section" aria-labelledby="ar-222-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-222 · Foundational</p>
          <h2 id="ar-222-heading" className="oga-h2 oga-prim-section__title">
            Toast
          </h2>
          <p className="oga-prim-section__caption">
            Non-blocking notification stack — corner-anchored bottom-right,
            newest on top, auto-dismiss after 5s with pause-on-hover.
            <code className="oga-prim-code">useToast()</code> fires from any
            client component under <code className="oga-prim-code">&lt;ToastProvider&gt;</code>.
            Used everywhere an action wants quiet feedback: preset saved,
            API key copied, member removed, webhook delivered, 403 admin
            required, IP not allowed.
          </p>
        </header>

        <div className="oga-prim-doc">
          <Variant label="Success" caption='Green checkmark + left-edge accent. Auto-dismisses after 5s; hover pauses.'>
            <button
              type="button"
              className="oga-btn oga-btn-secondary"
              onClick={() =>
                toast({
                  variant: "success",
                  title: "Preset saved",
                  body: "Acme Underwriting preset now applies to /v1/score requests.",
                })
              }
            >
              Fire success toast
            </button>
          </Variant>

          <Variant label="Info" caption="Default variant. Neutral ink-muted icon. For ambient confirmations.">
            <button
              type="button"
              className="oga-btn oga-btn-secondary"
              onClick={() =>
                toast({
                  variant: "info",
                  title: "Bulk enrich queued",
                  body: "47 areas in your portfolio will be scored. We'll notify you when it's done.",
                })
              }
            >
              Fire info toast
            </button>
          </Variant>

          <Variant label="Warning" caption="Amber triangle. Calls attention without blocking. aria-live='assertive'.">
            <button
              type="button"
              className="oga-btn oga-btn-secondary"
              onClick={() =>
                toast({
                  variant: "warning",
                  title: "Quota at 90%",
                  body: "Your monthly API quota is nearly spent. Upgrade to keep serving requests after the period rolls over.",
                })
              }
            >
              Fire warning toast
            </button>
          </Variant>

          <Variant label="Error" caption="Red x-in-circle. For 4xx + 5xx outcomes. aria-live='assertive', role='alert'.">
            <button
              type="button"
              className="oga-btn oga-btn-secondary"
              onClick={() =>
                toast({
                  variant: "error",
                  title: "403 ip_not_allowed",
                  body: "Your current IP isn't in the org's allowlist. Ask an admin to add 192.168.1.42/32.",
                })
              }
            >
              Fire error toast
            </button>
          </Variant>

          <Variant label="With action" caption='Right-aligned action button (e.g. "Undo"). Clicking fires the handler + dismisses.'>
            <button
              type="button"
              className="oga-btn oga-btn-secondary"
              onClick={() =>
                toast({
                  variant: "success",
                  title: "Member removed",
                  body: "marcos@onegoodarea.co.uk no longer has access to Acme Underwriting.",
                  action: {
                    label: "Undo",
                    onClick: () => {
                      toast({ variant: "info", title: "Restored membership" });
                    },
                  },
                })
              }
            >
              Fire toast with action
            </button>
          </Variant>

          <Variant label="Sticky (duration=0)" caption="Auto-dismiss disabled. User must click X or call dismiss(id).">
            <button
              type="button"
              className="oga-btn oga-btn-secondary"
              onClick={() =>
                toast({
                  variant: "warning",
                  title: "Resend DNS pending",
                  body: "Until SPF + DKIM propagate at IONOS, password-reset emails won't deliver. Pedro's manual action.",
                  duration: 0,
                })
              }
            >
              Fire sticky toast
            </button>
          </Variant>

          <Variant label="Stack test" caption="Fire 5 toasts quickly to see stacking. Max 5 visible; older toasts evict.">
            <div className="oga-prim-button-row">
              <button
                type="button"
                className="oga-btn oga-btn-secondary"
                onClick={() => {
                  toast({ variant: "success", title: "Webhook delivered", body: "report.created → https://hooks.acme.dev/oga" });
                  toast({ variant: "info", title: "Cron run completed", body: "Re-scored 1,283 postcodes. Run id run_2026_06_05." });
                  toast({ variant: "success", title: "Bundle updated", body: "Lender-only bundle now includes 12 signals." });
                  toast({ variant: "warning", title: "Methodology pin will affect 4 future calls", body: "Your org pinned to v2.0.1." });
                  toast({ variant: "success", title: "API key copied", body: "oga_live_*** copied to clipboard." });
                }}
              >
                Fire 5 toasts
              </button>
              <button type="button" className="oga-btn oga-btn-secondary" onClick={dismissAll}>
                Dismiss all
              </button>
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

/* ============================================================
   AR-228 <Tabs>
   ============================================================
   Inline 14x14 line icons. Where the concept overlaps with the
   AiqIcon set (key, billing, compare), the silhouette mirrors
   the higher-altitude icon so the visual idea reads the same. */

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="1.5" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1.5" y="8" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="8" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 2L1.5 3.5v8.5L5 10.5l4 1.5 3.5-1.5V2L9 3.5 5 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5 2v8.5M9 3.5V12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/* ---------- Intelligence sub-tab icons ---------- */

function QueryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="3.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function NlIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 3.5h10v6H7l-3 2.5v-2.5H2v-6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="5" cy="6.5" r="0.6" fill="currentColor" />
      <circle cx="7" cy="6.5" r="0.6" fill="currentColor" />
      <circle cx="9" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

function PeersIcon() {
  /* Bracket pair facing each other — mirrors AiqIcon "compare" intent. */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M4 2L1.5 4.5 4 7M4 7L1.5 9.5 4 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 2l2.5 2.5L10 7M10 7l2.5 2.5L10 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 1v12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

function InsightsIcon() {
  /* Lightbulb */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5a3.8 3.8 0 0 0-2.3 6.8v1.7h4.6V8.3A3.8 3.8 0 0 0 7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.5 11h3M6 12.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ForecastIcon() {
  /* Trendline going forward + up */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 11l3-3 2.5 2L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 4h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 11h-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.5 1.2" />
    </svg>
  );
}

/* ---------- Settings sub-tab icons ---------- */

function ProfileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="5" r="2.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 12c.7-2.2 2.4-3.5 4.5-3.5s3.8 1.3 4.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function MembersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="10" cy="5.5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 11.5c.6-1.7 2-2.7 3.5-2.7s2.9 1 3.5 2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 11.5c.4-1.4 1.5-2.2 2.7-2.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function KeyIcon() {
  /* Mirrors AiqIcon "key" silhouette — circle bow + stem with teeth. */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="4" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 7H12M10 7v2M12 7v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function WebhookIcon() {
  /* Mirrors GlyphWebhooks (homepage section 04) at tab scale: source
     node on the left emitting 2 concentric arcs outward to a
     subscriber dot on the right. Same visual idea (push), compressed
     to a 14x14 inline glyph. The hero illustration has 3 arcs +
     pulse animation; at this size 2 arcs read cleaner and no
     animation. */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="3.5" cy="7" r="1.6" fill="currentColor" />
      <path d="M5.5 4.5a3.2 3.2 0 0 1 0 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7.5 3a5 5 0 0 1 0 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <circle cx="11" cy="7" r="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function BillingIcon() {
  /* Mirrors AiqIcon "billing" silhouette — card with stripe */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="3" width="11" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 8.5h2M7 8.5h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Portfolio views icons ---------- */

function PortfolioIcon() {
  /* Folder */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 4a1 1 0 0 1 1-1h3l1.5 1.5h5a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1h-9.5a1 1 0 0 1-1-1V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function CohortsIcon() {
  /* Three intersecting circles — cohort overlap */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="9" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="9" r="2.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function BundlesIcon() {
  /* Stack of layers */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5l5.5 2.5L7 6.5 1.5 4 7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1.5 7L7 9.5 12.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1.5 10L7 12.5 12.5 10" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function CompareIcon() {
  /* Mirrors AiqIcon "compare" silhouette — split rectangle */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="11" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 2.5v9" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 1.2" />
      <path d="M3 5h2.5M3 7h2.5M3 9h1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8.5 5h2.5M8.5 7h2M8.5 9h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ExportsIcon() {
  /* Download arrow into tray */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5v6.5M4.5 6L7 8.5 9.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 9.5v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Monitor sub-tab icons (dark) ---------- */

function ChangesIcon() {
  /* Clock with arrow — activity/changes feed */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4v3.2L9 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function AlertsIcon() {
  /* Bell */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 9.5c.5-.4.8-1 .8-1.7V6.5a3.2 3.2 0 0 1 6.4 0v1.3c0 .7.3 1.3.8 1.7H3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.8 11.5c.2.6.7 1 1.2 1s1-.4 1.2-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function TabsSection() {
  const [intelligenceTab, setIntelligenceTab] = useState("query");
  const [settingsTab, setSettingsTab] = useState("profile");
  const [iconTab, setIconTab] = useState("monitor");
  const [skipTab, setSkipTab] = useState("portfolios");
  const [filterTab, setFilterTab] = useState("all");
  const [viewTab, setViewTab] = useState("list");

  return (
    <section className="oga-section-quiet oga-prim-section" aria-labelledby="ar-228-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-228 · Foundational</p>
          <h2 id="ar-228-heading" className="oga-h2 oga-prim-section__title">
            Tabs
          </h2>
          <p className="oga-prim-section__caption">
            Horizontal tab strip — controlled, fully keyboard-navigable (arrow
            keys, Home/End), roving tabindex per WAI-ARIA Tabs pattern. Two
            variants: underline (Intelligence sub-tabs, Settings sections,
            Monitor sub-views) and pill (filter strips, view-mode toggles).
            The component renders only the strip — consumers render panel
            content based on <code className="oga-prim-code">activeId</code>.
          </p>
        </header>

        <div className="oga-prim-doc">
          <Variant label="Underline · default" caption="The Intelligence sub-tabs pattern (D4 locked). Each tab carries its own line glyph; active tab gets the 2px ink underline + ink text.">
            <Tabs
              aria-label="Intelligence sub-tabs"
              activeId={intelligenceTab}
              onChange={setIntelligenceTab}
              items={[
                { id: "query", label: "Query", icon: <QueryIcon /> },
                { id: "nl", label: "Natural language", icon: <NlIcon /> },
                { id: "peers", label: "Peers", icon: <PeersIcon /> },
                { id: "insights", label: "Insights", icon: <InsightsIcon /> },
                { id: "forecast", label: "Forecast", icon: <ForecastIcon /> },
              ]}
            />
          </Variant>

          <Variant label="Underline · with badges" caption="Settings sections. Icon + label + optional count badge. Active-tab badge inverts (ink bg, white digit) to match the underline emphasis. Key + billing silhouettes mirror the AiqIcon set.">
            <Tabs
              aria-label="Settings sections"
              activeId={settingsTab}
              onChange={setSettingsTab}
              items={[
                { id: "profile", label: "Profile", icon: <ProfileIcon /> },
                { id: "members", label: "Members", icon: <MembersIcon />, badge: 4 },
                { id: "api-keys", label: "API keys", icon: <KeyIcon />, badge: 2 },
                { id: "webhooks", label: "Webhooks", icon: <WebhookIcon />, badge: 7 },
                { id: "billing", label: "Billing", icon: <BillingIcon /> },
              ]}
            />
          </Variant>

          <Variant label="Underline · compact" caption="Monitor sub-views — minimal labels with icons. Same primitive, fewer items.">
            <Tabs
              aria-label="Monitor sub-views"
              activeId={iconTab}
              onChange={setIconTab}
              items={[
                { id: "monitor", label: "Portfolios", icon: <PortfolioIcon /> },
                { id: "changes", label: "Changes feed", icon: <ChangesIcon /> },
                { id: "webhooks", label: "Webhooks", icon: <WebhookIcon /> },
              ]}
            />
          </Variant>

          <Variant label="Underline · with disabled" caption="Portfolio views. Disabled tabs are skipped by arrow-key navigation. Visual: 0.5 opacity, not-allowed cursor.">
            <Tabs
              aria-label="Portfolio views"
              activeId={skipTab}
              onChange={setSkipTab}
              items={[
                { id: "portfolios", label: "Portfolios", icon: <PortfolioIcon /> },
                { id: "cohorts", label: "Cohorts", icon: <CohortsIcon />, disabled: true },
                { id: "bundles", label: "Bundles", icon: <BundlesIcon /> },
                { id: "compare", label: "Compare", icon: <CompareIcon />, disabled: true },
                { id: "exports", label: "Exports", icon: <ExportsIcon /> },
              ]}
            />
          </Variant>

          <Variant label="Pill" caption='variant="pill" — active tab gets a small ink-tinted rounded background. Used for compact filter strips inside cards or panels.'>
            <Tabs
              aria-label="Period filter"
              variant="pill"
              activeId={filterTab}
              onChange={setFilterTab}
              items={[
                { id: "all", label: "All time" },
                { id: "1y", label: "1Y" },
                { id: "6m", label: "6M" },
                { id: "3m", label: "3M" },
                { id: "1m", label: "1M" },
              ]}
            />
          </Variant>

          <Variant label="Pill · with icons" caption="View-mode toggle pattern. Icons replace labels when space is tight — combine with aria-label per tab for screen readers.">
            <Tabs
              aria-label="View mode"
              variant="pill"
              activeId={viewTab}
              onChange={setViewTab}
              items={[
                { id: "list", label: "List", icon: <ListIcon /> },
                { id: "grid", label: "Grid", icon: <GridIcon /> },
                { id: "map", label: "Map", icon: <MapIcon /> },
              ]}
            />
          </Variant>
        </div>
      </div>
    </section>
  );
}

function TabsDarkSection() {
  const [monitorTab, setMonitorTab] = useState("portfolios");
  const [rangeTab, setRangeTab] = useState("1m");

  return (
    <section
      className="oga-section-dark oga-prim-section"
      data-oga-surface="dark"
      aria-labelledby="ar-228-dark-heading"
    >
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-228 · Dark surface variant</p>
          <h2 id="ar-228-dark-heading" className="oga-h2 oga-prim-section__title">
            Tabs on dark
          </h2>
          <p className="oga-prim-section__caption">
            For Monitor / sidebar contexts that sit on the graphite-ink
            surface. Inactive text desaturates to warm-white at 55% opacity;
            the active underline / pill inverts to warm-white so it reads as
            the editorial accent the page expects.
          </p>
        </header>

        <div className="oga-prim-doc oga-prim-doc--dark">
          <Variant label="Underline" caption="Monitor sub-views as they appear on a dark scaffolding page. Warm-white active underline; icons desaturate to 55% white when inactive.">
            <Tabs
              aria-label="Monitor sub-views (dark)"
              activeId={monitorTab}
              onChange={setMonitorTab}
              items={[
                { id: "portfolios", label: "Portfolios", icon: <PortfolioIcon />, badge: 12 },
                { id: "changes", label: "Changes feed", icon: <ChangesIcon />, badge: 3 },
                { id: "webhooks", label: "Webhooks", icon: <WebhookIcon /> },
                { id: "alerts", label: "Alerts", icon: <AlertsIcon /> },
              ]}
            />
          </Variant>

          <Variant label="Pill" caption="Compact range selector inside a dark card. Active pill picks up a translucent warm-white wash.">
            <Tabs
              aria-label="Range (dark)"
              variant="pill"
              activeId={rangeTab}
              onChange={setRangeTab}
              items={[
                { id: "1m", label: "1M" },
                { id: "3m", label: "3M" },
                { id: "6m", label: "6M" },
                { id: "1y", label: "1Y" },
                { id: "all", label: "All" },
              ]}
            />
          </Variant>
        </div>
      </div>
    </section>
  );
}
