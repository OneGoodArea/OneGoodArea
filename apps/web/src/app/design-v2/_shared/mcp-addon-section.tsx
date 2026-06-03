"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppCard, PrimaryCta, GhostCta } from "./app-shell";

/* MCP add-on section · used on /dashboard and /dashboard/billing.
   AR-144 Session 5 wired up the purchase flow; AR-146 extracted this from
   dashboard/client.tsx so the in-app billing surface can render the same
   card without forking. AR-204 close-out 15/15 swapped legacy `--ink/
   --signal/--text-N/--display/--sans/--mono` tokens for `--oga-*` so this
   component survives the `.aiq` cascade strip. Behavior unchanged. */

export type McpStatus = {
  access: boolean;
  addonOwned: boolean;
  includedFreeViaPlan: boolean;
  callsThisMonth: number;
};

export function McpAddOnSection({ mcp }: { mcp: McpStatus }) {
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buyMcpAddon() {
    setPurchaseLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/addon-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addon: "mcp" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start checkout. Please try again.");
        setPurchaseLoading(false);
        return;
      }
      if (data.already_owned) {
        setError("You already have the MCP add-on active.");
        setPurchaseLoading(false);
        return;
      }
      if (data.plan_includes) {
        setError("Your plan already includes MCP — no add-on needed.");
        setPurchaseLoading(false);
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setPurchaseLoading(false);
    }
  }

  if (mcp.access) {
    let label = "Active";
    if (mcp.includedFreeViaPlan) label = "Included free on your plan";
    else if (mcp.addonOwned) label = "MCP add-on · £29 / month";
    return (
      <AppCard title="MCP Server">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <McpStatusBadge status="active" label={label} />
          <McpUsageStat callsThisMonth={mcp.callsThisMonth} />
          <McpInstallHelp />
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard title="MCP Server">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <McpStatusBadge status="inactive" label="Not on your plan" />
        <p style={{
          fontFamily: "var(--oga-font-sans)", fontSize: 14, lineHeight: 1.55,
          color: "var(--oga-fg-subtle)", margin: 0,
        }}>
          Add OneGoodArea to Claude Desktop, Cursor, or any MCP-compatible client. Score postcodes inline in your AI workflow.
          Included free on Growth (£1,499 / mo) and Enterprise tiers, or available as a £29 / month add-on on any paid plan.
        </p>
        {error && (
          <div style={{
            fontFamily: "var(--oga-font-mono)", fontSize: 11,
            color: "#A01B00", padding: "10px 12px",
            background: "rgba(160,27,0,0.08)",
            border: "1px solid rgba(160,27,0,0.18)",
            borderRadius: 4,
          }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <PrimaryCta onClick={buyMcpAddon} disabled={purchaseLoading}>
            {purchaseLoading ? "Starting checkout…" : "Add MCP · £29 / month"}
          </PrimaryCta>
          <GhostCta href="/docs/mcp">What is MCP?</GhostCta>
        </div>
      </div>
    </AppCard>
  );
}

function McpStatusBadge({ status, label }: { status: "active" | "inactive"; label: string }) {
  const isActive = status === "active";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 9,
      fontFamily: "var(--oga-font-mono)", fontSize: 10.5, fontWeight: 500,
      letterSpacing: "0.18em", textTransform: "uppercase",
      color: isActive ? "var(--oga-fg)" : "var(--oga-fg-muted)",
    }}>
      <span aria-hidden style={{
        width: 7, height: 7, borderRadius: 999,
        background: isActive ? "var(--oga-fg)" : "var(--oga-fg-muted)",
      }} />
      {label}
    </div>
  );
}

function McpUsageStat({ callsThisMonth }: { callsThisMonth: number }) {
  return (
    <div style={{
      padding: "12px 16px",
      background: "var(--oga-canvas)",
      border: "1px solid var(--oga-border)",
      borderRadius: 4,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{
        fontFamily: "var(--oga-font-mono)", fontSize: 10.5, fontWeight: 500,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--oga-fg-muted)",
      }}>MCP calls this month</span>
      <span style={{
        fontFamily: "var(--oga-font-sans)", fontSize: 24, fontWeight: 500,
        color: "var(--oga-fg)", letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
      }}>{callsThisMonth.toLocaleString()}</span>
    </div>
  );
}

function McpInstallHelp() {
  return (
    <div style={{
      padding: "12px 16px",
      background: "var(--oga-white)",
      border: "1px solid var(--oga-border)",
      borderLeft: "3px solid var(--oga-fg)",
      borderRadius: 4,
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <span style={{
        fontFamily: "var(--oga-font-mono)", fontSize: 9.5, fontWeight: 500,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--oga-fg)", paddingTop: 3, flexShrink: 0,
      }}>Install</span>
      <span style={{
        fontFamily: "var(--oga-font-sans)", fontSize: 13.5, lineHeight: 1.55,
        color: "var(--oga-fg)",
      }}>
        Add to your Claude Desktop or Cursor config with your API key. Full instructions at{" "}
        <Link href="/docs/mcp" style={{ color: "var(--oga-fg)", borderBottom: "1px solid var(--oga-fg)" }}>
          /docs/mcp
        </Link>.
      </span>
    </div>
  );
}
