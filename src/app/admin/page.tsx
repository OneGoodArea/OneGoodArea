import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAnalytics, getTrafficAnalytics } from "@/lib/activity";
import { AdminClient } from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Analytics | AreaIQ",
};

const ADMIN_EMAILS = ["ptengelmann@gmail.com"];

export default async function AdminPage() {
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
