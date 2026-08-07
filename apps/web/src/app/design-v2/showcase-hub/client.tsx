"use client";

import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { ICP_ICONS } from "../_shared/icp-icons";
import "./showcase-hub.css";

const SHOWCASE_CARDS = [
  {
    icp: "estate-agents",
    title: "Estate Agents",
    blurb:
      "Schools, crime, prices and transport for any UK postcode, from one call. Put the area story buyers already research straight onto your listings.",
    status: "Live" as const,
  },
  {
    icp: "proptech",
    title: "PropTech",
    blurb:
      "Add area context to every listing. Schools, crime, prices, transport and a defensible score for any UK postcode, from one API.",
    status: "Live" as const,
  },
  {
    icp: "lenders",
    title: "Lenders",
    blurb:
      "Area scoring your model risk team can defend. Every response is stamped with the engine version that produced it.",
    status: "Soon" as const,
  },
  {
    icp: "insurance",
    title: "Insurance",
    blurb:
      "Area risk your actuary can audit, monitored continuously. Per-dimension scores with confidence, not a black box.",
    status: "Soon" as const,
  },
  {
    icp: "cre",
    title: "Commercial Real Estate",
    blurb:
      "Screen the whole UK against your site criteria in one call. Compound, multi-signal ranking across every neighbourhood.",
    status: "Soon" as const,
  },
  {
    icp: "public-sector",
    title: "Public Sector",
    blurb:
      "Area metrics that survive FOI and procurement review. Every value carries its source, release date and confidence.",
    status: "Soon" as const,
  },
] as const;

export default function ShowcaseHubClient() {
  return (
    <div className="oga-hub oga-root">
      <Nav />

      <main className="oga-hub__main">
        <section className="oga-hub__hero">
          <h1 className="oga-hub__title">Area intelligence, by workflow.</h1>
          <p className="oga-hub__subtitle">
            One API, six buyer workflows. Each card below leads to a live demo
            (where available) and a dedicated page for that use case.
          </p>
        </section>

        <section className="oga-hub__grid" aria-label="Showcase workflows by industry">
          {SHOWCASE_CARDS.map((card) => {
            const Icon = ICP_ICONS[card.icp];
            const demoHref = `/showcase/${card.icp}`;
            const forHref = `/for/${card.icp}`;

            return (
              <article key={card.icp} className="oga-hub__card">
                <div className="oga-hub__card-header">
                  <span className="oga-hub__icon" aria-hidden>
                    <Icon />
                  </span>
                  <h2 className="oga-hub__card-title">{card.title}</h2>
                </div>

                <p className="oga-hub__card-blurb">{card.blurb}</p>

                <div className="oga-hub__card-links">
                  <Link href={demoHref} className="oga-hub__card-link">
                    {card.status === "Live"
                      ? "Try the live demo"
                      : "See coming soon"}
                    <span
                      className={
                        card.status === "Live"
                          ? "oga-badge oga-badge--live"
                          : "oga-badge oga-badge--soon"
                      }
                    >
                      {card.status}
                    </span>
                  </Link>

                  <Link href={forHref} className="oga-hub__card-link oga-hub__card-link--secondary">
                    For {card.title.split(/\s+/)[0].toLowerCase()} →
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <Footer />
    </div>
  );
}
