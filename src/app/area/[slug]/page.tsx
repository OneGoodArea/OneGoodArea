import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { AreaData } from "@/data/area-types";
import areasJson from "@/data/areas.json";
import AreaClient from "@/app/design-v2/area/[slug]/client";

const AREAS = areasJson as Record<string, AreaData>;

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return Object.keys(AREAS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) return { title: "Area Not Found | OneGoodArea" };

  const title = `${area.name} Area Intelligence | Score: ${area.overallScore}/100 | OneGoodArea`;
  const description = `${area.name} scores ${area.overallScore}/100 on OneGoodArea. Safety, transport, schools, amenities, cost of living, and green space, all scored and explained.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.area-iq.co.uk/area/${slug}`,
      images: [{ url: `/area/${slug}/opengraph-image`, width: 1200, height: 630, alt: `${area.name} Area Intelligence` }],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `https://www.area-iq.co.uk/area/${slug}` },
  };
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) notFound();

  const related = Object.entries(AREAS)
    .filter(([s]) => s !== slug)
    .slice(0, 8)
    .map(([s, a]) => ({ slug: s, name: a.name, overallScore: a.overallScore }));

  return <AreaClient slug={slug} area={area} related={related} />;
}
