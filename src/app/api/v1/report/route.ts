import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { getUserPlan } from "@/lib/usage";
import { generateReport } from "@/lib/generate-report";
import { Intent } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    // Authenticate via API key
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing API key. Use: Authorization: Bearer aiq_..." },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7);
    const userId = await validateApiKey(apiKey);
    if (!userId) {
      return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
    }

    // Verify API plan
    const plan = await getUserPlan(userId);
    if (plan !== "api") {
      return NextResponse.json(
        { error: "API access requires the API plan" },
        { status: 403 }
      );
    }

    // Parse request
    const body = await req.json();
    const { area, intent } = body;

    if (!area || typeof area !== "string") {
      return NextResponse.json(
        { error: "Missing required field: area (string)" },
        { status: 400 }
      );
    }

    const validIntents: Intent[] = ["moving", "business", "investing", "research"];
    if (!intent || !validIntents.includes(intent)) {
      return NextResponse.json(
        { error: `Invalid intent. Must be one of: ${validIntents.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await generateReport(area, intent, userId);

    return NextResponse.json({
      id: result.id,
      report: result.report,
    });
  } catch (error) {
    console.error("[API v1] Report generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
