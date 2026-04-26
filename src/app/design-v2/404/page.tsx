import type { Metadata } from "next";
import NotFoundClient from "./client";

export const metadata: Metadata = {
  title: "404 · Page not found | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

export default function DesignV2NotFoundPage() {
  return <NotFoundClient />;
}
