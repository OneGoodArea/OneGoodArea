import { jsPDF } from "jspdf";
import { AreaReport } from "@/lib/types";

/* OneGoodArea brand palette in PDF colour space.
   bg = cream surface, ink = forest green, signal = chartreuse,
   border = hairline. RAG = forest, dark amber, dark red. */
const COLORS = {
  bg:           [246, 249, 244] as [number, number, number], // #F6F9F4 cream
  bgElevated:   [240, 243, 238] as [number, number, number], // #F0F3EE
  border:       [228, 234, 227] as [number, number, number], // #E4EAE3
  ink:          [10,  77,  58 ] as [number, number, number], // #0A4D3A forest
  inkDeep:      [6,   42,  30 ] as [number, number, number], // #062A1E
  textPrimary:  [11,  32,  24 ] as [number, number, number], // #0B2018
  textSecondary:[68,  90,  81 ] as [number, number, number], // #445A51
  textTertiary: [110, 130, 120] as [number, number, number], // #6E8278
  signal:       [212, 243, 58 ] as [number, number, number], // #D4F33A chartreuse
  signalInk:    [26,  38,  0  ] as [number, number, number], // #1A2600
  signalDim:    [233, 246, 158] as [number, number, number], // #E9F69E
  ragStrong:    [10,  77,  58 ] as [number, number, number], // forest green
  ragModerate:  [184, 134, 11 ] as [number, number, number], // dark amber
  ragWeak:      [160, 27,  0  ] as [number, number, number], // dark red
};

function getRAGColor(score: number): [number, number, number] {
  if (score >= 70) return COLORS.ragStrong;
  if (score >= 45) return COLORS.ragModerate;
  return COLORS.ragWeak;
}

function getRAGLabel(score: number): string {
  if (score >= 70) return "STRONG";
  if (score >= 45) return "MODERATE";
  return "WEAK";
}

/* ── Helpers ── */
function setColor(pdf: jsPDF, color: [number, number, number]) {
  pdf.setTextColor(color[0], color[1], color[2]);
}

function setFillColor(pdf: jsPDF, color: [number, number, number]) {
  pdf.setFillColor(color[0], color[1], color[2]);
}

function drawLine(pdf: jsPDF, y: number) {
  pdf.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  pdf.line(20, y, 190, y);
}

function checkPageBreak(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) {
    pdf.addPage();
    drawPageBg(pdf);
    drawPageFooter(pdf);
    return 20;
  }
  return y;
}

function drawPageBg(pdf: jsPDF) {
  setFillColor(pdf, COLORS.bg);
  pdf.rect(0, 0, 210, 297, "F");
}

function drawPageFooter(pdf: jsPDF) {
  pdf.setFontSize(7);
  setColor(pdf, COLORS.textTertiary);
  pdf.text("ONEGOODAREA", 20, 290);
  setColor(pdf, COLORS.ink);
  pdf.text("onegoodarea.com", 190, 290, { align: "right" });
}

/** Wrap long text into lines that fit within maxWidth */
function wrapText(pdf: jsPDF, text: string, maxWidth: number): string[] {
  return pdf.splitTextToSize(text, maxWidth);
}

