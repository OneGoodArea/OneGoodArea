import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@/lib/anthropic";
import { sql } from "@/lib/db";
import { canGenerateReport } from "@/lib/usage";
import { geocodeArea, GeocodedArea } from "@/lib/data-sources/postcodes";
import { getCrimeData, formatCrimeDataForPrompt, CrimeSummary } from "@/lib/data-sources/police";
import { getDeprivationData, formatDeprivationForPrompt, DeprivationData } from "@/lib/data-sources/deprivation";
import { getNearbyAmenities, formatAmenitiesForPrompt, AmenitiesData } from "@/lib/data-sources/openstreetmap";
import { getFloodRisk, formatFloodRiskForPrompt, FloodRiskData } from "@/lib/data-sources/flood";
import { AreaReport, Intent } from "@/lib/types";

function generateId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildPrompt(
  area: string,
  intent: Intent,
  geo: GeocodedArea | null,
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  flood: FloodRiskData | null
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

  if (deprivation) {
    realDataBlock += `\n\n${formatDeprivationForPrompt(deprivation)}`;
  }

  if (amenities) {
    realDataBlock += `\n\n${formatAmenitiesForPrompt(amenities)}`;
  }

  if (flood) {
    realDataBlock += `\n\n${formatFloodRiskForPrompt(flood)}`;
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
  "areaiq_score": <number 0-100, this MUST be the weighted average of sub_scores using the weights below>,
  "sub_scores": [
${intent === "moving" ? `    { "label": "Safety & Crime", "score": <0-100>, "weight": 25, "summary": "<actionable: e.g. 'Lower crime than 70% of London boroughs — anti-social behaviour is the main concern'>" },
    { "label": "Schools & Education", "score": <0-100>, "weight": 20, "summary": "<actionable: e.g. '3 Ofsted Outstanding schools within 1.5km — strong primary options'>" },
    { "label": "Transport & Commute", "score": <0-100>, "weight": 20, "summary": "<actionable: e.g. '2 tube stations within walking distance — 25min to central London'>" },
    { "label": "Daily Amenities", "score": <0-100>, "weight": 15, "summary": "<actionable: e.g. '4 supermarkets and 12 restaurants within 1km — well-served for daily needs'>" },
    { "label": "Cost of Living", "score": <0-100>, "weight": 20, "summary": "<actionable: e.g. 'Council tax Band D £1,450/yr — average rent £1,800/mo for 2-bed'>" }`
  : intent === "business" ? `    { "label": "Foot Traffic & Demand", "score": <0-100>, "weight": 30, "summary": "<actionable: e.g. '15,000 daily commuters through nearby station — strong lunch trade potential'>" },
    { "label": "Competition Density", "score": <0-100>, "weight": 20, "summary": "<actionable: e.g. '8 similar businesses within 500m — moderate saturation'>" },
    { "label": "Transport & Access", "score": <0-100>, "weight": 15, "summary": "<actionable: e.g. '3 bus routes and 1 tube station — good customer catchment'>" },
    { "label": "Local Spending Power", "score": <0-100>, "weight": 20, "summary": "<actionable: e.g. 'IMD decile 7 — above-average household income in catchment'>" },
    { "label": "Commercial Costs", "score": <0-100>, "weight": 15, "summary": "<actionable: e.g. 'Average commercial rent £45/sq ft — business rates £12k/yr'>" }`
  : intent === "investing" ? `    { "label": "Price Growth", "score": <0-100>, "weight": 25, "summary": "<actionable: e.g. '12% price growth over 3 years — outperforming borough average'>" },
    { "label": "Rental Yield", "score": <0-100>, "weight": 25, "summary": "<actionable: e.g. 'Gross yield 4.8% — £1,650/mo for average 2-bed at £410k'>" },
    { "label": "Regeneration & Infrastructure", "score": <0-100>, "weight": 20, "summary": "<actionable: e.g. '£200M regeneration scheme approved — new Crossrail station opening 2026'>" },
    { "label": "Tenant Demand", "score": <0-100>, "weight": 15, "summary": "<actionable: e.g. 'Average void period 8 days — strong demand from young professionals'>" },
    { "label": "Risk Factors", "score": <0-100>, "weight": 15, "summary": "<actionable: e.g. '3 flood risk zones nearby — leasehold concentration above average'>" }`
  : `    { "label": "Safety & Crime", "score": <0-100>, "weight": 20, "summary": "<actionable insight with specific data>" },
    { "label": "Transport Links", "score": <0-100>, "weight": 20, "summary": "<actionable insight with specific data>" },
    { "label": "Amenities & Services", "score": <0-100>, "weight": 20, "summary": "<actionable insight with specific data>" },
    { "label": "Demographics & Economy", "score": <0-100>, "weight": 20, "summary": "<actionable insight with specific data>" },
    { "label": "Environment & Quality", "score": <0-100>, "weight": 20, "summary": "<actionable insight with specific data>" }`}
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
  "data_sources": [${[
      geo ? '"postcodes.io"' : "",
      crime ? '"police.uk"' : "",
      deprivation ? '"IMD 2019"' : "",
      amenities ? '"OpenStreetMap"' : "",
      flood ? '"Environment Agency"' : "",
    ].filter(Boolean).join(", ")}],
  "generated_at": "${new Date().toISOString()}"
}

Requirements:
- Include 4-6 sections relevant to the intent
- Each section should have 2-5 data_points with realistic, specific values
- The areaiq_score MUST be the weighted average of sub_scores (use the weight field for each). Example: if scores are 70,60,80 with weights 30,50,20 → (70×30 + 60×50 + 80×20) / 100 = 67
- Each sub_score summary MUST be actionable — include specific numbers, comparisons, or benchmarks. Never say "good" or "moderate" without data to back it up
- Be specific to this exact area — reference real streets, landmarks, stations, local pubs, parks, and features by name
- Use UK-specific data: council tax bands, Ofsted ratings (Outstanding/Good/Requires Improvement/Inadequate), police.uk crime categories, Land Registry price data, NHS services
- All monetary values in GBP (£)
- Where real data has been provided, use the exact figures in data_points and analysis${crime ? "\n- The Safety section MUST reference the real police.uk crime data provided — use actual category counts and percentages" : ""}${deprivation ? "\n- The Demographics section MUST reference the real IMD deprivation data — include the decile, rank, and interpretation" : ""}${amenities ? "\n- Reference the real OpenStreetMap amenities counts and named places in relevant sections" : ""}${flood ? "\n- Include flood risk information from the Environment Agency data in relevant sections" : ""}
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

    // Fetch geocode first, then all data sources in parallel
    const geo = await geocodeArea(area);

    const [crime, deprivation, amenities, flood] = geo
      ? await Promise.all([
          getCrimeData(geo.latitude, geo.longitude),
          getDeprivationData(geo.lsoa),
          getNearbyAmenities(geo.latitude, geo.longitude),
          getFloodRisk(geo.latitude, geo.longitude),
        ])
      : [null, null, null, null];

    console.log(
      `[AreaIQ] Data fetched for "${area}": geo=${!!geo}, crime=${crime?.total_crimes ?? 0}, imd=${deprivation?.imd_rank ?? "n/a"}, amenities=${amenities?.total ?? 0}, flood_areas=${flood?.flood_areas_nearby ?? 0}`
    );

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: buildPrompt(area, intent, geo, crime, deprivation, amenities, flood),
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
