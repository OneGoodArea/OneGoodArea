import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { AreaData } from "@/data/area-types";
import areasJson from "@/data/areas.json";
import AreaClient from "./client";

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
  if (!area) return { title: "Area not found | OneGoodArea (Design V2)", robots: { index: false, follow: false } };
  return {
    title: `${area.name} | OneGoodArea (Design V2)`,
    description: `Design V2 preview: ${area.name} scores ${area.overallScore}/100 on OneGoodArea.`,
    robots: { index: false, follow: false },
  };
}

export default async function DesignV2AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) notFound();

  const relatedEntries = Object.entries(AREAS)
    .filter(([s]) => s !== slug)
    .slice(0, 8)
    .map(([s, a]) => ({ slug: s, name: a.name, overallScore: a.overallScore }));

  return <AreaClient slug={slug} area={area} related={relatedEntries} />;
}
