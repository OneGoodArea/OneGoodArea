import type { Metadata } from "next";
import WelcomeClient from "@/app/design-v2/welcome/client";

/* AR-251 [AR-248-C] /welcome — 3-step onboarding shell.

   Per the AR-248 proposal, /welcome is where the new user lands after
   email verification (via magic link from AR-250 or eventual classic
   verification). The shell hosts three discrete steps:
     Step 1 — Intent picker (AR-248-D, placeholder this PR)
     Step 2 — Workspace bootstrap (AR-248-E, placeholder this PR)
     Step 3 — First-signal AHA (AR-248-F, placeholder this PR)

   This ticket ships the WRAPPER only: step counter, navigation,
   transitions, surface treatment. Each subsequent ticket replaces
   one placeholder with the real step content. */

export const metadata: Metadata = {
  title: "Welcome | OneGoodArea",
  description:
    "Three short steps before your first signal. Pick what brings you here, name your workspace, and run your first query.",
  robots: { index: false, follow: false },
};

export default function WelcomePage() {
  return <WelcomeClient />;
}
