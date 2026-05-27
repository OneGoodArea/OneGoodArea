interface FloodArea {
  label: string;
  riverOrSea: string;
}

interface FloodWarning {
  description: string;
  severity: string;
  severityLevel: number;
  message: string;
}

export interface FloodRiskData {
  flood_areas_nearby: number;
  rivers_at_risk: string[];
  active_warnings: FloodWarning[];
}

export async function getFloodRisk(lat: number, lng: number): Promise<FloodRiskData | null> {
  try {
    // Fetch flood risk areas and active warnings in parallel
    const [areasRes, warningsRes] = await Promise.all([
      fetch(
        `https://environment.data.gov.uk/flood-monitoring/id/floodAreas?lat=${lat}&long=${lng}&dist=3`,
        { signal: AbortSignal.timeout(10000) }
      ),
      fetch(
        `https://environment.data.gov.uk/flood-monitoring/id/floods?lat=${lat}&long=${lng}&dist=5`,
        { signal: AbortSignal.timeout(10000) }
      ),
    ]);

    let floodAreas: FloodArea[] = [];
    let activeWarnings: FloodWarning[] = [];

    if (areasRes.ok) {
      const areasData = await areasRes.json();
      floodAreas = areasData.items || [];
    }

    if (warningsRes.ok) {
      const warningsData = await warningsRes.json();
      activeWarnings = (warningsData.items || []).map(
        (w: { description?: string; severity?: string; severityLevel?: number; message?: string }) => ({
          description: w.description || "",
          severity: w.severity || "Unknown",
          severityLevel: w.severityLevel || 4,
          message: w.message || "",
        })
      );
    }

    // Extract unique rivers/water bodies
    const rivers = [
      ...new Set(
        floodAreas
          .map((a) => a.riverOrSea)
          .filter(Boolean)
      ),
    ];

    return {
      flood_areas_nearby: floodAreas.length,
      rivers_at_risk: rivers,
      active_warnings: activeWarnings,
    };
  } catch {
    return null;
  }
}

export function formatFloodRiskForPrompt(data: FloodRiskData): string {
  const lines = [
    `FLOOD RISK DATA (Source: Environment Agency):`,
    `Flood risk areas within 3km: ${data.flood_areas_nearby}`,
  ];

  if (data.rivers_at_risk.length > 0) {
    lines.push(`Water bodies posing flood risk: ${data.rivers_at_risk.join(", ")}`);
  } else {
    lines.push(`No significant flood risk water bodies identified nearby`);
  }

  if (data.active_warnings.length > 0) {
    lines.push("");
    lines.push(`ACTIVE FLOOD WARNINGS (${data.active_warnings.length}):`);
    for (const w of data.active_warnings) {
      lines.push(`  - [${w.severity}] ${w.description}`);
    }
  } else {
    lines.push(`Active flood warnings: None`);
  }

  const riskLevel =
    data.active_warnings.some((w) => w.severityLevel <= 2)
      ? "Elevated — active warnings in force"
      : data.flood_areas_nearby > 5
        ? "Moderate — multiple flood risk zones nearby"
        : data.flood_areas_nearby > 0
          ? "Low — some flood risk zones exist nearby"
          : "Very Low — no flood risk zones identified";

  lines.push(`Overall flood risk assessment: ${riskLevel}`);

  return lines.join("\n");
}
