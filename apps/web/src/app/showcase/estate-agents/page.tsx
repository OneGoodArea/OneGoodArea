import Link from "next/link";
import { getSignals, getScores, ApiError } from "@/lib/showcase/api";
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
    <main className="min-h-screen bg-[#09090b]">
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-[#e4e4e8] mb-2">Estate Agent Workflow</h1>
        <p className="text-[#8a8a96] mb-8">
          {postcode
            ? `Live data for ${postcode} — real signals from the API.`
            : "Enter a UK postcode to see live area intelligence signals."}
        </p>

        <div className="rounded-lg border border-[#1c1c22] bg-[#0f0f12] p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#e4e4e8] mb-2">Signals</h3>
          <p className="text-sm text-[#8a8a96] mb-4">Area intelligence signals per LSOA</p>
          <ShowcaseSignals initialSignals={signals} initialPostcode={postcode} apiError={apiError} />
        </div>

        <div className="rounded-lg border border-[#1c1c22] bg-[#0f0f12] p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#e4e4e8] mb-2">Scoring</h3>
          <p className="text-sm text-[#8a8a96] mb-4">Interactive seven-category weight sliders with instant recalculation</p>
          <ShowcaseScoring postcode={postcode} initialResult={initialResult ?? undefined} apiError={apiError} />
        </div>

        <div className="mt-8 pt-6 border-t border-[#1c1c22]">
          <Link href="/" className="text-sm text-blue-400 hover:underline">
            &larr; Back to homepage
          </Link>
        </div>
      </section>
    </main>
  );
}
