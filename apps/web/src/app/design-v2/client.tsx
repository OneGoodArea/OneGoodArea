"use client";

import { Nav } from "./_shared/nav";
import { Footer } from "./_shared/footer";
import { HeroPlotted } from "./_shared/hero-plotted";
import { BuiltForSection } from "./_shared/built-for-section";
import { ProductsSection } from "./_shared/products-section";
import { IntegrationSection } from "./_shared/integration-section";
import { CoverageSection } from "./_shared/coverage-section";
import { CtaSection } from "./_shared/cta-section";

/* OneGoodArea homepage — Brand v3 (Plotted).
   Section flow: Hero -> Built for -> Defensible -> Integration ->
   Coverage -> CTA -> Footer. Each section is a self-contained
   component under _shared.

   Workstream 2 (2026-05-30): de-collided the wrapper. The old
   <div className="aiq"> applied the design-v2 forest-green token
   context as a parent to Brand v3 sections — leaking the wrong
   palette via inheritance. Replaced with .oga-root (the Brand v3
   surface defined in styles/brand/components.css). The <Styles />
   no-op import is gone too. Internal pages still wrap in .aiq
   until they migrate in Workstream 3. */

export default function DesignV2Client() {
  return (
    <div className="oga-root">
      <Nav />
      <HeroPlotted />
      <BuiltForSection />
      <ProductsSection />
      <IntegrationSection />
      <CoverageSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
