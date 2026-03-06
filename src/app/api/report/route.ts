import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@/lib/anthropic";
import { sql } from "@/lib/db";
import { canGenerateReport } from "@/lib/usage";
import { geocodeArea, GeocodedArea } from "@/lib/data-sources/postcodes";
import { getCrimeData, formatCrimeDataForPrompt, CrimeSummary } from "@/lib/data-sources/police";
import { AreaReport, Intent } from "@/lib/types";

function generateId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildPrompt(
  area: string,
  intent: Intent,
  geo: GeocodedArea | null,
  crime: CrimeSummary | null
): string {
  const intentContext: Record<Intent, string> = {
    moving:
      "The user is considering moving to this UK area. Focus on livability: police.uk crime stats, Ofsted school ratings, NHS GP/hospital access, parks and green spaces, public transport (TfL/National Rail/bus), council tax band, community feel, noise levels, and cost of living.",
    business:
      "The user is considering opening a business in this UK area. Focus on: foot traffic potential, competition density, commercial rent estimates (per sq ft), local demographics and spending power from ONS data, transport accessibility, nearby complementary businesses, high street vacancy rates, and local economic trends.",
    investing:
      "The user is evaluating this UK area for property or business investment. Focus on: Land Registry price trends, average rental yields, regeneration projects and enterprise zones, planning applications from local authority, demographic shifts from ONS, infrastructure developments (Crossrail, HS2, etc.), and growth indicators.",
    research:
      "The user wants a general understanding of this UK area. Provide a balanced overview: ONS demographics, local economy, police.uk crime data, amenities, public transport, culture, history, and notable characteristics.",
  };

  // Build real data section
  let realDataBlock = "";

  if (geo) {
    realDataBlock += `\n\nVERIFIED LOCATION DATA (Source: Postcodes.io):
- Coordinates: ${geo.latitude}, ${geo.longitude}
- Local Authority: ${geo.admin_district}
- Region: ${geo.region}
- Ward: ${geo.ward}
- Parliamentary Constituency: ${geo.constituency}
- Country: ${geo.country}
- LSOA: ${geo.lsoa}
- MSOA: ${geo.msoa}`;
  }

  if (crime) {
    realDataBlock += `\n\n${formatCrimeDataForPrompt(crime)}`;
  }

  const dataInstructions = realDataBlock
    ? `\n\nIMPORTANT: Real data has been provided below. You MUST use this real data in your analysis — incorporate the actual crime statistics, location metadata, and any other verified data into the relevant sections and data_points. Do not fabricate numbers that contradict the real data. Where real data is provided, use exact figures. Where no real data is available, provide reasonable estimates and note them as estimates.`
    : "";

  return `You are AreaIQ, an expert UK area intelligence analyst. You specialise in UK neighbourhoods, postcodes, and districts. Produce a detailed, data-driven intelligence report for the following UK area and intent.

IMPORTANT: This platform is UK-only. All data references should use UK-specific sources and frameworks:
- Crime data: police.uk / Home Office statistics
- Demographics: ONS Census 2021 data
- Schools: Ofsted ratings
- Property: Land Registry, Rightmove/Zoopla market data
- Transport: TfL, National Rail, local bus networks
- Healthcare: NHS services, GP surgeries
- Planning: Local authority planning portals
- Currency: GBP (£)
- Council tax bands where relevant

AREA: ${area}
INTENT: ${intentContext[intent]}${dataInstructions}${realDataBlock}

You must respond with ONLY valid JSON matching this exact structure (no markdown, no code fences, no explanation):

{
  "area": "${area}",
  "intent": "${intent}",
  "areaiq_score": <number 0-100>,
  "sub_scores": [
    { "label": "Safety", "score": <0-100>, "summary": "<1 sentence>" },
    { "label": "Transport", "score": <0-100>, "summary": "<1 sentence>" },
    { "label": "Amenities", "score": <0-100>, "summary": "<1 sentence>" },
    { "label": "Demographics", "score": <0-100>, "summary": "<1 sentence>" },
    { "label": "${intent === "business" ? "Commercial Viability" : intent === "investing" ? "Growth Potential" : intent === "moving" ? "Livability" : "Overall Quality"}", "score": <0-100>, "summary": "<1 sentence>" }
  ],
  "summary": "<2-3 sentence executive summary of the area for this specific intent>",
  "sections": [
    {
      "title": "<section title>",
      "content": "<2-4 paragraphs of detailed analysis>",
      "data_points": [
        { "label": "<metric name>", "value": "<value>" }
      ]
    }
  ],
  "recommendations": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>",
    "<actionable recommendation 3>"
  ],
  "data_sources": [${geo ? '"postcodes.io"' : ""}${geo && crime ? ", " : ""}${crime ? '"police.uk"' : ""}],
  "generated_at": "${new Date().toISOString()}"
}

Requirements:
- Include 4-6 sections relevant to the intent
- Each section should have 2-5 data_points with realistic, specific values
- The areaiq_score should reflect the overall suitability of this area for the stated intent
- Sub-scores should be weighted appropriately for the intent
- Be specific to this exact area — reference real streets, landmarks, stations, local pubs, parks, and features by name
- Use UK-specific data: council tax bands, Ofsted ratings (Outstanding/Good/Requires Improvement/Inadequate), police.uk crime categories, Land Registry price data, NHS services
- All monetary values in GBP (£)
- Where real data has been provided, use the exact figures in data_points and analysis${crime ? "\n- The Safety section MUST reference the real police.uk crime data provided — use actual category counts and percentages" : ""}
- Where no real data is available, provide reasonable estimates and clearly note them as estimates
- Recommendations should be specific, actionable, and UK-relevant (reference local councils, planning authorities, specific streets, etc.)
- Do NOT reference non-UK data sources or frameworks`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check usage limits
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

    // Fetch real data in parallel
    const geo = await geocodeArea(area);
    const crime = geo ? await getCrimeData(geo.latitude, geo.longitude) : null;

    console.log(`[AreaIQ] Data fetched for "${area}": geo=${!!geo}, crime=${crime?.total_crimes ?? 0} crimes`);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: buildPrompt(area, intent, geo, crime),
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    const report: AreaReport = JSON.parse(textContent.text);
    const id = generateId();

    await sql`
      INSERT INTO reports (id, area, intent, report, score, user_id)
      VALUES (${id}, ${area}, ${intent}, ${JSON.stringify(report)}, ${report.areaiq_score}, ${userId})
    `;

    return NextResponse.json({ id, report });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
