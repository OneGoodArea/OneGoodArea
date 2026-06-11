"use client";

/* AR-273 /dashboard/org/members.

   Replaces the AR-252 ComingSoonPage placeholder. Same operational
   pattern as the Phase 2 closes (Signals AR-259, Scores AR-262,
   Monitor AR-263, API usage AR-265): AppShell header, AppCard
   sections, brand modals for destructive moments.

   Sections:
     1. Members card — list current members. Each row: avatar (letter),
        name + email, role chip, joined date, change-role + remove
        actions for admin/owner callers (gated by role).
     2. Pending invitations card — list pending invites (not accepted,
        not revoked, not expired). Each row: email, role chip, expires
        countdown, revoke action.

   Header action: "+ Invite member" — opens the brand invite modal.

   RBAC mirrors apps/api invariants:
     - admin/owner can invite, change role, remove
     - granting 'owner' is owner-only
     - last owner cannot be demoted or removed (server enforces; UI hides
       the action)

   No usage strip in this PR — that's a follow-up (per-member 30-day
   activity_events rollup), explicitly deferred. */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell, AppCard, GhostCta } from "../_shared/app-shell";
import { Modal } from "../_shared/dashboard/modal";
import "./client.css";

type Role = "owner" | "admin" | "member";

interface Member {
  user_id: string;
  email: string;
  name: string | null;
  role: Role;
  joined_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: "member" | "admin";
  expires_at: string;
  created_at: string;
}

interface LoadedData {
  members: Member[];
  invitations: Invitation[];
  orgId: string | null;
  callerRole: Role | null;
}

const ROLE_RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };
function hasAtLeastRole(actual: Role | null, required: Role): boolean {
  return actual !== null && ROLE_RANK[actual] >= ROLE_RANK[required];
}

export default function MembersClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Modal state. Only one open at a time — opening a new modal closes
     any other (we just gate on which kind is current). */
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<Member | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);

  const reload = useCallback(async () => {
    try {
      const [mRes, iRes] = await Promise.all([
        fetch("/api/me/org/members"),
        fetch("/api/me/org/invitations"),
      ]);
      if (!mRes.ok || !iRes.ok) {
        setError("Couldn't load team data.");
        return;
      }
      const m = (await mRes.json()) as {
        members: Member[];
        org_id: string | null;
        caller_role: Role | null;
      };
      const i = (await iRes.json()) as { invitations: Invitation[] };
      setData({
        members: m.members,
        invitations: i.invitations,
        orgId: m.org_id,
        callerRole: m.caller_role,
      });
      setError(null);
    } catch {
      setError("Network error loading team data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session?.user) reload();
  }, [session, reload]);

  if (status === "loading") {
    return (
      <AppShell title="Team members">
        <div className="oga-mem__placeholder" />
      </AppShell>
    );
  }
  if (!session?.user) {
    router.push("/sign-in?callbackUrl=/dashboard/org/members");
    return null;
  }

  const callerCanManage = hasAtLeastRole(data?.callerRole ?? null, "admin");

  return (
    <AppShell
      title="Team members"
      subtitle="Invite teammates, manage their roles, and revoke pending invitations."
      actions={
        callerCanManage ? (
          <GhostCta onClick={() => setInviteOpen(true)}>+ Invite member</GhostCta>
        ) : null
      }
    >
      <div className="oga-mem">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} />
        ) : data ? (
          <>
            <AppCard title={`Members · ${data.members.length}`} noPad>
              <MembersList
                members={data.members}
                callerRole={data.callerRole}
                onChangeRole={setRoleTarget}
                onRemove={setRemoveTarget}
              />
            </AppCard>

            <AppCard title={`Pending invitations · ${data.invitations.length}`} noPad>
              <InvitationsList
                invitations={data.invitations}
                callerCanManage={callerCanManage}
                onRevoke={setRevokeTarget}
              />
            </AppCard>
          </>
        ) : null}
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSent={() => {
          setInviteOpen(false);
          reload();
        }}
      />

      <ChangeRoleModal
        target={roleTarget}
        callerRole={data?.callerRole ?? null}
        onClose={() => setRoleTarget(null)}
        onSaved={() => {
          setRoleTarget(null);
          reload();
        }}
      />

      <ConfirmDestructive
        open={removeTarget !== null}
        title="Remove member"
        body={
          removeTarget
            ? `${memberLabel(removeTarget)} will lose access to this organisation immediately. Their API keys stay valid against their personal org if any. This can't be undone from the dashboard.`
            : ""
        }
        confirmLabel="Remove member"
        endpoint={removeTarget ? `/api/me/org/members/${removeTarget.user_id}` : ""}
        method="DELETE"
        onClose={() => setRemoveTarget(null)}
        onDone={() => {
          setRemoveTarget(null);
          reload();
        }}
      />

      <ConfirmDestructive
        open={revokeTarget !== null}
        title="Revoke invitation"
        body={
          revokeTarget
            ? `${revokeTarget.email} won't be able to accept this invitation anymore. You can send a fresh one any time.`
            : ""
        }
        confirmLabel="Revoke invitation"
        endpoint={revokeTarget ? `/api/me/org/invitations/${revokeTarget.id}` : ""}
        method="DELETE"
        onClose={() => setRevokeTarget(null)}
        onDone={() => {
          setRevokeTarget(null);
          reload();
        }}
      />
    </AppShell>
  );
}

