import Link from "next/link";

/* "Also serving" strip (Plan 064). The homepage is PropTech-implicit, so the
   old five-ICP tabbed band is reduced to a compact strip: the other buyer
   types stay discoverable and SEO-linked, but without equal billing on the
   front door. Each card links to its tailored /for/* page, where the pitch
   (and CTA motion) is specific to that ICP. */

const ALSO: { label: string; blurb: string; slug: string }[] = [
  {
    label: "Lenders",
    blurb: "Versioned, auditable area scoring your model-risk team can defend.",
    slug: "lenders",
  },
  {
    label: "Insurers",
    blurb: "Peril-relevant area signals and portfolio drift alerts.",
    slug: "insurance",
  },
  {
    label: "Site selection",
    blurb: "Rank and compare catchments across the UK in one call.",
    slug: "cre",
  },
  {
    label: "Public sector",
    blurb: "Defensible, sourced metrics that survive procurement and FOI.",
    slug: "public-sector",
  },
];

export function BuiltForSection() {
  return (
    <section className="oga-built">
      <div className="oga-built__field" aria-hidden />

      <div className="oga-built__inner">
        <header className="oga-built__header">
          <div className="oga-built__eyebrow">
            <span className="oga-built__eyebrow-num">02</span>
            <span className="oga-built__eyebrow-line" aria-hidden />
            <span>Also serving</span>
          </div>
          <h2 className="oga-built__title">Built for more than property.</h2>
        </header>

        <div className="oga-built__also">
          {ALSO.map((a) => (
            <Link key={a.slug} href={`/for/${a.slug}`} className="oga-built__also-card">
              <span className="oga-built__also-label">{a.label}</span>
              <span className="oga-built__also-blurb">{a.blurb}</span>
              <span className="oga-built__also-arrow" aria-hidden>
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
