import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "API Documentation | AreaIQ",
  description: "Integrate area intelligence into your applications with the AreaIQ REST API.",
};

function CodeBlock({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="relative">
      {lang && (
        <div
          className="absolute top-0 right-0 text-[9px] font-mono uppercase tracking-wider px-2 py-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          {lang}
        </div>
      )}
      <pre
        className="text-[12px] font-mono p-4 overflow-x-auto leading-relaxed"
        style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
      >
        {children}
      </pre>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="mb-12 scroll-mt-8">
      <h2 className="text-[16px] font-semibold mb-4" style={{ color: "var(--text-primary)" }}>{title}</h2>
      {children}
    </div>
  );
}

function Badge({ children, color = "var(--neon-green)" }: { children: string; color?: string }) {
  return (
    <span
      className="text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider"
      style={{ color: "var(--bg)", background: color }}
    >
      {children}
    </span>
  );
}

const NAV_ITEMS = [
  { id: "quickstart", label: "Quickstart" },
  { id: "authentication", label: "Authentication" },
  { id: "endpoint", label: "Endpoint" },
  { id: "request", label: "Request" },
  { id: "response", label: "Response" },
  { id: "errors", label: "Errors" },
  { id: "data-sources", label: "Data Sources" },
  { id: "rate-limits", label: "Rate Limits" },
  { id: "sdks", label: "SDKs" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "API Docs" }]} maxWidth="1100px">
        <Link
          href="/pricing"
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
          style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}
        >
          Get API Access
        </Link>
      </Navbar>

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10">

          {/* Sidebar Navigation */}
          <nav className="hidden lg:block">
            <div className="sticky top-8">
              <div className="text-[9px] font-mono uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
                On this page
              </div>
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-[12px] font-mono py-1 transition-colors hover:opacity-80"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </nav>

          {/* Content */}
          <div className="min-w-0">
            {/* Hero */}
            <div className="mb-12">
              <h1 className="text-[28px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                AreaIQ API
              </h1>
              <p className="text-[14px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                Integrate UK area intelligence into your applications. Generate data-driven location reports
                powered by 5 government and open data sources.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-mono px-2 py-0.5" style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}>
                  v1 · Stable
                </span>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  REST &bull; JSON &bull; Bearer auth &bull; HTTPS only
                </span>
              </div>
            </div>

            {/* Quickstart */}
            <Section id="quickstart" title="Quickstart">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
                  {[
                    { step: "1", title: "Get your API key", desc: "Subscribe to the Business plan and generate a key from your dashboard." },
                    { step: "2", title: "Make a request", desc: "Send a POST request with an area name and intent type." },
                    { step: "3", title: "Get intelligence", desc: "Receive a scored report with 5 data-backed dimensions." },
                  ].map((item) => (
                    <div key={item.step} className="p-4" style={{ background: "var(--bg-elevated)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold"
                          style={{ background: "var(--neon-green-dim)", color: "var(--neon-green)" }}
                        >
                          {item.step}
                        </span>
                        <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{item.desc}</p>
                    </div>
                  ))}
                </div>

                <CodeBlock lang="bash">{`curl -X POST https://www.area-iq.co.uk/api/v1/report \\
  -H "Authorization: Bearer aiq_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"area": "Shoreditch", "intent": "business"}'`}</CodeBlock>
              </div>
            </Section>

            {/* Authentication */}
            <Section id="authentication" title="Authentication">
              <p className="text-[13px] mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                All API requests require a Bearer token in the <code className="text-[12px] font-mono px-1 py-0.5" style={{ background: "var(--bg-active)", color: "var(--text-primary)" }}>Authorization</code> header.
                Generate API keys from your{" "}
                <Link href="/dashboard" className="underline" style={{ color: "var(--accent)" }}>dashboard</Link>.
                Requires the{" "}
                <Link href="/pricing" className="underline" style={{ color: "var(--accent)" }}>Business plan</Link> (£249/mo).
              </p>
              <CodeBlock>{`Authorization: Bearer aiq_your_api_key_here`}</CodeBlock>
              <div className="mt-4 p-3 border" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
                <div className="text-[11px] font-mono font-semibold mb-1" style={{ color: "var(--neon-amber)" }}>
                  Security
                </div>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  API keys carry full account access. Do not expose them in client-side code or public repositories.
                  Keys can be revoked instantly from your dashboard.
                </p>
              </div>
            </Section>

            {/* Endpoint */}
            <Section id="endpoint" title="Endpoint">
              <div className="border" style={{ borderColor: "var(--border)" }}>
                <div className="px-4 py-3 flex items-center gap-3" style={{ background: "var(--bg-elevated)" }}>
                  <Badge>POST</Badge>
                  <code className="text-[13px] font-mono" style={{ color: "var(--text-primary)" }}>
                    https://www.area-iq.co.uk/api/v1/report
                  </code>
                </div>
              </div>
              <p className="text-[12px] font-mono mt-3" style={{ color: "var(--text-tertiary)" }}>
                All requests must use HTTPS. HTTP requests will be rejected.
              </p>
            </Section>

            {/* Request */}
            <Section id="request" title="Request Body">
              <p className="text-[13px] mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Send a JSON body with the area to analyse and the intent type. The intent determines which
                scoring dimensions and weights are applied.
              </p>

              <div className="border mb-6" style={{ borderColor: "var(--border)" }}>
                <div
                  className="grid grid-cols-[110px_70px_60px_1fr] gap-3 px-4 py-2 border-b text-[9px] font-mono uppercase tracking-wider"
                  style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}
                >
                  <span>Field</span><span>Type</span><span>Required</span><span>Description</span>
                </div>
                <div
                  className="grid grid-cols-[110px_70px_60px_1fr] gap-3 px-4 py-3 border-b text-[12px] font-mono"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span style={{ color: "var(--text-primary)" }}>area</span>
                  <span style={{ color: "var(--text-tertiary)" }}>string</span>
                  <span style={{ color: "var(--neon-green)" }}>Yes</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    UK area name or postcode. E.g. &quot;Shoreditch&quot;, &quot;SW1A 1AA&quot;, &quot;Manchester city centre&quot;
                  </span>
                </div>
                <div
                  className="grid grid-cols-[110px_70px_60px_1fr] gap-3 px-4 py-3 text-[12px] font-mono"
                >
                  <span style={{ color: "var(--text-primary)" }}>intent</span>
                  <span style={{ color: "var(--text-tertiary)" }}>string</span>
                  <span style={{ color: "var(--neon-green)" }}>Yes</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Analysis intent. One of:{" "}
                    <code style={{ color: "var(--accent)" }}>moving</code>,{" "}
                    <code style={{ color: "var(--accent)" }}>business</code>,{" "}
                    <code style={{ color: "var(--accent)" }}>investing</code>,{" "}
                    <code style={{ color: "var(--accent)" }}>research</code>
                  </span>
                </div>
              </div>

              {/* Intent breakdown */}
              <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Intent Types & Scoring Dimensions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px mb-4" style={{ background: "var(--border)" }}>
                {[
                  {
                    intent: "moving",
                    desc: "Residential relocation",
                    dimensions: ["Safety (25%)", "Schools (20%)", "Transport (20%)", "Amenities (15%)", "Cost of Living (20%)"],
                  },
                  {
                    intent: "business",
                    desc: "Commercial viability",
                    dimensions: ["Foot Traffic (30%)", "Competition (20%)", "Transport (15%)", "Spending Power (20%)", "Costs (15%)"],
                  },
                  {
                    intent: "investing",
                    desc: "Property investment",
                    dimensions: ["Price Growth (25%)", "Rental Yield (25%)", "Regeneration (20%)", "Tenant Demand (15%)", "Risk (15%)"],
                  },
                  {
                    intent: "research",
                    desc: "General area profile",
                    dimensions: ["Demographics (20%)", "Economy (20%)", "Infrastructure (20%)", "Environment (20%)", "Liveability (20%)"],
                  },
                ].map((item) => (
                  <div key={item.intent} className="p-4" style={{ background: "var(--bg-elevated)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-[11px] font-mono font-semibold" style={{ color: "var(--accent)" }}>
                        {item.intent}
                      </code>
                      <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>· {item.desc}</span>
                    </div>
                    <div className="space-y-1">
                      {item.dimensions.map((d) => (
                        <div key={d} className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Response */}
            <Section id="response" title="Response">
              <p className="text-[13px] mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Successful requests return <code className="text-[12px] font-mono px-1 py-0.5" style={{ background: "var(--bg-active)", color: "var(--neon-green)" }}>200 OK</code> with
                the report ID and full report object.
              </p>

              <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Response Schema
              </h3>
              <div className="border mb-6" style={{ borderColor: "var(--border)" }}>
                {[
                  ["id", "string", "Unique report ID (e.g. rpt_1709834567_a1b2c3)"],
                  ["report.area", "string", "Normalised area name"],
                  ["report.intent", "string", "Intent type used for scoring"],
                  ["report.areaiq_score", "number", "Overall weighted score (0–100)"],
                  ["report.sub_scores", "SubScore[]", "5 intent-specific scored dimensions"],
                  ["report.sub_scores[].label", "string", "Dimension name"],
                  ["report.sub_scores[].score", "number", "Dimension score (0–100)"],
                  ["report.sub_scores[].weight", "number", "Weight in overall score (sums to 100)"],
                  ["report.sub_scores[].summary", "string", "Data-backed explanation for this score"],
                  ["report.summary", "string", "2–3 sentence executive summary"],
                  ["report.sections", "Section[]", "4–6 detailed analysis sections"],
                  ["report.sections[].title", "string", "Section heading"],
                  ["report.sections[].content", "string", "Section narrative"],
                  ["report.sections[].data_points", "DataPoint[]?", "Key-value data points (optional)"],
                  ["report.recommendations", "string[]", "3+ actionable recommendations"],
                  ["report.data_sources", "string[]", "Data sources used in this report"],
                  ["report.generated_at", "string", "ISO 8601 timestamp"],
                ].map(([field, type, desc], i, arr) => (
                  <div
                    key={field}
                    className={`grid grid-cols-[1fr_100px_1fr] gap-3 px-4 py-2 text-[11px] font-mono ${i < arr.length - 1 ? "border-b" : ""}`}
                    style={{ borderColor: "var(--border)", background: field.includes(".") ? "var(--bg)" : "var(--bg-elevated)" }}
                  >
                    <span style={{ color: "var(--text-primary)", paddingLeft: field.split(".").length > 2 ? "24px" : field.includes(".") ? "12px" : "0" }}>
                      {field.split(".").pop()}
                    </span>
                    <span style={{ color: "var(--text-tertiary)" }}>{type}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{desc}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Example Response
              </h3>
              <CodeBlock lang="json">{`{
  "id": "rpt_1709834567_a1b2c3",
  "report": {
    "area": "Shoreditch, London",
    "intent": "business",
    "areaiq_score": 74,
    "sub_scores": [
      {
        "label": "Foot Traffic & Demand",
        "score": 82,
        "weight": 30,
        "summary": "45,000 daily commuters via Liverpool Street station. 23 restaurants within 500m suggests strong baseline footfall."
      },
      {
        "label": "Competition Landscape",
        "score": 68,
        "weight": 20,
        "summary": "High density of similar businesses in EC2A. 12 direct competitors identified within 1km radius."
      },
      {
        "label": "Transport Accessibility",
        "score": 79,
        "weight": 15,
        "summary": "4 tube/rail stations within 15-minute walk. Bus routes along Old Street and Shoreditch High Street."
      },
      {
        "label": "Spending Power",
        "score": 71,
        "weight": 20,
        "summary": "IMD decile 6 for income. Mixed demographic with high disposable income among tech workers."
      },
      {
        "label": "Operating Costs",
        "score": 62,
        "weight": 15,
        "summary": "Commercial rents averaging £55-70/sqft. Above London average but justified by footfall density."
      }
    ],
    "summary": "Shoreditch scores 74/100 for business viability. Strong foot traffic and transport links offset higher operating costs. The area's tech-driven economy creates consistent demand.",
    "sections": [
      {
        "title": "Location & Demographics",
        "content": "Shoreditch sits within the London Borough of Hackney...",
        "data_points": [
          { "label": "Ward", "value": "Hoxton East & Shoreditch" },
          { "label": "Constituency", "value": "Hackney South and Shoreditch" },
          { "label": "IMD Decile", "value": "6 (mid-range)" }
        ]
      },
      {
        "title": "Safety & Crime",
        "content": "276 crimes recorded in the last 3 months within 1 mile...",
        "data_points": [
          { "label": "Total crimes (3 months)", "value": "276" },
          { "label": "Most common", "value": "Theft (34%)" },
          { "label": "Trend", "value": "Stable" }
        ]
      }
    ],
    "recommendations": [
      "Consider locations east of Shoreditch High Street for 15-20% lower rents with comparable footfall",
      "Target the lunch trade: 45,000 weekday commuters create peak demand 12:00-14:00",
      "Monitor the Bishopsgate Goodsyard redevelopment for potential uplift in foot traffic by 2027"
    ],
    "data_sources": [
      "postcodes.io",
      "police.uk",
      "IMD 2019",
      "OpenStreetMap",
      "Environment Agency"
    ],
    "generated_at": "2026-03-07T12:34:56.789Z"
  }
}`}</CodeBlock>
            </Section>

            {/* Errors */}
            <Section id="errors" title="Error Handling">
              <p className="text-[13px] mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Errors return a JSON object with an <code className="text-[12px] font-mono px-1 py-0.5" style={{ background: "var(--bg-active)", color: "var(--text-primary)" }}>error</code> field
                describing the issue.
              </p>

              <div className="border mb-4" style={{ borderColor: "var(--border)" }}>
                <div
                  className="grid grid-cols-[60px_150px_1fr] gap-3 px-4 py-2 border-b text-[9px] font-mono uppercase tracking-wider"
                  style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}
                >
                  <span>Code</span><span>Status</span><span>Description</span>
                </div>
                {[
                  ["200", "OK", "Report generated successfully", "var(--neon-green)"],
                  ["400", "Bad Request", "Missing or invalid area/intent field", "var(--neon-amber)"],
                  ["401", "Unauthorized", "Missing, invalid, or revoked API key", "var(--neon-red)"],
                  ["403", "Forbidden", "Active Business plan subscription required", "var(--neon-red)"],
                  ["500", "Server Error", "Internal error. Retry or contact support", "var(--neon-red)"],
                ].map(([code, status, desc, color], i, arr) => (
                  <div
                    key={code}
                    className={`grid grid-cols-[60px_150px_1fr] gap-3 px-4 py-2.5 text-[12px] font-mono ${i < arr.length - 1 ? "border-b" : ""}`}
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span style={{ color }}>{code}</span>
                    <span style={{ color: "var(--text-primary)" }}>{status}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{desc}</span>
                  </div>
                ))}
              </div>

              <CodeBlock lang="json">{`// Error response format
{
  "error": "Missing required field: area (string)"
}`}</CodeBlock>
            </Section>

            {/* Data Sources */}
            <Section id="data-sources" title="Data Sources">
              <p className="text-[13px] mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Every report is grounded in real UK government and open data, fetched live for each request.
                No cached or estimated data.
              </p>
              <div className="border" style={{ borderColor: "var(--border)" }}>
                {[
                  {
                    name: "postcodes.io",
                    provider: "ONS / Royal Mail",
                    data: "Geocoding, ward, LSOA, constituency, region, country",
                  },
                  {
                    name: "police.uk",
                    provider: "Home Office",
                    data: "Street-level crime data, 3-month rolling window, category breakdown, trends",
                  },
                  {
                    name: "IMD 2019",
                    provider: "MHCLG via ONS ArcGIS",
                    data: "Index of Multiple Deprivation: rank and decile by LSOA",
                  },
                  {
                    name: "OpenStreetMap",
                    provider: "Overpass API",
                    data: "Schools, restaurants, pubs, healthcare, shops, parks, transport stops within radius",
                  },
                  {
                    name: "Environment Agency",
                    provider: "Defra",
                    data: "Flood risk zones, active flood warnings and alerts",
                  },
                ].map((source, i, arr) => (
                  <div
                    key={source.name}
                    className={`grid grid-cols-[130px_130px_1fr] gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b" : ""}`}
                    style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "var(--bg)" : "var(--bg-elevated)" }}
                  >
                    <span className="text-[12px] font-mono font-medium" style={{ color: "var(--neon-green)" }}>
                      {source.name}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                      {source.provider}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      {source.data}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Rate Limits */}
            <Section id="rate-limits" title="Rate Limits">
              <div className="border mb-4" style={{ borderColor: "var(--border)" }}>
                <div
                  className="grid grid-cols-[1fr_1fr_1fr] gap-3 px-4 py-2 border-b text-[9px] font-mono uppercase tracking-wider"
                  style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}
                >
                  <span>Limit</span><span>Value</span><span>Window</span>
                </div>
                {[
                  ["Monthly reports", "300", "Calendar month (resets 1st)"],
                  ["Response time", "10–20s", "Per request (live data fetch + AI)"],
                  ["Concurrent requests", "Supported", "No hard limit"],
                ].map(([limit, value, window], i, arr) => (
                  <div
                    key={limit}
                    className={`grid grid-cols-[1fr_1fr_1fr] gap-3 px-4 py-2.5 text-[12px] font-mono ${i < arr.length - 1 ? "border-b" : ""}`}
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span style={{ color: "var(--text-primary)" }}>{limit}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{value}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>{window}</span>
                  </div>
                ))}
              </div>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                Need higher volume? Contact <span style={{ color: "var(--text-secondary)" }}>hello@area-iq.co.uk</span> for custom enterprise limits.
              </p>
            </Section>

            {/* SDKs */}
            <Section id="sdks" title="Code Examples">
              <p className="text-[13px] mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                The API returns standard JSON over HTTPS. No SDK required, use any HTTP client.
              </p>

              <h3 className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>cURL</h3>
              <CodeBlock lang="bash">{`curl -X POST https://www.area-iq.co.uk/api/v1/report \\
  -H "Authorization: Bearer aiq_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "area": "Shoreditch",
    "intent": "business"
  }'`}</CodeBlock>

              <h3 className="text-[13px] font-semibold mt-6 mb-2" style={{ color: "var(--text-primary)" }}>Node.js / TypeScript</h3>
              <CodeBlock lang="typescript">{`const response = await fetch("https://www.area-iq.co.uk/api/v1/report", {
  method: "POST",
  headers: {
    "Authorization": "Bearer aiq_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    area: "Camden",
    intent: "investing",
  }),
});

const { id, report } = await response.json();

console.log(report.areaiq_score);       // 72
console.log(report.sub_scores.length);  // 5
console.log(report.recommendations);    // ["Consider...", ...]`}</CodeBlock>

              <h3 className="text-[13px] font-semibold mt-6 mb-2" style={{ color: "var(--text-primary)" }}>Python</h3>
              <CodeBlock lang="python">{`import requests

response = requests.post(
    "https://www.area-iq.co.uk/api/v1/report",
    headers={"Authorization": "Bearer aiq_your_api_key"},
    json={"area": "Camden", "intent": "investing"},
)

data = response.json()
report = data["report"]

print(f"Score: {report['areaiq_score']}/100")
print(f"Dimensions: {len(report['sub_scores'])}")

for sub in report["sub_scores"]:
    print(f"  {sub['label']}: {sub['score']}/100 (weight: {sub['weight']}%)")`}</CodeBlock>

              <h3 className="text-[13px] font-semibold mt-6 mb-2" style={{ color: "var(--text-primary)" }}>Go</h3>
              <CodeBlock lang="go">{`payload := map[string]string{
    "area":   "Manchester",
    "intent": "moving",
}

body, _ := json.Marshal(payload)
req, _ := http.NewRequest("POST", "https://www.area-iq.co.uk/api/v1/report", bytes.NewBuffer(body))
req.Header.Set("Authorization", "Bearer aiq_your_api_key")
req.Header.Set("Content-Type", "application/json")

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()

var result map[string]interface{}
json.NewDecoder(resp.Body).Decode(&result)`}</CodeBlock>
            </Section>

          </div>
        </div>
      </main>

      <Footer maxWidth="1100px" />
    </div>
  );
}