/* ── Loading + error ────────────────────────────────────────────────── */

function Loading() {
  return (
    <div className="oga-mem__loading">
      <span aria-hidden className="oga-mem__loading-spinner" />
      Loading team
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return <div className="oga-mem__error">{error}</div>;
}

/* ── Members list ───────────────────────────────────────────────────── */

function MembersList({
  members,
  callerRole,
  onChangeRole,
  onRemove,
}: {
  members: Member[];
  callerRole: Role | null;
  onChangeRole: (m: Member) => void;
  onRemove: (m: Member) => void;
}) {
  if (members.length === 0) {
    return <div className="oga-mem__empty">No members yet.</div>;
  }

  const callerCanManage = hasAtLeastRole(callerRole, "admin");
  const ownerCount = members.filter((m) => m.role === "owner").length;

  return (
    <ul className="oga-mem__list">
      {members.map((m) => {
        /* Last-owner protection mirrors the server. UI hides the
           actions so users don't get a 409 from the API. */
        const isLastOwner = m.role === "owner" && ownerCount <= 1;
        const showActions = callerCanManage && !isLastOwner;
        return (
          <li key={m.user_id} className="oga-mem__row">
            <Avatar label={m.name ?? m.email} />
            <div className="oga-mem__row-meta">
              <span className="oga-mem__row-name">
                {m.name ?? m.email.split("@")[0]}
              </span>
              <span className="oga-mem__row-email">{m.email}</span>
            </div>
            <RoleChip role={m.role} />
            <span className="oga-mem__row-joined">
              Joined {formatDate(m.joined_at)}
            </span>
            {showActions ? (
              <div className="oga-mem__row-actions">
                <button
                  type="button"
                  onClick={() => onChangeRole(m)}
                  className="oga-mem__ghost-btn"
                  aria-label={`Change role for ${m.email}`}
                >
                  Change role
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(m)}
                  className="oga-mem__danger-btn"
                  aria-label={`Remove ${m.email}`}
                >
                  Remove
                </button>
              </div>
            ) : (
              <span className="oga-mem__row-actions" aria-hidden />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ── Invitations list ───────────────────────────────────────────────── */

function InvitationsList({
  invitations,
  callerCanManage,
  onRevoke,
}: {
  invitations: Invitation[];
  callerCanManage: boolean;
  onRevoke: (inv: Invitation) => void;
}) {
  if (invitations.length === 0) {
    return (
      <div className="oga-mem__empty">
        No pending invitations. Use <strong>+ Invite member</strong> above to
        send one.
      </div>
    );
  }
  return (
    <ul className="oga-mem__list">
      {invitations.map((inv) => (
        <li key={inv.id} className="oga-mem__row">
          <Avatar label={inv.email} />
          <div className="oga-mem__row-meta">
            <span className="oga-mem__row-name">{inv.email}</span>
            <span className="oga-mem__row-email">
              Expires {formatRelative(inv.expires_at)}
            </span>
          </div>
          <RoleChip role={inv.role} />
          <span className="oga-mem__row-joined">
            Sent {formatDate(inv.created_at)}
          </span>
          {callerCanManage ? (
            <div className="oga-mem__row-actions">
              <button
                type="button"
                onClick={() => onRevoke(inv)}
                className="oga-mem__danger-btn"
                aria-label={`Revoke invitation for ${inv.email}`}
              >
                Revoke
              </button>
            </div>
          ) : (
            <span className="oga-mem__row-actions" aria-hidden />
          )}
        </li>
      ))}
    </ul>
  );
}

/* ── Modals ─────────────────────────────────────────────────────────── */

function InviteModal({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail("");
      setRole("member");
      setBusy(false);
      setErr(null);
    }
  }, [open]);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/me/org/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
        setErr(messageForInviteError(body?.code, body?.error));
        return;
      }
      onSent();
    } catch {
      setErr("Network error sending invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => (busy ? null : onClose())}
      title="Invite member"
      size="sm"
      closeOnBackdrop={!busy}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="oga-mem__modal-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !email}
            className="oga-mem__modal-primary"
          >
            {busy ? "Sending…" : "Send invitation"}
          </button>
        </>
      }
    >
      <p className="oga-mem__modal-body">
        We&apos;ll email them a single-use link to join. It expires in 7 days
        and can only be used by the person it was sent to.
      </p>
      <label className="oga-mem__modal-field">
        <span className="oga-mem__modal-field-label">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy && email) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="teammate@yourcompany.com"
          maxLength={254}
          autoFocus
          className="oga-mem__modal-input"
        />
      </label>
      <fieldset className="oga-mem__modal-field">
        <legend className="oga-mem__modal-field-label">Role</legend>
        <div className="oga-mem__role-picker">
          <RolePickerOption
            checked={role === "member"}
            label="Member"
            description="Can call the API and view team data."
            onSelect={() => setRole("member")}
          />
          <RolePickerOption
            checked={role === "admin"}
            label="Admin"
            description="Can invite and remove members + change roles (except granting owner)."
            onSelect={() => setRole("admin")}
          />
        </div>
      </fieldset>
      {err ? (
        <p className="oga-mem__modal-error" role="alert">
          {err}
        </p>
      ) : null}
    </Modal>
  );
}

function ChangeRoleModal({
  target,
  callerRole,
  onClose,
  onSaved,
}: {
  target: Member | null;
  callerRole: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<Role>("member");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRole(target.role);
      setBusy(false);
      setErr(null);
    }
  }, [target]);

  const callerIsOwner = callerRole === "owner";

  async function submit() {
    if (!target) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/me/org/members/${target.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
        setErr(messageForRoleError(body?.code, body?.error));
        return;
      }
      onSaved();
    } catch {
      setErr("Network error updating role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={target !== null}
      onClose={() => (busy ? null : onClose())}
      title="Change role"
      size="sm"
      closeOnBackdrop={!busy}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="oga-mem__modal-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || role === target?.role}
            className="oga-mem__modal-primary"
          >
            {busy ? "Saving…" : "Save role"}
          </button>
        </>
      }
    >
      {target ? (
        <>
          <p className="oga-mem__modal-body">
            Update the role for <strong>{memberLabel(target)}</strong>.
          </p>
          <div className="oga-mem__role-picker">
            <RolePickerOption
              checked={role === "member"}
              label="Member"
              description="Can call the API and view team data."
              onSelect={() => setRole("member")}
            />
            <RolePickerOption
              checked={role === "admin"}
              label="Admin"
              description="Can invite and remove members + change roles (except granting owner)."
              onSelect={() => setRole("admin")}
            />
            <RolePickerOption
              checked={role === "owner"}
              label="Owner"
              description={
                callerIsOwner
                  ? "Full control. Granting owner can't be undone except by another owner."
                  : "Only an existing owner can grant the owner role."
              }
              disabled={!callerIsOwner}
              onSelect={() => callerIsOwner && setRole("owner")}
            />
          </div>
          {err ? (
            <p className="oga-mem__modal-error" role="alert">
              {err}
            </p>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}

function ConfirmDestructive({
  open,
  title,
  body,
  confirmLabel,
  endpoint,
  method,
  onClose,
  onDone,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  endpoint: string;
  method: "DELETE";
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBusy(false);
      setErr(null);
    }
  }, [open]);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(endpoint, { method });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
        setErr(body?.error ?? "Action failed. Try again.");
        return;
      }
      onDone();
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => (busy ? null : onClose())}
      title={title}
      size="sm"
      surface="dark"
      closeOnBackdrop={false}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="oga-mem__modal-secondary oga-mem__modal-secondary--on-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="oga-mem__modal-danger"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="oga-mem__modal-body oga-mem__modal-body--on-dark">
        {body}
      </p>
      {err ? (
        <p className="oga-mem__modal-error" role="alert">
          {err}
        </p>
      ) : null}
    </Modal>
  );
}

/* ── Tiny presentational primitives ─────────────────────────────────── */

function Avatar({ label }: { label: string }) {
  const initial = (label.trim()[0] ?? "?").toUpperCase();
  return <span className="oga-mem__avatar" aria-hidden>{initial}</span>;
}

function RoleChip({ role }: { role: Role }) {
  return (
    <span className="oga-mem__chip" data-role={role}>
      {role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Member"}
    </span>
  );
}

function RolePickerOption({
  checked,
  label,
  description,
  disabled,
  onSelect,
}: {
  checked: boolean;
  label: string;
  description: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className="oga-mem__role-option"
      data-checked={checked}
      data-disabled={disabled ? "true" : "false"}
    >
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="oga-mem__role-radio"
      />
      <div className="oga-mem__role-text">
        <span className="oga-mem__role-label">{label}</span>
        <span className="oga-mem__role-desc">{description}</span>
      </div>
    </label>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function memberLabel(m: Member): string {
  return m.name ?? m.email;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "in 6 days" / "in 12 hours" / "in 30 minutes" / "soon". For the
    expires_at countdown on pending invitations. */
function formatRelative(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "soon";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

function messageForInviteError(code: string | undefined, fallback: string | undefined): string {
  switch (code) {
    case "invitation_already_pending":
      return "There's already an open invitation for this email. Revoke it first if you want to send a new one.";
    case "user_already_member":
      return "This person is already a member of the org.";
    case "admin_required":
      return "Only admins and owners can invite members.";
    default:
      return fallback ?? "Couldn't send the invitation. Try again.";
  }
}

function messageForRoleError(code: string | undefined, fallback: string | undefined): string {
  switch (code) {
    case "cannot_grant_owner":
      return "Only an owner can grant the owner role.";
    case "last_owner":
      return "You can't demote the last owner of the org.";
    case "admin_required":
      return "Only admins and owners can change roles.";
    default:
      return fallback ?? "Couldn't update the role. Try again.";
  }
}
