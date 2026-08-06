import Link from "next/link";
import { getSignals, getScores, ApiError } from "@/lib/showcase/api";
import { ESTATE_AGENT_INTENT_LABELS } from "@/lib/showcase/estate-agent-labels";
import ShowcaseSignals from "@/components/showcase/ShowcaseSignals";
import { ShowcaseScoring } from "@/components/showcase/ShowcaseScoring";

export const dynamic = "force-dynamic";

export default async function EstateAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ postcode?: string }>;
}) {
  const { postcode } = await searchParams;
  let signals: Awaited<ReturnType<typeof getSignals>> = [];
  let initialResult: Awaited<ReturnType<typeof getScores>> | null = null;
  let apiError: ApiError | null = null;

  if (postcode) {
    try {
      signals = await getSignals(postcode);
      initialResult = await getScores(postcode);
    } catch (err) {
      apiError = err instanceof Error && err.name === "ApiError" ? (err as ApiError) : null;
      signals = [];
      initialResult = null;
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-800 antialiased">
      <header className="border-b border-slate-100 bg-white/95 backdrop-blur supports-bg-[backdrop-filter]">
        <div className="mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-serif font-bold text-[#003087]">
            OneGoodArea
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-slate-600 hover:text-[#003087]">
              Homepage
            </Link>
            <Link href="/showcase/estate-agents" className="text-[#003087] font-medium">
              Estate Agents
            </Link>
            <Link href="/playground" className="text-slate-600 hover:text-[#003087]">
              Playground
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-slate-50 via-white to-white py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="inline-block rounded-full bg-[#003087]/5 px-4 py-1.5 text-xs font-medium text-[#003087] tracking-wider uppercase">
            Area intelligence for listing agents
          </span>
          <h1 className="mt-6 font-serif text-4xl font-extrabold text-[#003087] md:text-5xl">
            Put the area story on every listing.
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Buyers research the area before they ask. Surface schools, crime, prices
            and transport on every brochure with a single call — the same defensible
            data trusted by valuation teams, listing portals and agent CRMs.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/playground"
              className="inline-flex items-center justify-center rounded bg-[#E3000F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#B9000F] transition"
            >
              Try in the playground
              <span aria-hidden className="ml-2">→</span>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center rounded border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-baseline justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#003087]">Area signals</h2>
              <p className="mt-1 text-sm text-slate-500">
                Live, source-backed area intelligence per LSOA
              </p>
            </div>
            {postcode && (
              <span className="rounded-full bg-[#003087]/5 px-3 py-1 text-xs font-medium text-[#003087]">
                {postcode}
              </span>
            )}
          </div>
          <ShowcaseSignals initialSignals={signals} initialPostcode={postcode} apiError={apiError} />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="font-serif text-2xl font-bold text-[#003087]">Area score</h2>
            <p className="mt-1 text-sm text-slate-500">
              One headline number per postcode, with the weighting you choose
            </p>
          </div>
          <ShowcaseScoring
            postcode={postcode}
            initialResult={initialResult ?? undefined}
            apiError={apiError}
            intentLabels={ESTATE_AGENT_INTENT_LABELS}
          />
        </div>
      </section>
    </main>
  );
}
