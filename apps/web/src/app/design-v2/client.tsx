"use client";

import { Styles } from "./_shared/styles";
import { Nav } from "./_shared/nav";
import { Footer } from "./_shared/footer";
import { HeroPlotted } from "./_shared/hero-plotted";
import { BuiltForSection } from "./_shared/built-for-section";
import { DefensibleSection } from "./_shared/defensible-section";
import { IntegrationSection } from "./_shared/integration-section";
import { CoverageSection } from "./_shared/coverage-section";
import { CtaSection } from "./_shared/cta-section";

/* OneGoodArea homepage — Brand v3 (Plotted).
   Section flow: Hero -> Built for -> Defensible -> Integration ->
   Coverage -> CTA -> Footer. Each section is a self-contained
   component under _shared. */

export default function DesignV2Client() {
  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <HeroPlotted />
      <BuiltForSection />
      <DefensibleSection />
      <IntegrationSection />
      <CoverageSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
