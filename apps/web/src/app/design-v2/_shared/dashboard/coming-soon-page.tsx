"use client";

/* Wrapper that turns a ComingSoon placeholder into a real dashboard
   page — AppShell chrome (so the new AR-252 sidebar renders) +
   ComingSoon body. AppShell uses useSession via NextAuth client; this
   file is a client boundary so the placeholder page.tsx can stay a
   simple server component that passes config props. */

import type { ReactNode } from "react";
import { AppShell } from "@/app/design-v2/_shared/app-shell";
import ComingSoon from "@/app/design-v2/_shared/dashboard/coming-soon";

interface ComingSoonPageProps {
  /** Title rendered in the AppShell page header (cream column). */
  pageTitle: string;
  /** Phase eyebrow inside the placeholder card. */
  phase: string;
  /** Editorial heading inside the placeholder card. */
  title: string;
  description: ReactNode;
}

export default function ComingSoonPage({
  pageTitle,
  phase,
  title,
  description,
}: ComingSoonPageProps) {
  return (
    <AppShell title={pageTitle}>
      <ComingSoon phase={phase} title={title} description={description} />
    </AppShell>
  );
}
