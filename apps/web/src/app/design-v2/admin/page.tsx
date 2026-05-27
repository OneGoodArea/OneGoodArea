import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAnalytics, getTrafficAnalytics } from "@/lib/activity";
import AdminClient from "./client";

export const metadata: Metadata = {
  title: "Admin | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

const ADMIN_EMAILS = ["ptengelmann@gmail.com"];

export default async function DesignV2AdminPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !ADMIN_EMAILS.includes(email)) {
    redirect("/dashboard");
  }

  const [analytics, traffic] = await Promise.all([
    getAnalytics(),
    getTrafficAnalytics(),
  ]);

  return <AdminClient analytics={analytics} traffic={traffic} />;
}
