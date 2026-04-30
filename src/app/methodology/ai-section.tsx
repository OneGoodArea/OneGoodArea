import { Section } from "./section";

export function AiSection() {
  return (
    <Section id="ai-role" title="What AI Does (and Does Not Do)">
      <div
        className="border mb-6"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="px-5 py-3 border-b"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          <div
            className="text-[9px] font-mono uppercase tracking-wider"
            style={{ color: "var(--neon-green)" }}
          >
            The Pipeline
          </div>
        </div>
        <div
          className="grid grid-cols-1 sm:grid-cols-4 gap-px"
          style={{ background: "var(--border)" }}
        >
          {[
            {
              step: "1",
              title: "Fetch Data",
              desc: "7 APIs queried in parallel for the target location",
            },
            {
              step: "2",
              title: "Compute Scores",
              desc: "Deterministic functions produce locked 0-100 scores",
            },
            {
              step: "3",
              title: "AI Narrates",
              desc: "AI Engine receives locked scores + raw data, writes the report",
            },
            {
              step: "4",
              title: "Enforce Scores",
              desc: "Server overwrites any AI deviation with computed values",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="p-4"
              style={{ background: "var(--bg-elevated)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold"
                  style={{
                    background: "var(--neon-green-dim)",
                    color: "var(--neon-green)",
                  }}
                >
                  {item.step}
                </span>
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.title}
                </span>
              </div>
              <p
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="border"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="hidden sm:grid grid-cols-2 gap-px"
          style={{ background: "var(--border)" }}
        >
          <div
            className="px-5 py-2 text-[9px] font-mono uppercase tracking-wider"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--neon-green)",
            }}
          >
            AI Does
          </div>
          <div
            className="px-5 py-2 text-[9px] font-mono uppercase tracking-wider"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--neon-red)",
            }}
          >
            AI Does Not
          </div>
        </div>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-px"
          style={{ background: "var(--border)" }}
        >
          <div className="p-5" style={{ background: "var(--bg)" }}>
            <div
              className="sm:hidden text-[9px] font-mono uppercase tracking-wider mb-3"
              style={{ color: "var(--neon-green)" }}
            >
              AI Does
            </div>
            <div className="space-y-2">
              {[
                "Write the executive summary",
                "Author detailed analysis sections",
                "Generate actionable recommendations",
                "Interpret raw data points in context",
                "Explain what scores mean for your use case",
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
          <div className="p-5" style={{ background: "var(--bg)" }}>
            <div
              className="sm:hidden text-[9px] font-mono uppercase tracking-wider mb-3"
              style={{ color: "var(--neon-red)" }}
            >
              AI Does Not
            </div>
            <div className="space-y-2">
              {[
                "Set or modify any numerical score",
                "Choose dimension weights",
                "Invent data points or statistics",
                "Override the scoring engine",
                "Influence the overall OneGoodArea score",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 text-[12px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span
                    className="text-[10px] mt-0.5"
                    style={{ color: "var(--neon-red)" }}
                  >
                    -
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
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
          style={{ color: "var(--neon-amber)" }}
        >
          Server-Side Enforcement
        </div>
        <p
          className="text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Even if the AI model returns different numbers in its
          response, the server replaces them with the pre-computed
          scores before saving the report. The numbers you see are
          always the output of the deterministic scoring engine.
        </p>
      </div>
    </Section>
  );
}
