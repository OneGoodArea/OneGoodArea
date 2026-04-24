import type { Metadata } from "next";
import DesignV2Client from "./client";

export const metadata: Metadata = {
  title: "OneGoodArea | Design V2 Preview",
  description: "Design V2 preview: OneGoodArea hero iteration",
  robots: { index: false, follow: false },
};

export default function DesignV2Page() {
  return <DesignV2Client />;
}
