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
import { DataTable } from "@/app/design-v2/_shared/dashboard/data-table";
import type { ColumnDef, SortState } from "@/app/design-v2/_shared/dashboard/data-table";
import { Sidebar } from "@/app/design-v2/_shared/dashboard/sidebar";
import type { SidebarSection } from "@/app/design-v2/_shared/dashboard/sidebar";
import { NavIconDark } from "@/app/design-v2/_shared/app-shell";
import { Wordmark } from "@/app/design-v2/_shared/wordmark";
import { SignalsIcon, ScoresIcon, MonitorIcon, IntelligenceIcon } from "@/app/design-v2/_shared/product-icons";
import { EmptyState } from "@/app/design-v2/_shared/dashboard/empty-state";
import { Tooltip } from "@/app/design-v2/_shared/dashboard/tooltip";
import { CodeBlock } from "@/app/design-v2/_shared/dashboard/code-block";
import { StatsCard } from "@/app/design-v2/_shared/dashboard/stats-card";
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
        <DataTableSection />
        <DataTableDarkSection />
        <SidebarShowcaseSection />
        <EmptyStateSection />
        <EmptyStateDarkSection />
        <TooltipSection />
        <TooltipDarkSection />
        <CodeBlockSection />
        <CodeBlockDarkSection />
        <StatsCardSection />
        <StatsCardDarkSection />
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
   Replaces the card-grid (auto-rejected per design-taste).

   wide={true} drops the 480px max-width on the demo cell — used by
   variants that need realistic surface width (e.g. 3-card strips,
   wide tables). */
