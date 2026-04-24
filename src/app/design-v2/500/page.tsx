import type { Metadata } from "next";
import ErrorClient from "./client";

export const metadata: Metadata = {
  title: "500 · Something went wrong | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

export default function DesignV2ErrorPage() {
  return <ErrorClient />;
}
