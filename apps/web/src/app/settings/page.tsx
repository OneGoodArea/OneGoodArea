import type { Metadata } from "next";
import SettingsClient from "@/app/design-v2/settings/client";

export const metadata: Metadata = {
  title: "Settings | OneGoodArea",
  description: "Manage your OneGoodArea account, plan, and subscription.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <SettingsClient />;
}