/* ── Main Export ── */
export function exportReportPDF(report: AreaReport) {
  const pdf = new jsPDF("p", "mm", "a4");
  pdf.setFont("helvetica");
  let y = 0;

  // ── Page 1 Background ──
  drawPageBg(pdf);

  // ── Header Bar ──
  setFillColor(pdf, COLORS.bgElevated);
  pdf.rect(0, 0, 210, 40, "F");

  // OneGoodArea wordmark (italic accent on "Good" simulated by colour shift)
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  setColor(pdf, COLORS.inkDeep);
  pdf.text("One", 20, 18);
  const onew = pdf.getTextWidth("One");
  pdf.setFont("helvetica", "bolditalic");
  setColor(pdf, COLORS.ink);
  pdf.text("Good", 20 + onew, 18);
  const goodw = pdf.getTextWidth("Good");
  pdf.setFont("helvetica", "bold");
  setColor(pdf, COLORS.inkDeep);
  pdf.text("Area", 20 + onew + goodw, 18);
  // Chartreuse underline under "Good"
  setFillColor(pdf, COLORS.signal);
  pdf.rect(20 + onew, 19.5, goodw, 0.7, "F");

  // Intent + area type badges
  pdf.setFontSize(8);
  const intentText = report.intent.toUpperCase();
  const areaTypeText = report.area_type ? report.area_type.toUpperCase() : "";
  let badgeX = 190;

  // Intent badge (chartreuse pill)
  const intentBadgeW = pdf.getTextWidth(intentText) + 8;
  badgeX -= intentBadgeW;
  setFillColor(pdf, COLORS.signal);
  pdf.roundedRect(badgeX, 11, intentBadgeW, 10, 1, 1, "F");
  setColor(pdf, COLORS.signalInk);
  pdf.text(intentText, badgeX + 4, 17.5);

  // Area type badge (hairline ghost)
  if (areaTypeText) {
    const areaTypeBadgeW = pdf.getTextWidth(areaTypeText) + 8;
    badgeX -= areaTypeBadgeW + 3;
    setFillColor(pdf, COLORS.bg);
    pdf.roundedRect(badgeX, 11, areaTypeBadgeW, 10, 1, 1, "FD");
    setColor(pdf, COLORS.textSecondary);
    pdf.text(areaTypeText, badgeX + 4, 17.5);
  }

  // Subtitle
  pdf.setFontSize(8);
  setColor(pdf, COLORS.textTertiary);
  pdf.text("Intelligence Report", 20, 26);
  pdf.text(new Date(report.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), 20, 32);

  // Score badge in header
  const scoreColor = getRAGColor(report.areaiq_score);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  setColor(pdf, scoreColor);
  pdf.text(String(report.areaiq_score), 190, 30, { align: "right" });
  pdf.setFontSize(7);
  pdf.text(`/100  ${getRAGLabel(report.areaiq_score)}`, 190, 35, { align: "right" });

  y = 48;

  // ── Area Name ──
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  setColor(pdf, COLORS.textPrimary);
  pdf.text(report.area, 20, y);
  y += 8;

  // ── Summary ──
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  setColor(pdf, COLORS.textSecondary);
  const summaryLines = wrapText(pdf, report.summary, 170);
  for (const line of summaryLines) {
    y = checkPageBreak(pdf, y, 5);
    pdf.text(line, 20, y);
    y += 4.5;
  }
  y += 4;

  // ── Dimension Scores ──
  drawLine(pdf, y);
  y += 6;
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  setColor(pdf, COLORS.textTertiary);
  pdf.text("DIMENSION BREAKDOWN", 20, y);
  y += 6;

  for (const sub of report.sub_scores) {
    y = checkPageBreak(pdf, y, 20);
    const dimColor = getRAGColor(sub.score);

    // Label + weight + score
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    setColor(pdf, COLORS.textSecondary);
    pdf.text(sub.label, 20, y);

    pdf.setFontSize(7);
    setColor(pdf, COLORS.textTertiary);
    pdf.text(`${sub.weight}%`, 90, y);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    setColor(pdf, dimColor);
    pdf.text(String(sub.score), 190, y, { align: "right" });

    y += 3;

    // Score bar
    setFillColor(pdf, COLORS.border);
    pdf.rect(20, y, 140, 2, "F");
    setFillColor(pdf, dimColor);
    pdf.rect(20, y, (sub.score / 100) * 140, 2, "F");
    y += 5;

    // Summary
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    setColor(pdf, COLORS.textTertiary);
    const subLines = wrapText(pdf, sub.summary, 165);
    for (const line of subLines) {
      y = checkPageBreak(pdf, y, 4);
      pdf.text(line, 22, y);
      y += 3.5;
    }

    // Reasoning
    if (sub.reasoning) {
      pdf.setFontSize(6.5);
      setColor(pdf, [80, 80, 90]);
      const reasonLines = wrapText(pdf, `Data: ${sub.reasoning}`, 165);
      for (const line of reasonLines) {
        y = checkPageBreak(pdf, y, 4);
        pdf.text(line, 22, y);
        y += 3.2;
      }
    }

    y += 4;
  }

  // ── Property Market Panel ──
  if (report.property_data) {
    const pm = report.property_data;
    y = checkPageBreak(pdf, y, 40);
    drawLine(pdf, y);
    y += 6;

    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    setColor(pdf, COLORS.textTertiary);
    pdf.text("PROPERTY MARKET", 20, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(`HM Land Registry  |  ${pm.postcode_area}  |  ${pm.period}`, 70, y);
    y += 7;

    // Stats row
    const pmStats = [
      { label: "MEDIAN PRICE", value: `£${pm.median_price.toLocaleString()}` },
      { label: "MEAN PRICE", value: `£${pm.mean_price.toLocaleString()}` },
      { label: "TRANSACTIONS", value: String(pm.transaction_count) },
      { label: "YOY CHANGE", value: pm.price_change_pct !== null ? `${pm.price_change_pct > 0 ? "+" : ""}${pm.price_change_pct}%` : "N/A" },
    ];

    for (let i = 0; i < pmStats.length; i++) {
      const x = 20 + i * 42;
      pdf.setFontSize(6);
      setColor(pdf, COLORS.textTertiary);
      pdf.text(pmStats[i].label, x, y);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      if (pmStats[i].label === "YOY CHANGE" && pm.price_change_pct !== null) {
        setColor(pdf, pm.price_change_pct >= 0 ? COLORS.ragStrong : COLORS.ragWeak);
      } else {
        setColor(pdf, COLORS.textPrimary);
      }
      pdf.text(pmStats[i].value, x, y + 5);
      pdf.setFont("helvetica", "normal");
    }
    y += 10;

    // Property type breakdown
    if (pm.by_property_type.length > 0) {
      y += 2;
      pdf.setFontSize(6);
      setColor(pdf, COLORS.textTertiary);
      pdf.text("BY PROPERTY TYPE", 20, y);
      y += 4;

      for (const pt of pm.by_property_type) {
        y = checkPageBreak(pdf, y, 5);
        pdf.setFontSize(7.5);
        setColor(pdf, COLORS.textSecondary);
        pdf.text(pt.type, 22, y);
        pdf.setFont("helvetica", "bold");
        setColor(pdf, COLORS.textPrimary);
        pdf.text(`£${pt.median.toLocaleString()}`, 90, y);
        pdf.setFont("helvetica", "normal");
        setColor(pdf, COLORS.textTertiary);
        pdf.text(`${pt.count} sales`, 130, y);
        y += 4.5;
      }
    }

    y += 4;
  }

  // ── Schools Panel ──
  if (report.schools_data && report.schools_data.schools.length > 0) {
    const sd = report.schools_data;
    y = checkPageBreak(pdf, y, 30);
    drawLine(pdf, y);
    y += 6;

    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    setColor(pdf, COLORS.textTertiary);
    pdf.text("NEARBY SCHOOLS", 20, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${sd.inspectorate}  |  ${sd.schools.length} rated schools within 1.5km`, 62, y);
    y += 7;

    // Rating breakdown
    const breakdown = Object.entries(sd.rating_breakdown);
    if (breakdown.length > 0) {
      pdf.setFontSize(6);
      setColor(pdf, COLORS.textTertiary);
      pdf.text("RATING BREAKDOWN", 20, y);
      y += 4;

      // Stacked bar
      const barWidth = 140;
      const barX = 20;
      const total = sd.schools.length;
      let bx = barX;

      const ratingColors: Record<string, [number, number, number]> = {
        "Outstanding": COLORS.ragStrong,
        "Good": COLORS.ink,
        "Requires Improvement": COLORS.ragModerate,
        "Inadequate": COLORS.ragWeak,
      };

      for (const [rating, count] of breakdown) {
        const w = (count / total) * barWidth;
        setFillColor(pdf, ratingColors[rating] || COLORS.textTertiary);
        pdf.rect(bx, y, w, 2.5, "F");
        bx += w;
      }
      y += 5;

      // Legend
      let lx = 20;
      for (const [rating, count] of breakdown) {
        const color = ratingColors[rating] || COLORS.textTertiary;
        setFillColor(pdf, color);
        pdf.rect(lx, y - 1.5, 2, 2, "F");
        lx += 3;
        pdf.setFontSize(6);
        setColor(pdf, color);
        const label = `${count} ${rating}`;
        pdf.text(label, lx, y);
        lx += pdf.getTextWidth(label) + 5;
      }
      y += 5;
    }

    // School list
    for (const school of sd.schools) {
      y = checkPageBreak(pdf, y, 8);

      const ratingColor =
        school.rating === "Outstanding" ? COLORS.ragStrong :
        school.rating === "Good" ? COLORS.ink :
        school.rating === "Requires Improvement" ? COLORS.ragModerate :
        school.rating === "Inadequate" ? COLORS.ragWeak :
        COLORS.textTertiary;

      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "bold");
      setColor(pdf, COLORS.textPrimary);
      pdf.text(school.name, 22, y);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      setColor(pdf, COLORS.textTertiary);
      pdf.text(`${school.phase}  |  ${school.distance_km}km`, 22, y + 3.5);

      // Rating badge
      setColor(pdf, ratingColor);
      pdf.setFontSize(6.5);
      pdf.setFont("helvetica", "bold");
      pdf.text(school.rating, 186, y + 1.5, { align: "right" });
      pdf.setFont("helvetica", "normal");

      y += 9;
    }

    y += 4;
  }

  // ── Detailed Sections ──
  for (const section of report.sections) {
    y = checkPageBreak(pdf, y, 30);
    drawLine(pdf, y);
    y += 6;

    // Section title
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    setColor(pdf, COLORS.textPrimary);
    pdf.text(section.title, 20, y);
    y += 6;

    // Content
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    setColor(pdf, COLORS.textSecondary);
    const contentLines = wrapText(pdf, section.content, 170);
    for (const line of contentLines) {
      y = checkPageBreak(pdf, y, 4.5);
      pdf.text(line, 20, y);
      y += 4;
    }
    y += 2;

    // Data points
    if (section.data_points && section.data_points.length > 0) {
      y = checkPageBreak(pdf, y, section.data_points.length * 6 + 4);
      setFillColor(pdf, COLORS.bgElevated);
      const dpHeight = section.data_points.length * 6 + 4;
      pdf.rect(20, y - 2, 170, dpHeight, "F");

      for (const dp of section.data_points) {
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        setColor(pdf, COLORS.textTertiary);
        pdf.text(dp.label, 24, y + 2);
        pdf.setFont("helvetica", "bold");
        setColor(pdf, COLORS.textPrimary);
        pdf.text(dp.value, 186, y + 2, { align: "right" });
        y += 6;
      }
      y += 4;
    }

    y += 4;
  }

  // ── Recommendations ──
  if (report.recommendations && report.recommendations.length > 0) {
    y = checkPageBreak(pdf, y, 20);
    drawLine(pdf, y);
    y += 6;

    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    setColor(pdf, COLORS.textTertiary);
    pdf.text("RECOMMENDATIONS", 20, y);
    y += 6;

    for (let i = 0; i < report.recommendations.length; i++) {
      y = checkPageBreak(pdf, y, 15);

      // Number badge (chartreuse)
      setFillColor(pdf, COLORS.signal);
      pdf.rect(20, y - 3, 6, 6, "F");
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      setColor(pdf, COLORS.signalInk);
      pdf.text(String(i + 1), 23, y + 1, { align: "center" });

      // Text
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      setColor(pdf, COLORS.textSecondary);
      const recLines = wrapText(pdf, report.recommendations[i], 156);
      for (const line of recLines) {
        y = checkPageBreak(pdf, y, 4.5);
        pdf.text(line, 30, y);
        y += 4;
      }
      y += 4;
    }
  }

  // ── Methodology + per-dimension confidence ──
  const subScores = Array.isArray(report.sub_scores) ? report.sub_scores : [];
  const dimsWithConfidence = subScores.filter(
    (s) => typeof s.confidence === "number"
  );

  const aggConf = typeof report.confidence === "number" ? report.confidence : null;
  const aggConfLabel =
    aggConf === null ? null
    : aggConf >= 0.85 ? "HIGH"
    : aggConf >= 0.6 ? "MEDIUM"
    : aggConf >= 0.3 ? "LOW"
    : "NONE";

  if (report.engine_version || aggConf !== null || dimsWithConfidence.length > 0) {
    y = checkPageBreak(pdf, y, 12);
    drawLine(pdf, y);
    y += 6;
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    setColor(pdf, COLORS.textTertiary);
    pdf.text("METHODOLOGY", 20, y);
    y += 5;

    pdf.setFont("helvetica", "normal");
    setColor(pdf, COLORS.textSecondary);
    if (report.engine_version) {
      pdf.text(`Engine version: v${report.engine_version}`, 20, y);
      y += 4;
    }
    if (aggConf !== null && aggConfLabel) {
      pdf.text(`Aggregate confidence: ${aggConf.toFixed(2)} (${aggConfLabel})`, 20, y);
      y += 4;
    }

    if (dimsWithConfidence.length > 0) {
      y += 2;
      pdf.setFont("helvetica", "bold");
      setColor(pdf, COLORS.textTertiary);
      pdf.text("CONFIDENCE PER DIMENSION", 20, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      for (const d of dimsWithConfidence) {
        const conf = d.confidence as number;
        const lbl =
          conf >= 0.85 ? "HIGH"
          : conf >= 0.6 ? "MEDIUM"
          : conf >= 0.3 ? "LOW"
          : "NONE";
        const head = `${d.label}  ${conf.toFixed(2)}  ${lbl}`;
        y = checkPageBreak(pdf, y, 4);
        setColor(pdf, COLORS.textPrimary);
        pdf.text(head, 20, y);
        y += 4;
        if (d.confidence_reason) {
          const reasonLines = wrapText(pdf, d.confidence_reason, 156);
          setColor(pdf, COLORS.textTertiary);
          for (const line of reasonLines) {
            y = checkPageBreak(pdf, y, 4);
            pdf.text(line, 30, y);
            y += 3.6;
          }
        }
        y += 1;
      }
    }
    y += 2;
  }

  // ── Data Sources Footer ──
  y = checkPageBreak(pdf, y, 15);
  drawLine(pdf, y);
  y += 6;
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  setColor(pdf, COLORS.textTertiary);
  pdf.text("Sources: ", 20, y);
  if (report.data_sources) {
    setColor(pdf, COLORS.ink);
    pdf.text(report.data_sources.join("  |  "), 20 + pdf.getTextWidth("Sources: "), y);
  }

  // Page footers on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawPageFooter(pdf);
  }

  // Save
  const filename = `OneGoodArea-${report.area.replace(/[^a-zA-Z0-9]/g, "-")}-${report.intent}.pdf`;
  pdf.save(filename);
}
