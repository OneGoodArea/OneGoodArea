import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation — AreaIQ",
  description: "Integrate area intelligence into your applications with the AreaIQ REST API.",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      className="text-[12px] font-mono p-4 overflow-x-auto leading-relaxed"
      style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
    >
      {children}
    </pre>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[16px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{title}</h2>
      {children}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      {/* Header */}
      <header className="border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[800px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              AreaIQ
            </Link>
            <span className="text-[10px] font-mono" style={{ color: "var(--border-hover)" }}>/</span>
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              API Docs
            </span>
          </div>
          <Link
            href="/pricing"
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
            style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}
          >
            Get API Access
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-[800px] w-full mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-[26px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            AreaIQ API
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Integrate UK area intelligence into your applications. Generate detailed, data-driven area reports programmatically.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] font-mono px-2 py-0.5" style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}>
              v1
            </span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              REST API &bull; JSON responses &bull; Bearer auth
            </span>
          </div>
        </div>

        <Section title="Authentication">
          <p className="text-[13px] mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            All API requests require a Bearer token. Generate API keys from your{" "}
            <Link href="/dashboard" className="underline" style={{ color: "var(--accent)" }}>dashboard</Link>{" "}
            (requires API plan at £79/mo).
          </p>
          <CodeBlock>{`Authorization: Bearer aiq_your_api_key_here`}</CodeBlock>
        </Section>

        <Section title="Base URL">
          <CodeBlock>{`https://your-domain.com/api/v1`}</CodeBlock>
        </Section>

        <Section title="Generate Report">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5" style={{ color: "var(--bg)", background: "var(--neon-green)" }}>
              POST
            </span>
            <span className="text-[13px] font-mono" style={{ color: "var(--text-primary)" }}>
              /api/v1/report
            </span>
          </div>

          <p className="text-[13px] mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Generate an area intelligence report for a UK location. Reports are powered by 5 real data sources
            and AI analysis.
          </p>

          <h3 className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Request Body</h3>
          <div className="border mb-4" style={{ borderColor: "var(--border)" }}>
            <div className="grid grid-cols-[120px_80px_1fr] gap-3 px-4 py-2 border-b text-[10px] font-mono uppercase tracking-wider" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}>
              <span>Field</span><span>Type</span><span>Description</span>
            </div>
            <div className="grid grid-cols-[120px_80px_1fr] gap-3 px-4 py-2.5 border-b text-[12px] font-mono" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--text-primary)" }}>area</span>
              <span style={{ color: "var(--text-tertiary)" }}>string</span>
              <span style={{ color: "var(--text-secondary)" }}>UK area name or postcode. E.g. &quot;Shoreditch&quot;, &quot;SW1A 1AA&quot;, &quot;Manchester&quot;</span>
            </div>
            <div className="grid grid-cols-[120px_80px_1fr] gap-3 px-4 py-2.5 text-[12px] font-mono">
              <span style={{ color: "var(--text-primary)" }}>intent</span>
              <span style={{ color: "var(--text-tertiary)" }}>string</span>
              <span style={{ color: "var(--text-secondary)" }}>One of: <code style={{ color: "var(--accent)" }}>moving</code>, <code style={{ color: "var(--accent)" }}>business</code>, <code style={{ color: "var(--accent)" }}>investing</code>, <code style={{ color: "var(--accent)" }}>research</code></span>
            </div>
          </div>

          <h3 className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Example Request</h3>
          <CodeBlock>{`curl -X POST https://your-domain.com/api/v1/report \\
  -H "Authorization: Bearer aiq_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "area": "Shoreditch",
    "intent": "business"
  }'`}</CodeBlock>

          <h3 className="text-[13px] font-semibold mt-4 mb-2" style={{ color: "var(--text-primary)" }}>Example Response</h3>
          <CodeBlock>{`{
  "id": "rpt_1709834567_a1b2c3",
  "report": {
    "area": "Shoreditch",
    "intent": "business",
    "areaiq_score": 74,
    "sub_scores": [
      {
        "label": "Foot Traffic & Demand",
        "score": 82,
        "weight": 30,
        "summary": "45,000 daily commuters through Liverpool Street..."
      },
      ...
    ],
    "summary": "Shoreditch offers strong commercial potential...",
    "sections": [...],
    "recommendations": [...],
    "data_sources": ["postcodes.io", "police.uk", "IMD 2019", "OpenStreetMap", "Environment Agency"],
    "generated_at": "2026-03-07T12:00:00.000Z"
  }
}`}</CodeBlock>
        </Section>

        <Section title="Response Fields">
          <div className="border" style={{ borderColor: "var(--border)" }}>
            {[
              ["areaiq_score", "number", "Overall weighted score (0-100)"],
              ["sub_scores", "array", "5 intent-specific dimensions with score, weight, and summary"],
              ["summary", "string", "2-3 sentence executive summary"],
              ["sections", "array", "4-6 detailed analysis sections with data_points"],
              ["recommendations", "array", "3+ actionable recommendations"],
              ["data_sources", "array", "Real data sources used in this report"],
            ].map(([field, type, desc], i) => (
              <div key={field} className={`grid grid-cols-[140px_80px_1fr] gap-3 px-4 py-2.5 text-[12px] font-mono ${i < 5 ? "border-b" : ""}`} style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--text-primary)" }}>{field}</span>
                <span style={{ color: "var(--text-tertiary)" }}>{type}</span>
                <span style={{ color: "var(--text-secondary)" }}>{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Error Codes">
          <div className="border" style={{ borderColor: "var(--border)" }}>
            {[
              ["401", "Invalid or missing API key"],
              ["403", "API plan required"],
              ["400", "Invalid request body (missing area or invalid intent)"],
              ["500", "Internal server error"],
            ].map(([code, desc], i) => (
              <div key={code} className={`grid grid-cols-[80px_1fr] gap-3 px-4 py-2.5 text-[12px] font-mono ${i < 3 ? "border-b" : ""}`} style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--neon-red)" }}>{code}</span>
                <span style={{ color: "var(--text-secondary)" }}>{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Data Sources">
          <p className="text-[13px] mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Reports are grounded in real UK government and open data, fetched live for each request:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ["postcodes.io", "Geocoding, ward, LSOA, constituency"],
              ["police.uk", "Street-level crime data, 3-month trends"],
              ["IMD 2019", "Deprivation rank and decile by LSOA"],
              ["OpenStreetMap", "Schools, restaurants, healthcare, transport"],
              ["Environment Agency", "Flood risk areas and active warnings"],
            ].map(([name, desc]) => (
              <div key={name} className="border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
                <div className="text-[11px] font-mono font-medium" style={{ color: "var(--neon-green)" }}>{name}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Rate Limits">
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            API plan includes unlimited report generation. Each report takes 10-20 seconds to generate
            due to real-time data fetching and AI analysis. Concurrent requests are supported.
          </p>
        </Section>

        <Section title="SDKs & Integration">
          <p className="text-[13px] mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            The API returns standard JSON over HTTPS. Use any HTTP client:
          </p>

          <h3 className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Node.js / TypeScript</h3>
          <CodeBlock>{`const response = await fetch("https://your-domain.com/api/v1/report", {
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
console.log(report.areaiq_score); // 72`}</CodeBlock>

          <h3 className="text-[13px] font-semibold mt-4 mb-2" style={{ color: "var(--text-primary)" }}>Python</h3>
          <CodeBlock>{`import requests

response = requests.post(
    "https://your-domain.com/api/v1/report",
    headers={"Authorization": "Bearer aiq_your_api_key"},
    json={"area": "Camden", "intent": "investing"},
)

data = response.json()
print(data["report"]["areaiq_score"])  # 72`}</CodeBlock>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[800px] mx-auto px-6 h-10 flex items-center justify-between">
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>AreaIQ</span>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>Area intelligence, instantly.</span>
        </div>
      </footer>
    </div>
  );
}