function Variant({
  label,
  caption,
  children,
  wide,
}: {
  label: string;
  caption: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const demoClass = wide ? "oga-prim-doc__demo oga-prim-doc__demo--wide" : "oga-prim-doc__demo";
  return (
    <div className="oga-prim-doc__row">
      <div className="oga-prim-doc__meta">
        <p className="oga-prim-doc__label">{label}</p>
        <p className="oga-prim-doc__caption">{caption}</p>
      </div>
      <div className={demoClass}>{children}</div>
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

function PresetsIcon() {
  /* Three horizontal sliders with knobs at different positions —
     visual of "tunable weight configuration", which is what a preset
     is (composition of per-dimension weights). */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 3.5h11M1.5 7h11M1.5 10.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="4"  cy="3.5"  r="1.4" fill="currentColor" />
      <circle cx="9"  cy="7"    r="1.4" fill="currentColor" />
      <circle cx="6"  cy="10.5" r="1.4" fill="currentColor" />
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

/* ============================================================
   AR-230 <DataTable>
   ============================================================ */

interface MemberRow {
  id: string;
  email: string;
  role: "Owner" | "Admin" | "Member";
  lastActive: string;
}

const MEMBER_ROWS: MemberRow[] = [
  { id: "u_1", email: "ptengelmann@gmail.com", role: "Owner", lastActive: "2h ago" },
  { id: "u_2", email: "marcos@onegoodarea.co.uk", role: "Admin", lastActive: "1d ago" },
  { id: "u_3", email: "narister@example.com", role: "Member", lastActive: "5d ago" },
  { id: "u_4", email: "analyst@brightstar.dev", role: "Member", lastActive: "Just now" },
  { id: "u_5", email: "ops@acmeunderwriting.com", role: "Admin", lastActive: "3w ago" },
];

interface PortfolioRow {
  id: string;
  name: string;
  areaCount: number;
  lastEnriched: string;
  changes30d: number;
}

const PORTFOLIO_ROWS: PortfolioRow[] = [
  { id: "ptf_1", name: "Acme — High street retail", areaCount: 142, lastEnriched: "2026-06-04", changes30d: 18 },
  { id: "ptf_2", name: "BrightStar — Lender pack", areaCount: 1287, lastEnriched: "2026-06-05", changes30d: 247 },
  { id: "ptf_3", name: "Northern student-let watchlist", areaCount: 56, lastEnriched: "2026-06-01", changes30d: 3 },
  { id: "ptf_4", name: "London commercial — Zone 1-2", areaCount: 89, lastEnriched: "2026-05-29", changes30d: 12 },
  { id: "ptf_5", name: "Edinburgh research cohort", areaCount: 23, lastEnriched: "2026-06-05", changes30d: 1 },
];

interface WebhookRow {
  id: string;
  url: string;
  topic: "report.created" | "score.changed";
  lastDelivery: string;
  status: "ok" | "failing";
}

const WEBHOOK_ROWS: WebhookRow[] = [
  { id: "wh_1", url: "https://hooks.acme.dev/oga", topic: "report.created", lastDelivery: "2m ago", status: "ok" },
  { id: "wh_2", url: "https://api.brightstar.com/ingest/oga", topic: "score.changed", lastDelivery: "8m ago", status: "ok" },
  { id: "wh_3", url: "https://internal.northern.io/wh", topic: "score.changed", lastDelivery: "1h ago", status: "failing" },
];

interface ActivityRow {
  id: string;
  when: string;
  actor: string;
  action: string;
  target: string;
}

const ACTIVITY_ROWS: ActivityRow[] = [
  { id: "ev_1", when: "00:38", actor: "ptengelmann", action: "Created preset", target: "lender-default" },
  { id: "ev_2", when: "00:31", actor: "system", action: "Re-scored 1,283 postcodes", target: "run_2026_06_05" },
  { id: "ev_3", when: "00:14", actor: "marcos", action: "Updated bundle", target: "lender-only" },
  { id: "ev_4", when: "23:58", actor: "ptengelmann", action: "Pinned methodology", target: "v2.0.2" },
  { id: "ev_5", when: "23:42", actor: "ops@acmeunderwriting.com", action: "Added IP to allowlist", target: "192.168.1.42/32" },
  { id: "ev_6", when: "23:11", actor: "system", action: "Delivered webhook", target: "score.changed -> hooks.acme.dev" },
];

function RoleBadge({ role }: { role: MemberRow["role"] }) {
  return <span className="oga-prim-role-badge" data-role={role.toLowerCase()}>{role}</span>;
}

function StatusDot({ status }: { status: WebhookRow["status"] }) {
  return (
    <span className="oga-prim-status-dot" data-status={status}>
      <span className="oga-prim-status-dot__inner" />
      {status === "ok" ? "Delivering" : "Failing"}
    </span>
  );
}

function DataTableSection() {
  const [loading, setLoading] = useState(false);
  const [sortState, setSortState] = useState<SortState>({ key: "lastEnriched", direction: "desc" });

  const memberColumns: ColumnDef<MemberRow>[] = [
    { key: "email", header: "Email", sortable: true, sortAccessor: (r) => r.email, cell: (r) => r.email, width: "minmax(220px, 2fr)" },
    { key: "role", header: "Role", sortable: true, sortAccessor: (r) => r.role, cell: (r) => <RoleBadge role={r.role} />, width: "120px" },
    { key: "lastActive", header: "Last active", align: "end", cell: (r) => r.lastActive, width: "140px" },
  ];

  const portfolioColumns: ColumnDef<PortfolioRow>[] = [
    { key: "name", header: "Portfolio", sortable: true, sortAccessor: (r) => r.name, cell: (r) => r.name, width: "minmax(240px, 2fr)" },
    { key: "areaCount", header: "Areas", align: "end", sortable: true, sortAccessor: (r) => r.areaCount, cell: (r) => r.areaCount.toLocaleString(), width: "110px" },
    { key: "lastEnriched", header: "Last enriched", align: "end", sortable: true, sortAccessor: (r) => r.lastEnriched, cell: (r) => r.lastEnriched, width: "150px", hideBelow: "sm" },
    { key: "changes30d", header: "Changes (30d)", align: "end", sortable: true, sortAccessor: (r) => r.changes30d, cell: (r) => r.changes30d.toLocaleString(), width: "140px", hideBelow: "md" },
  ];

  const webhookColumns: ColumnDef<WebhookRow>[] = [
    { key: "url", header: "Endpoint", cell: (r) => <code className="oga-prim-code">{r.url}</code>, width: "minmax(280px, 2fr)" },
    { key: "topic", header: "Topic", cell: (r) => <code className="oga-prim-code">{r.topic}</code>, width: "180px" },
    { key: "status", header: "Status", cell: (r) => <StatusDot status={r.status} />, width: "140px" },
    { key: "lastDelivery", header: "Last delivery", align: "end", cell: (r) => r.lastDelivery, width: "140px", hideBelow: "sm" },
    {
      key: "actions",
      header: "",
      align: "end",
      width: "60px",
      headerLabel: "Row actions",
      cell: (r) => (
        <DropdownMenu
          trigger={
            <span className="oga-prim-trigger oga-prim-trigger--icon" aria-label={`Actions for ${r.url}`}>
              <MoreIcon />
            </span>
          }
          triggerLabel={`Actions for ${r.url}`}
          triggerClassName="oga-prim-icon-button"
          align="end"
          items={[
            { label: "Resend last event", onClick: () => {} },
            { label: "View delivery log", onClick: () => {} },
            { label: "Reveal signing secret", onClick: () => {} },
            { label: "Disable", danger: true, onClick: () => {} },
          ]}
        />
      ),
    },
  ];

  return (
    <section className="oga-section-quiet oga-prim-section" aria-labelledby="ar-230-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-230 · Foundational</p>
          <h2 id="ar-230-heading" className="oga-h2 oga-prim-section__title">
            DataTable
          </h2>
          <p className="oga-prim-section__caption">
            <strong>One generic primitive.</strong> Every row below is the
            same <code className="oga-prim-code">&lt;DataTable&gt;</code> component
            rendering different shapes of data with different features
            turned on — sortable columns, loading skeletons, empty + error
            states, responsive column hiding, row actions, compact density.
            The data examples (members, portfolios, webhooks, activity)
            are realistic samples of what the real Phase 1–5 dashboard
            pages will feed into it.
          </p>
        </header>

        <div className="oga-prim-doc">
          <Variant label="Default rendering" caption="No special config — just columns + rows. Demonstrates the editorial baseline: sticky mono-caps header, hairline row separators, soft-warm hover. Data shown: an org members list (5 rows).">
            <DataTable
              columns={memberColumns}
              rows={MEMBER_ROWS}
              rowKey={(r) => r.id}
              caption="Organisation members"
            />
          </Variant>

          <Variant label="Sortable columns" caption='Headers with sortable: true become clickable buttons. Click to sort ascending; click again to flip to descending. The chevron next to the label indicates current sort state. Data: portfolios list — sort by Portfolio name, Areas count, Last enriched date, or Changes (30d). Two columns are flagged hideBelow="sm" and hideBelow="md" — resize the window to see them drop out at narrow widths.'>
            <DataTable
              columns={portfolioColumns}
              rows={PORTFOLIO_ROWS}
              rowKey={(r) => r.id}
              caption="Portfolios"
              sortState={sortState}
              onSortChange={setSortState}
            />
          </Variant>

          <Variant label="Row actions column" caption="Action menus are just a regular column with align=&quot;end&quot; and a DropdownMenu in the cell. Clicking the action trigger does NOT fire row click (interactive-child guard built into the primitive). Click any cell in the row body — the row click logs to the dev console; click the ⋯ — only the dropdown opens. Data: webhook subscriptions with status dots + dropdown of per-row actions.">
            <DataTable
              columns={webhookColumns}
              rows={WEBHOOK_ROWS}
              rowKey={(r) => r.id}
              caption="Webhook subscriptions"
              onRowClick={(r) => {
                console.log("Row clicked", r.url);
              }}
            />
          </Variant>

          <Variant label="Loading state" caption="isLoading={true} replaces the body with shimmering skeleton rows of the right shape. Click the toggle to see the transition. Useful while a fetch is in flight — the layout stays put, so content swap doesn't jump.">
            <div className="oga-prim-form-stack">
              <button
                type="button"
                className="oga-btn oga-btn-secondary"
                onClick={() => setLoading((v) => !v)}
              >
                {loading ? "Stop loading" : "Show loading"}
              </button>
              <DataTable
                columns={memberColumns}
                rows={loading ? [] : MEMBER_ROWS.slice(0, 3)}
                rowKey={(r) => r.id}
                isLoading={loading}
                caption="Members (loading demo)"
                loadingRowCount={3}
              />
            </div>
          </Variant>

          <Variant label="Empty state (custom)" caption='When rows is [] and no error, the primitive renders the emptyState prop. Consumer can pass any ReactNode — here, a titled message with an "Invite member" CTA. If you omit emptyState entirely, a small generic placeholder shows ("No results").'>
            <DataTable
              columns={memberColumns}
              rows={[]}
              rowKey={(r) => r.id}
              caption="Members (empty)"
              emptyState={
                <div className="oga-prim-empty-state">
                  <p className="oga-prim-empty-state__title">No members yet</p>
                  <p className="oga-prim-empty-state__body">Invite a teammate to start collaborating in this organisation.</p>
                  <button type="button" className="oga-btn oga-btn-secondary">Invite member</button>
                </div>
              }
            />
          </Variant>

          <Variant label="Error state" caption='When error is a non-null string, the body is replaced by an inline red message with role="alert" (screen readers announce it). The header stays so the user keeps context. Example: a 403 admin_required surfaced as an inline error rather than a generic toast.'>
            <DataTable
              columns={memberColumns}
              rows={[]}
              rowKey={(r) => r.id}
              caption="Members (error)"
              error="403 admin_required — your role is Member, but only admins can list other members."
            />
          </Variant>

          <Variant label='Compact density' caption='density="compact" tightens row + cell padding for high-count tables — activity feeds, ranked-area results, anything paginated with 50+ rows per page. Editorial header treatment stays; just less vertical breathing room per row. Data: recent activity events with mono-formatted timestamps + targets.'>
            <DataTable
              columns={[
                { key: "when", header: "When", cell: (r) => <code className="oga-prim-code">{r.when}</code>, width: "80px" },
                { key: "actor", header: "Actor", cell: (r) => r.actor, width: "minmax(180px, 1fr)" },
                { key: "action", header: "Action", cell: (r) => r.action, width: "minmax(200px, 1.5fr)" },
                { key: "target", header: "Target", cell: (r) => <code className="oga-prim-code">{r.target}</code>, width: "minmax(220px, 2fr)", hideBelow: "sm" },
              ]}
              rows={ACTIVITY_ROWS}
              rowKey={(r) => r.id}
              caption="Recent activity"
              density="compact"
            />
          </Variant>
        </div>
      </div>
    </section>
  );
}

function DataTableDarkSection() {
  const memberColumns: ColumnDef<MemberRow>[] = [
    { key: "email", header: "Email", sortable: true, sortAccessor: (r) => r.email, cell: (r) => r.email, width: "minmax(220px, 2fr)" },
    { key: "role", header: "Role", sortable: true, sortAccessor: (r) => r.role, cell: (r) => <RoleBadge role={r.role} />, width: "120px" },
    { key: "lastActive", header: "Last active", align: "end", cell: (r) => r.lastActive, width: "140px" },
  ];

  return (
    <section
      className="oga-section-dark oga-prim-section"
      data-oga-surface="dark"
      aria-labelledby="ar-230-dark-heading"
    >
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-230 · Dark surface variant</p>
          <h2 id="ar-230-dark-heading" className="oga-h2 oga-prim-section__title">
            DataTable on dark
          </h2>
          <p className="oga-prim-section__caption">
            Same primitive, same API. When the table sits on a dark
            scaffolding page (Monitor sub-views, the sidebar org list,
            tables inside a dark-variant modal), it inverts to
            graphite-ink with warm-white text, the corner specimen
            ticks lift to warm-white, hover picks up a translucent
            wash. Two examples below.
          </p>
        </header>

        <div className="oga-prim-doc oga-prim-doc--dark">
          <Variant label="Default rendering on dark" caption="Same members data as the light section's first variant, on dark scaffolding. Sortable headers + role badges read at the inverted altitude. defaultSort is set so the table opens already sorted by Role.">
            <DataTable
              columns={memberColumns}
              rows={MEMBER_ROWS}
              rowKey={(r) => r.id}
              caption="Organisation members (dark)"
              defaultSort={{ key: "role", direction: "asc" }}
            />
          </Variant>

          <Variant label="Compact density on dark" caption="Same activity feed pattern from the light section, dark. The compact density + tabular-num timestamps are the canonical shape the Activity page will use when it ships in Phase 5.">
            <DataTable
              columns={[
                { key: "when", header: "When", cell: (r) => <code className="oga-prim-code">{r.when}</code>, width: "80px" },
                { key: "actor", header: "Actor", cell: (r) => r.actor, width: "minmax(180px, 1fr)" },
                { key: "action", header: "Action", cell: (r) => r.action, width: "minmax(200px, 1.5fr)" },
                { key: "target", header: "Target", cell: (r) => <code className="oga-prim-code">{r.target}</code>, width: "minmax(220px, 2fr)", hideBelow: "sm" },
              ]}
              rows={ACTIVITY_ROWS}
              rowKey={(r) => r.id}
              caption="Recent activity (dark)"
              density="compact"
            />
          </Variant>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   AR-233 <Sidebar>
   ============================================================
   The Sidebar is normally 100vh sticky-positioned on the left
   of the page. To preview it inline within the doc rows, each
   variant lives inside .oga-prim-sidebar-frame — a fixed-height
   container that anchors the sidebar's positioning so the
   visual reads without busting the layout.

   ICONS: This showcase uses the canonical sets only — NavIconDark
   for sidebar nav items (the exact same glyphs AppShell uses today)
   and the bespoke product icons (SignalsIcon, ScoresIcon, MonitorIcon,
   IntelligenceIcon) for the Phase 1 Products group. Wordmark uses
   the real <Wordmark> primitive. No invented inline glyphs here. */

function SidebarShowcaseSection() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* Icon picks here use the Tabs-bespoke glyphs (KeyIcon, BillingIcon,
     CompareIcon, WebhookIcon — defined above for AR-228) wherever the
     same concept appears in the Sidebar showcase. Keeps the four
     "Settings / Billing / Compare / Webhooks" concepts visually
     consistent across primitive showcases. NavIconDark stays for
     dash + map + api (concepts the bespoke set doesn't have). The
     two vocabularies will get canonicalized into a single
     `_shared/dashboard/dashboard-nav-icons.tsx` set in a follow-up. */
  const defaultSections: SidebarSection[] = [
    {
      label: "Main",
      items: [
        { label: "Dashboard", href: "#", icon: <NavIconDark name="dash" />, active: true },
        { label: "New report", href: "#", icon: <NavIconDark name="map" /> },
        { label: "Compare", href: "#", icon: <CompareIcon /> },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "API + usage", href: "#", icon: <NavIconDark name="api" /> },
        { label: "Billing", href: "#", icon: <BillingIcon /> },
        { label: "Settings", href: "#", icon: <KeyIcon /> },
      ],
    },
  ];

  const phase1Sections: SidebarSection[] = [
    {
      label: "Dashboard",
      items: [{ label: "Home", href: "#", icon: <NavIconDark name="dash" />, active: true }],
    },
    {
      label: "Products",
      items: [
        { label: "Signals",      href: "#", icon: <SignalsIcon width={16} height={16} /> },
        { label: "Scores",       href: "#", icon: <ScoresIcon width={16} height={16} />,       badge: "NEW" },
        { label: "Monitor",      href: "#", icon: <MonitorIcon width={16} height={16} />,      badge: 12 },
        { label: "Intelligence", href: "#", icon: <IntelligenceIcon width={16} height={16} /> },
      ],
    },
    {
      label: "Org & Levers",
      items: [
        {
          label: "Settings",
          href: "#",
          icon: <KeyIcon />,
          children: [
            { label: "Members", href: "#", icon: <MembersIcon /> },
            { label: "Bundles", href: "#", icon: <BundlesIcon /> },
            { label: "Presets", href: "#", icon: <PresetsIcon /> },
            { label: "Cohorts", href: "#", icon: <CohortsIcon /> },
          ],
        },
        { label: "Webhooks", href: "#", icon: <WebhookIcon />, badge: 3 },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "Billing",     href: "#", icon: <BillingIcon /> },
        { label: "API + usage", href: "#", icon: <NavIconDark name="api" /> },
      ],
    },
  ];

  return (
    <section className="oga-section-quiet oga-prim-section" aria-labelledby="ar-233-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-233 · Foundational</p>
          <h2 id="ar-233-heading" className="oga-h2 oga-prim-section__title">
            Sidebar
          </h2>
          <p className="oga-prim-section__caption">
            The dashboard&apos;s left-column nav, extracted from <code className="oga-prim-code">AppShell</code> into
            a reusable primitive. Dark surface, sections + items with active
            state, optional badges + nested children (depth 2), top + bottom
            slots that consumers compose (wordmark + close, theme toggle + user
            chip — or, after Phase 1, the org switcher). Mobile drawer
            behaviour (Escape + body scroll lock + translucent backdrop) is
            owned by the primitive. This ticket is a pure extraction — the
            <code className="oga-prim-code">/dashboard</code> sidebar content
            stays the same (Main + Account); Phase 1 AR-217-B1 will swap in
            the 4-section sitemap shown in the second variant below.
          </p>
        </header>

        <div className="oga-prim-doc">
          <Variant label="Current AppShell structure" caption="What every authenticated page renders today (Dashboard / New report / Compare under Main; API+usage / Billing / Settings under Account). The Dashboard item shows the active state. Top slot holds a wordmark; bottom slot holds a placeholder for the existing theme toggle + user chip.">
            <div className="oga-prim-sidebar-frame">
              <Sidebar
                sections={defaultSections}
                top={<Wordmark size={14} tone="dark" />}
                bottom={
                  <span className="oga-prim-sidebar-userchip">
                    <span className="oga-prim-sidebar-userchip__avatar">P</span>
                    <span>ptengelmann</span>
                  </span>
                }
              />
            </div>
          </Variant>

          <Variant label="Phase 1 preview — 4 sections + nesting + badges" caption='What AR-217-B1 will plug in: 4 grouped sections (Dashboard / Products / Org &amp; Levers / Account) with badge counts ("NEW", queue depth) and a nested Settings sub-tree under Org &amp; Levers. Demonstrates the primitive&apos;s nested-children + badge slots in one shot. Not the structure that ships today — preview of the next ticket.'>
            <div className="oga-prim-sidebar-frame oga-prim-sidebar-frame--tall">
              <Sidebar
                sections={phase1Sections}
                top={<Wordmark size={14} tone="dark" />}
                bottom={
                  <span className="oga-prim-sidebar-userchip">
                    <span className="oga-prim-sidebar-userchip__avatar">P</span>
                    <span>ptengelmann</span>
                  </span>
                }
              />
            </div>
          </Variant>

          <Variant label="Mobile drawer behaviour" caption="On <880px the sidebar lifts off the page into a fixed drawer that slides in from the left with a translucent backdrop. Click the button to open. Escape, backdrop click, or clicking any nav link dismisses it. Body scroll locks while open.">
            <div className="oga-prim-form-stack">
              <button
                type="button"
                className="oga-btn oga-btn-secondary"
                onClick={() => setDrawerOpen(true)}
              >
                Open mobile drawer
              </button>
              <Sidebar
                sections={defaultSections}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                top={
                  <>
                    <Wordmark size={14} tone="dark" />
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      aria-label="Close navigation"
                      className="oga-prim-sidebar-close"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </>
                }
              />
            </div>
          </Variant>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   AR-238 <EmptyState>
   ============================================================
   ICONS: uses the canonical bespoke set defined above (MembersIcon,
   PortfolioIcon, WebhookIcon, BundlesIcon, AlertsIcon, ChangesIcon) —
   same icons the Tabs + Sidebar showcases use. No invented inline
   glyphs here. [[feedback-icons-and-canonical-assets]] */

function EmptyStateSection() {
  return (
    <section className="oga-section-quiet oga-prim-section" aria-labelledby="ar-238-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-238 · Foundational</p>
          <h2 id="ar-238-heading" className="oga-h2 oga-prim-section__title">
            EmptyState
          </h2>
          <p className="oga-prim-section__caption">
            The first surface in every list page when there&apos;s nothing
            to show yet. Consumes a bespoke icon (from the canonical
            sets — NavIconDark / product-icons / the Tabs-set glyphs),
            a mono-caps title, a supporting line, and one or two CTAs.
            Composes inside <code className="oga-prim-code">&lt;DataTable emptyState=&#123;...&#125;&gt;</code> AND
            standalone on a page. Brand v3 vocabulary: warm-white
            gradient + edge-lit material recipe matching <code className="oga-prim-code">.oga-code-panel</code>.
          </p>
        </header>

        <div className="oga-prim-doc">
          <Variant label="Standalone — single primary action" caption='What every Levers list page (members / bundles / presets / cohorts) shows on first visit. Members icon from the canonical bespoke set.'>
            <EmptyState
              icon={<MembersIcon />}
              title="No members yet"
              body="Invite a teammate to start collaborating in this organisation."
              action={{ label: "Invite member", href: "#" }}
            />
          </Variant>

          <Variant label="With secondary action" caption="Portfolios list — primary CTA creates the first portfolio, secondary CTA links to the docs.">
            <EmptyState
              icon={<PortfolioIcon />}
              title="No portfolios yet"
              body="Add a portfolio to start tracking signal changes across your areas. We&rsquo;ll alert you when something material moves."
              action={{ label: "Create portfolio", href: "#" }}
              secondaryAction={{ label: "Read the docs", href: "#" }}
            />
          </Variant>

          <Variant label="No action — informational" caption="Activity feed when there&apos;s no activity yet. No CTA — just acknowledge the state.">
            <EmptyState
              icon={<AlertsIcon />}
              title="No activity yet"
              body="When something changes — a member is added, a preset saved, a webhook delivered — it&rsquo;ll show up here."
            />
          </Variant>

          <Variant label="No icon — restrained" caption='Minimal variant used inside <DataTable emptyState> when the table itself already has a header providing context.'>
            <EmptyState
              title="No webhook deliveries this month"
              body="Once a webhook fires, the delivery log shows up here with the response code, headers, and payload."
              action={{ label: "Create webhook", href: "#" }}
            />
          </Variant>

          <Variant label="Composed inside <DataTable>" caption="The EmptyState passed as emptyState prop. Same primitive, sized to fit the table body.">
            <DataTable
              columns={[
                { key: "name", header: "Name", cell: (r: { name: string }) => r.name, width: "minmax(180px, 1fr)" },
                { key: "role", header: "Role", cell: () => "—", width: "120px" },
                { key: "last", header: "Last active", cell: () => "—", width: "140px", align: "end" },
              ]}
              rows={[]}
              rowKey={(r) => r.name}
              caption="Members (empty)"
              emptyState={
                <EmptyState
                  icon={<MembersIcon />}
                  title="No members yet"
                  body="Invite a teammate to start collaborating in this organisation."
                  action={{ label: "Invite member", href: "#" }}
                />
              }
            />
          </Variant>
        </div>
      </div>
    </section>
  );
}

function EmptyStateDarkSection() {
  return (
    <section
      className="oga-section-dark oga-prim-section"
      data-oga-surface="dark"
      aria-labelledby="ar-238-dark-heading"
    >
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-238 · Dark surface variant</p>
          <h2 id="ar-238-dark-heading" className="oga-h2 oga-prim-section__title">
            EmptyState on dark
          </h2>
          <p className="oga-prim-section__caption">
            Same primitive on a dark scaffolding page (Monitor sub-views,
            sidebar org list, dark-modal embedded lists). Surface inverts
            to graphite gradient + dot-field motif anchored at top-right
            — same vocabulary as <code className="oga-prim-code">.oga-data-table</code> dark
            and <code className="oga-prim-code">.oga-sidebar</code>.
          </p>
        </header>

        <div className="oga-prim-doc oga-prim-doc--dark">
          <Variant label="Default — Monitor changes feed (empty)" caption="No portfolio changes detected in the selected period.">
            <EmptyState
              icon={<ChangesIcon />}
              title="No changes in this period"
              body="Signal changes across this portfolio&rsquo;s areas will appear here as they&rsquo;re detected by the monthly cron."
              action={{ label: "Adjust filters", href: "#" }}
            />
          </Variant>

          <Variant label="With secondary action — Bundles (empty)" caption="On a dark scaffolding page. Primary creates the first bundle; secondary links to docs.">
            <EmptyState
              icon={<BundlesIcon />}
              title="No custom bundles yet"
              body="Bundles let your org subscribe to a specific subset of signals on /v1/area, /v1/areas, and /v1/query."
              action={{ label: "Create bundle", href: "#" }}
              secondaryAction={{ label: "Read about bundles", href: "#" }}
            />
          </Variant>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   AR-239 <Tooltip>
   ============================================================ */

function InfoGlyph() {
  /* Small inline info circle — i in a ring. Used as the canonical
     "hover for explanation" affordance on disabled buttons + signal
     labels. Inline 14x14, currentColor so it inherits the trigger's
     color. */
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="7" cy="4.3" r="0.7" fill="currentColor" />
      <path d="M7 6.5v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function TooltipSection() {
  return (
    <section className="oga-section-quiet oga-prim-section" aria-labelledby="ar-239-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-239 · Foundational</p>
          <h2 id="ar-239-heading" className="oga-h2 oga-prim-section__title">
            Tooltip
          </h2>
          <p className="oga-prim-section__caption">
            Short non-blocking explanations for hover + focus surfaces:
            RBAC reason on a disabled button, signal descriptions,
            last-owner-guard rationale, status hovers (&ldquo;Failing -
            last 3 deliveries returned 5xx&rdquo;). Wrapper API —
            <code className="oga-prim-code">&lt;Tooltip content=&quot;...&quot;&gt;&#123;trigger&#125;&lt;/Tooltip&gt;</code>.
            Opens on hover (with a 250ms default delay) or focus
            (immediate). Dismisses on blur, mouse-leave, or Escape.
            <code className="oga-prim-code">role=&quot;tooltip&quot;</code> on the panel,
            <code className="oga-prim-code">aria-describedby</code> wired on the trigger.
            Auto-flips top &harr; bottom when near viewport edges.
          </p>
        </header>

        <div className="oga-prim-doc">
          <Variant label="Default" caption="Hover the trigger (250ms delay) or tab to it (instant). Mono label, flat ink solid, 6px arrow pointing at the trigger.">
            <Tooltip content="Owner-only. Pinned to engine v2.0.2.">
              <button type="button" className="oga-btn oga-btn-secondary">
                Methodology pin
              </button>
            </Tooltip>
          </Variant>

          <Variant label="With info glyph trigger" caption="The canonical &ldquo;hover for context&rdquo; pattern next to a label. Inline info circle is the visual cue, the explanation is the tooltip.">
            <span className="oga-prim-tooltip-label-row">
              <span className="oga-prim-tooltip-eyebrow">Normalized value</span>
              <Tooltip content="Within-country percentile (0–1).">
                <span className="oga-prim-tooltip-info-wrap">
                  <InfoGlyph />
                </span>
              </Tooltip>
            </span>
          </Variant>

          <Variant label="On a disabled button (RBAC reason)" caption="The 403 admin_required + last-owner-guard explanation. Without the tooltip, users see a disabled button with no context.">
            <Tooltip content="Last-owner guard. Promote someone first.">
              <button type="button" className="oga-btn oga-btn-secondary" disabled>
                Remove member
              </button>
            </Tooltip>
          </Variant>

          <Variant label="Custom delay (0ms — instant)" caption='For statuses where any hover-to-explain delay feels broken. Set delay={0} to show immediately on mouse-enter.'>
            <Tooltip content="02:42 BST · 200 OK · 142ms" delay={0}>
              <span className="oga-prim-status-dot oga-prim-tooltip-cursor-default" data-status="ok">
                <span className="oga-prim-status-dot__inner" />
                Delivering
              </span>
            </Tooltip>
          </Variant>

          <Variant label="Bottom placement" caption="Pass placement=&quot;bottom&quot; for triggers near the top of the viewport. The tooltip flips to top automatically if it would overflow the bottom edge.">
            <Tooltip content="Reveal-once. Cannot show again." placement="bottom">
              <button type="button" className="oga-btn oga-btn-secondary">
                Reveal signing secret
              </button>
            </Tooltip>
          </Variant>

          <Variant label="Wraps text inline" caption="Tooltips can wrap any inline content — words inside a sentence, an icon, a badge. The trigger wrapper is inline-flex so layout doesn&apos;t reflow.">
            <span className="oga-prim-tooltip-sentence">
              Your{" "}
              <Tooltip content="Total /v1/* calls this calendar month.">
                <span className="oga-prim-tooltip-underline">monthly usage</span>
              </Tooltip>
              {" "}is 12,847 of 50,000 included calls.
            </span>
          </Variant>
        </div>
      </div>
    </section>
  );
}

function TooltipDarkSection() {
  return (
    <section
      className="oga-section-dark oga-prim-section"
      data-oga-surface="dark"
      aria-labelledby="ar-239-dark-heading"
    >
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-239 · Light variant on dark</p>
          <h2 id="ar-239-dark-heading" className="oga-h2 oga-prim-section__title">
            Tooltip on dark
          </h2>
          <p className="oga-prim-section__caption">
            On dark scaffolding pages (Monitor sub-views, sidebar org
            list, dark-modal embedded contexts) the dark-panel tooltip
            would blend into the surface. Pass <code className="oga-prim-code">surface=&quot;light&quot;</code> to
            invert the panel to warm-white — same material recipe as
            <code className="oga-prim-code">.oga-code-panel</code> + DataTable light.
          </p>
        </header>

        <div className="oga-prim-doc oga-prim-doc--dark">
          <Variant label="Light panel on dark surface" caption="The standard hover-for-explanation pattern in a dark Monitor sub-view.">
            <Tooltip content="Fires when signal moves more than this %." surface="light">
              <span className="oga-prim-tooltip-label-row oga-prim-tooltip-label-row--dark">
                <span className="oga-prim-tooltip-eyebrow oga-prim-tooltip-eyebrow--dark">Change threshold</span>
                <InfoGlyph />
              </span>
            </Tooltip>
          </Variant>

          <Variant label="On a disabled action in a dark surface" caption="Same RBAC explanation, rendering on a dark Monitor page.">
            <Tooltip content="Admin role required. You are: Member." surface="light">
              <button type="button" className="oga-btn oga-btn-secondary" disabled>
                Delete portfolio
              </button>
            </Tooltip>
          </Variant>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   AR-240 <CodeBlock>
   ============================================================
   "Show the curl" pattern — the signature affordance across every
   product playground + the public /playground + Webhooks reveal. */

const SHOWCASE_CURL = `curl -H "Authorization: Bearer oga_..." \\
  "https://api.onegoodarea.com/v1/area?postcode=M1+1AE"`;

const SHOWCASE_JSON = `// 200 OK
{
  "geo_code": "E01005132",
  "engine_version": "2.0.2",
  "signals": {
    "deprivation.imd_decile": {
      "value": 2,
      "normalized_value": 0.78,
      "percentile": 0.92,
      "confidence": 1.0
    }
  }
}`;

const SHOWCASE_TS = `import { OneGoodArea } from "@onegoodarea/sdk";

const client = new OneGoodArea({ apiKey: process.env.OGA_KEY });

const area = await client.areas.get({
  postcode: "M1 1AE",
  bundle: "lender-default"
});

return area.signals;`;

function CodeBlockSection() {
  return (
    <section className="oga-section-quiet oga-prim-section" aria-labelledby="ar-240-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-240 · Foundational</p>
          <h2 id="ar-240-heading" className="oga-h2 oga-prim-section__title">
            CodeBlock
          </h2>
          <p className="oga-prim-section__caption">
            The &ldquo;Show the curl&rdquo; pattern — Stripe + Linear convention
            named explicitly in the dashboard proposal. Full-width monospace
            block + line numbers + copy-to-clipboard + optional mono-caps
            header strip. Three minimal grammars (<code className="oga-prim-code">bash</code>,
            <code className="oga-prim-code">json</code>, <code className="oga-prim-code">typescript</code>) reuse the canonical
            <code className="oga-prim-code">.oga-code-panel__</code>* token classes —
            single source of truth for syntax colour across the marketing +
            dashboard surfaces.
          </p>
        </header>

        <div className="oga-prim-doc">
          <Variant label="bash + header — REQUEST · GET /v1/area" caption="The signature curl on every product playground. Header strip in mono caps; copy button top-right.">
            <CodeBlock
              code={SHOWCASE_CURL}
              language="bash"
              header="REQUEST · GET /v1/area"
            />
          </Variant>

          <Variant label="json + header — RESPONSE" caption="The /v1/area response body. Keys, strings, numbers, booleans all token-coloured via the canonical .oga-code-panel__ vocabulary.">
            <CodeBlock
              code={SHOWCASE_JSON}
              language="json"
              header="RESPONSE · 200 OK"
            />
          </Variant>

          <Variant label="typescript — SDK example" caption="The SDK alternative to raw curl. Keywords (const / import / await) highlighted as keys; strings as strings; function calls as fn.">
            <CodeBlock
              code={SHOWCASE_TS}
              language="typescript"
              header="@onegoodarea/sdk · TypeScript"
            />
          </Variant>

          <Variant label="No copy button" caption='copyable={false} hides the copy affordance — for embedded snippets inside larger doc surfaces.'>
            <CodeBlock
              code={`echo "RESEND_API_KEY=..."  >> .env.local
npm run dev`}
              language="bash"
              copyable={false}
            />
          </Variant>

          <Variant label="No header" caption="Header is optional — for minimal inline snippets.">
            <CodeBlock
              code={`POSTCODE=M1 1AE
curl -H "X-Engine-Version: 2.0.2" \\
  "https://api.onegoodarea.com/v1/area?postcode=$POSTCODE"`}
              language="bash"
            />
          </Variant>

          <Variant label="HTTP verb canonical colours" caption="Each verb gets the canonical .oga-verb--{verb} colour from styles/brand/components.css — green for GET, amber for POST, yellow for PUT, red for DELETE. Same vocabulary as the /docs/api-reference Surface Map.">
            <CodeBlock
              code={`# Read one area
curl -X GET "https://api.onegoodarea.com/v1/area?postcode=M1+1AE"

# Score with a custom preset
curl -X POST "https://api.onegoodarea.com/v1/score" -d '{"preset_id":"..."}'

# Update an org bundle
curl -X PUT "https://api.onegoodarea.com/v1/orgs/org_.../bundles/bnd_..." -d '{...}'

# Remove a member
curl -X DELETE "https://api.onegoodarea.com/v1/orgs/org_.../members/usr_..."`}
              language="bash"
              header="HTTP VERBS · Canonical colour map"
            />
          </Variant>
        </div>
      </div>
    </section>
  );
}

function CodeBlockDarkSection() {
  return (
    <section
      className="oga-section-dark oga-prim-section"
      data-oga-surface="dark"
      aria-labelledby="ar-240-dark-heading"
    >
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-240 · Dark surface variant</p>
          <h2 id="ar-240-dark-heading" className="oga-h2 oga-prim-section__title">
            CodeBlock on dark
          </h2>
          <p className="oga-prim-section__caption">
            Same primitive on a dark scaffolding page (Monitor sub-views,
            sidebar embedded snippets, dark-modal &ldquo;Show the curl&rdquo;
            panels). Graphite gradient + dot-field motif anchored at
            top-right — matches Sidebar + DataTable dark + EmptyState dark.
          </p>
        </header>

        <div className="oga-prim-doc oga-prim-doc--dark">
          <Variant label="bash + header on dark" caption="The same REQUEST showcase as the light variant, on dark scaffolding.">
            <CodeBlock
              code={SHOWCASE_CURL}
              language="bash"
              header="REQUEST · GET /v1/area"
              surface="dark"
            />
          </Variant>

          <Variant label="json — webhook payload" caption='The webhook reveal-once flow renders the signing secret payload as a CodeBlock on dark — "copy this once; we won&rsquo;t show it again".'>
            <CodeBlock
              code={`{
  "event": "signal.changed",
  "portfolio_id": "ptf_01HE...",
  "geo_code": "E01005132",
  "signal_key": "property.median_price",
  "previous_value": 197000,
  "current_value": 214000,
  "change_pct": 8.6
}`}
              language="json"
              header="EVENT · signal.changed"
              surface="dark"
            />
          </Variant>

          <Variant label="HTTP verbs on dark — auto-brighten" caption="The canonical .oga-verb--{verb} colours auto-brighten on data-oga-surface=&quot;dark&quot; (set by the primitive itself when surface=&quot;dark&quot;). GET reads brighter green, POST brighter amber, etc. — same lift as the api-reference Surface Map on its dark sections.">
            <CodeBlock
              code={`# Read
curl -X GET    "https://api.onegoodarea.com/v1/area"
curl -X POST   "https://api.onegoodarea.com/v1/score"
curl -X PUT    "https://api.onegoodarea.com/v1/orgs/.../bundles/..."
curl -X DELETE "https://api.onegoodarea.com/v1/orgs/.../members/..."`}
              language="bash"
              header="HTTP VERBS · Canonical colour map (dark)"
              surface="dark"
            />
          </Variant>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   AR-241 <StatsCard>
   ============================================================ */

function StatsCardSection() {
  return (
    <section className="oga-section-quiet oga-prim-section" aria-labelledby="ar-241-heading">
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-241 · Foundational</p>
          <h2 id="ar-241-heading" className="oga-h2 oga-prim-section__title">
            StatsCard
          </h2>
          <p className="oga-prim-section__caption">
            The metric tile that composes the <code className="oga-prim-code">/dashboard</code> Home
            top strip — plan badge + quota bar + adaptive Upgrade CTA, reading
            from <code className="oga-prim-code">/v1/me</code>. Generalises the
            existing <code className="oga-prim-code">StatCell</code> from AppShell with progress bar,
            trend delta, action slot, dark variant, tabular-nums. Composes in
            CSS Grid rows — the variant labelled &ldquo;3-card top strip&rdquo; below
            shows the canonical Phase 1 layout.
          </p>
        </header>

        <div className="oga-prim-doc">
          <Variant label="Minimal — label + value" caption="The simplest configuration. Same shape as the existing StatCell.">
            <StatsCard label="Plan" value="Starter" />
          </Variant>

          <Variant label="With hint" caption='Supporting context below the value. Mono caps at 0.14em letter-spacing.'>
            <StatsCard
              label="API calls this month"
              value="12,847"
              hint="of 50,000 included"
            />
          </Variant>

          <Variant label="With trend delta" caption="Inline delta indicator. Up = green, down = red, neutral = muted. Glyph + value in mono.">
            <StatsCard
              label="Webhook deliveries"
              value="247"
              delta={{ value: "+8.6%", trend: "up" }}
              hint="vs. last month"
            />
          </Variant>

          <Variant label="With quota progress bar" caption="Hairline track + ink-filled segment. Percentage computed from current/max; capped at 100%.">
            <StatsCard
              label="API calls this month"
              value="12,847"
              progress={{ current: 12847, max: 50000 }}
              hint="of 50,000 included"
            />
          </Variant>

          <Variant label="With Upgrade action" caption="Inline action — renders as a Link if href is provided, button if only onClick. Arrow translates on hover.">
            <StatsCard
              label="Plan"
              value="Starter"
              hint="£49 / month"
              action={{ label: "Upgrade", href: "#" }}
            />
          </Variant>

          <Variant label="Everything composed — the canonical Home top strip tile" caption="Label + value + delta + progress + hint + action all in one card. This is the shape AR-217-B5 (Home redesign) will render per /v1/me.">
            <StatsCard
              label="API calls this month"
              value="42,318"
              delta={{ value: "+12%", trend: "up" }}
              progress={{ current: 42318, max: 50000 }}
              hint="of 50,000 included · resets 1 Jul"
              action={{ label: "Upgrade", href: "#" }}
            />
          </Variant>

          <Variant label="Moderate accent — nearing quota" caption='accent="moderate" tints the dot + value amber. Use when a metric needs gentle attention (80%+ quota used, billing warning, etc.).'>
            <StatsCard
              label="MCP calls this month"
              value="487"
              progress={{ current: 487, max: 500 }}
              hint="of 500 included · MCP add-on"
              accent="moderate"
              delta={{ value: "+34%", trend: "up" }}
            />
          </Variant>

          <Variant label="Weak accent — over quota / failing" caption='accent="weak" tints red. For overage, repeated failures, expired secrets.'>
            <StatsCard
              label="Webhook failures (24h)"
              value="12"
              delta={{ value: "+9", trend: "up" }}
              hint="3 endpoints affected"
              accent="weak"
              action={{ label: "Investigate", href: "#" }}
            />
          </Variant>

          <Variant label="3-card top strip — Phase 1 layout" caption="The canonical CSS Grid row pattern. Three cards in a row, each composing different optional slots. This is what /dashboard Home will render." wide>
            <div className="oga-prim-stats-strip">
              <StatsCard
                label="Plan"
                value="Starter"
                hint="£49 / month"
                action={{ label: "Upgrade", href: "#" }}
              />
              <StatsCard
                label="API calls this month"
                value="12,847"
                delta={{ value: "+8%", trend: "up" }}
                progress={{ current: 12847, max: 50000 }}
                hint="of 50,000 included"
              />
              <StatsCard
                label="Webhook deliveries"
                value="247"
                delta={{ value: "+2.1%", trend: "up" }}
                hint="98.4% success rate"
              />
            </div>
          </Variant>
        </div>
      </div>
    </section>
  );
}

function StatsCardDarkSection() {
  return (
    <section
      className="oga-section-dark oga-prim-section"
      data-oga-surface="dark"
      aria-labelledby="ar-241-dark-heading"
    >
      <div className="oga-prim-section__inner">
        <header className="oga-prim-section__header">
          <p className="oga-eyebrow">AR-241 · Dark surface variant</p>
          <h2 id="ar-241-dark-heading" className="oga-h2 oga-prim-section__title">
            StatsCard on dark
          </h2>
          <p className="oga-prim-section__caption">
            Same primitive on a dark scaffolding page (Monitor overview,
            sidebar embedded summary, dark-modal stats summary). Graphite
            gradient + dot-field motif anchored at top-right — same vocabulary
            as DataTable + Sidebar + EmptyState + CodeBlock dark.
          </p>
        </header>

        <div className="oga-prim-doc oga-prim-doc--dark">
          <Variant label="3-card top strip on dark" caption="Same layout as the light variant, on dark scaffolding. Progress bar fill inverts to warm-white; accent colours lift slightly for dark legibility." wide>
            <div className="oga-prim-stats-strip">
              <StatsCard
                label="Plan"
                value="Scale"
                hint="£499 / month"
                surface="dark"
              />
              <StatsCard
                label="API calls this month"
                value="241,892"
                delta={{ value: "+18%", trend: "up" }}
                progress={{ current: 241892, max: 500000 }}
                hint="of 500,000 included"
                surface="dark"
              />
              <StatsCard
                label="Active portfolios"
                value="47"
                delta={{ value: "+3", trend: "up" }}
                hint="12 added this month"
                surface="dark"
              />
            </div>
          </Variant>

          <Variant label="Failure card on dark — weak accent" caption='accent="weak" on dark — value reads brighter red for dark surface legibility.'>
            <StatsCard
              label="Webhook failures (24h)"
              value="12"
              delta={{ value: "+9", trend: "up" }}
              hint="3 endpoints affected"
              accent="weak"
              surface="dark"
              action={{ label: "Investigate", href: "#" }}
            />
          </Variant>
        </div>
      </div>
    </section>
  );
}
