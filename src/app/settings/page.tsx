"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ArrowRight, Check, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { UserButton } from "@/components/user-button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (status === "loading") return null;
  if (!session?.user) {
    router.push("/sign-in");
    return null;
  }

  const isOAuth = !session.user.email?.includes("@") ? false : true;

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change password");
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Settings" }]}>
        <Link
          href="/report"
          className="h-7 px-3 flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          <ArrowRight size={11} />
          App
        </Link>
        <UserButton />
      </Navbar>

      <main className="flex-1 max-w-[600px] w-full mx-auto px-6 py-10">
        {/* Account Info */}
        <div className="border mb-8" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
          <div className="px-5 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Account
            </span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>Name</span>
              <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                {session.user.name || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>Email</span>
              <span className="text-[12px] font-mono" style={{ color: "var(--text-primary)" }}>
                {session.user.email}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="border" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
          <div className="px-5 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
            <Lock size={12} style={{ color: "var(--text-tertiary)" }} />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Change Password
            </span>
          </div>

          <div className="px-5 py-5">
            {isOAuth && (
              <div className="text-[12px] py-4" style={{ color: "var(--text-tertiary)" }}>
                Submit the form below to change your password. If you signed in with Google, this will
                set a password for email/password login.
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full h-9 px-3 text-[12px] font-mono border outline-none transition-colors"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full h-9 px-3 text-[12px] font-mono border outline-none transition-colors"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="Min 8 characters"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full h-9 px-3 text-[12px] font-mono border outline-none transition-colors"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="Re-enter new password"
                />
              </div>

              {error && (
                <div className="text-[11px] font-mono px-3 py-2" style={{ color: "var(--neon-red)", background: "var(--bg-active)" }}>
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-[11px] font-mono px-3 py-2" style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}>
                  <Check size={12} />
                  Password changed successfully
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="h-9 px-5 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default"
                style={{ background: "var(--text-primary)", color: "var(--bg)" }}
              >
                {loading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          </div>
        </div>
        {/* Delete Account */}
        <div className="border mt-8" style={{ borderColor: "var(--neon-red)", background: "var(--neon-red-dim)" }}>
          <div className="px-5 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "var(--neon-red)" }}>
            <Trash2 size={12} style={{ color: "var(--neon-red)" }} />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--neon-red)" }}>
              Danger Zone
            </span>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: "var(--neon-red)" }} />
              <div className="space-y-1.5">
                <p className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                  Delete your account permanently
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  This will permanently delete your account and all associated data, including your reports, API keys, and usage history. This action cannot be undone.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => {
                  setDeleteConfirmation(e.target.value);
                  setDeleteError(null);
                }}
                className="w-full h-9 px-3 text-[12px] font-mono border outline-none transition-colors"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
                placeholder="DELETE"
              />
            </div>

            {deleteError && (
              <div className="text-[11px] font-mono px-3 py-2" style={{ color: "var(--neon-red)", background: "var(--bg-active)" }}>
                {deleteError}
              </div>
            )}

            <button
              type="button"
              disabled={deleteLoading || deleteConfirmation !== "DELETE"}
              onClick={async () => {
                setDeleteError(null);
                setDeleteLoading(true);
                try {
                  const res = await fetch("/api/settings/delete-account", {
                    method: "DELETE",
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    setDeleteError(data.error || "Failed to delete account");
                    return;
                  }
                  await signOut({ callbackUrl: "/" });
                } catch {
                  setDeleteError("Something went wrong");
                } finally {
                  setDeleteLoading(false);
                }
              }}
              className="h-9 px-5 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default"
              style={{ background: "var(--neon-red)", color: "#fff" }}
            >
              {deleteLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <Trash2 size={12} />
                  Delete Account
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <Footer maxWidth="600px" />
    </div>
  );
}
