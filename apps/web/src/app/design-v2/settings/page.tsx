import type { Metadata } from "next";
import SettingsClient from "./client";

export const metadata: Metadata = {
  title: "Settings | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

export default function DesignV2SettingsPage() {
  return <SettingsClient />;
}
