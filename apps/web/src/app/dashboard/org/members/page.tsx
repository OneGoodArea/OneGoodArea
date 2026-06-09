import type { Metadata } from "next";
import ComingSoonPage from "@/app/design-v2/_shared/dashboard/coming-soon-page";

export const metadata: Metadata = {
  title: "Members | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ComingSoonPage
      pageTitle="Members"
      phase="Phase 3 — Levers"
      title="Team members"
      description="Invite teammates to your organisation, assign roles (Owner, Admin, Member), and audit who's making API calls under which key. Org-scoped API keys + per-member usage rollups land with the Levers epic."
    />
  );
}
