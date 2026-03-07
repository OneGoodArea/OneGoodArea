import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { canGenerateReport } from "@/lib/usage";
import { generateReport } from "@/lib/generate-report";
import { Intent } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await canGenerateReport(userId);
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "limit_reached", used: usage.used, limit: usage.limit, plan: usage.plan },
        { status: 403 }
      );
    }

    const { area, intent } = await req.json();

    if (!area || !intent) {
      return NextResponse.json(
        { error: "Area and intent are required" },
        { status: 400 }
      );
    }

    const validIntents: Intent[] = ["moving", "business", "investing", "research"];
    if (!validIntents.includes(intent)) {
      return NextResponse.json(
        { error: "Invalid intent" },
        { status: 400 }
      );
    }

    const result = await generateReport(area, intent, userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
