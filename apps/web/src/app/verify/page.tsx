import { redirect } from "next/navigation";
import VerifyClient from "@/app/design-v2/verify/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email | OneGoodArea",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ token?: string; state?: string }>;
}

async function verifyToken(token: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${process.env.INTERNAL_API_URL ?? "http://localhost:4000"}/auth/verify-email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    return { success: data.ok === true };
  } catch {
    return { success: false };
  }
}

export default async function VerifyPage({ searchParams }: Props) {
  const { token, state } = await searchParams;

  if (token) {
    const result = await verifyToken(token);
    redirect(`/verify?state=${result.success ? "success" : "failure"}`);
  }

  if (!state) redirect("/");

  return <VerifyClient />;
}
