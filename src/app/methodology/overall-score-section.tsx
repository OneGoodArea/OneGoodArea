import { Section } from "./section";

export function OverallScoreSection() {
  return (
    <Section id="overall-score" title="Overall Score">
      <p
        className="text-[13px] mb-4 leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        The OneGoodArea overall score is a weighted average of all dimension
        scores for the selected intent. Each dimension contributes
        proportionally to its internally calibrated weight. The result
        is a single 0-100 number representing how well the area suits
        your stated purpose.
      </p>

      <div
        className="border p-5 mb-4"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div
          className="text-[9px] font-mono uppercase tracking-wider mb-3"
          style={{ color: "var(--text-tertiary)" }}
        >
          How it works
        </div>
        <div className="space-y-2">
          {[
            "Each dimension is scored independently from 0 to 100",
            "Dimensions are weighted according to the selected intent",
            "The weighted scores are combined into a single overall score",
            "The same postcode with the same data always produces the same number",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 text-[12px]"
              style={{ color: "var(--text-secondary)" }}
            >
              <span
                className="text-[10px] mt-0.5"
                style={{ color: "var(--neon-green)" }}
              >
                +
              </span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function ScoreScaleSection() {
  return (
    <Section id="score-scale" title="Score Scale">
      <p
        className="text-[13px] mb-4 leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        Scores are colour-coded using a RAG (Red, Amber, Green) system
        across every report. This applies to both dimension scores and
        the overall OneGoodArea score.
      </p>

      <div
        className="border"
        style={{ borderColor: "var(--border)" }}
      >
        {[
          {
            range: "70 - 100",
            label: "Strong",
            color: "var(--neon-green)",
            colorDim: "var(--neon-green-dim)",
            desc: "The area performs well in this dimension. A strong foundation with no major concerns. For overall scores, this indicates a highly suitable location for your stated intent.",
          },
          {
            range: "45 - 69",
            label: "Moderate",
            color: "var(--neon-amber)",
            colorDim: "var(--neon-amber-dim)",
            desc: "The area is adequate but has room for improvement. Some trade-offs to consider. Worth investigating further before making decisions.",
          },
          {
            range: "0 - 44",
            label: "Weak",
            color: "var(--neon-red)",
            colorDim: "var(--neon-red-dim)",
            desc: "The area underperforms in this dimension. Significant challenges identified. Does not necessarily disqualify the area, but indicates a specific weakness worth understanding.",
          },
        ].map((tier, i, arr) => (
          <div
            key={tier.label}
            className={`px-5 py-5 ${
              i < arr.length - 1 ? "border-b" : ""
            }`}
            style={{
              borderColor: "var(--border)",
              background:
                i % 2 === 0 ? "var(--bg-elevated)" : "var(--bg)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span
                className="text-[11px] font-mono font-bold px-2 py-0.5"
                style={{ color: tier.color, background: tier.colorDim }}
              >
                {tier.range}
              </span>
              <span
                className="text-[13px] font-semibold"
                style={{ color: tier.color }}
              >
                {tier.label}
              </span>
            </div>
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {tier.desc}
            </p>
          </div>
        ))}
      </div>

      <div
        className="mt-4 p-3 border"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div
          className="text-[11px] font-mono font-semibold mb-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          A Note on Interpretation
        </div>
        <p
          className="text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          A low score in one dimension does not make an area
          unsuitable. Context matters. A business location with a low
          competition score (meaning heavy saturation) might still
          succeed with strong differentiation. Read the narrative
          sections alongside the numbers.
        </p>
      </div>
    </Section>
  );
}
