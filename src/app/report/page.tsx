import type { Metadata } from "next";
import ReportGeneratorClient from "@/app/design-v2/report/client";

export const metadata: Metadata = {
  title: "Generate a report | OneGoodArea",
  description: "Type a UK postcode or place and pick your intent. OneGoodArea generates a full read in seconds.",
  alternates: { canonical: "https://www.area-iq.co.uk/report" },
};

export default function ReportPage() {
  return <ReportGeneratorClient />;
}
