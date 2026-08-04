import Link from "next/link";
import { getSignals } from "@/lib/showcase/api";
import ShowcaseSignals from "@/components/showcase/ShowcaseSignals";

export const dynamic = "force-dynamic";

export default async function ProptechPage({
  searchParams,
}: {
  searchParams: Promise<{ postcode?: string }>;
}) {
  const { postcode } = await searchParams;
  let signals: Awaited<ReturnType<typeof getSignals>> = [];

  if (postcode) {
    try {
      signals = await getSignals(postcode);
    } catch {
      signals = [];
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b]">
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-[#e4e4e8] mb-2">Proptech Workflow</h1>
        <p className="text-[#8a8a96] mb-8">
          {postcode
            ? `Live data for ${postcode} — real signals from the API.`
            : "Enter a UK postcode to see live area intelligence signals."}
        </p>

        <div className="rounded-lg border border-[#1c1c22] bg-[#0f0f12] p-6">
          <h3 className="text-lg font-semibold text-[#e4e4e8] mb-2">Signals</h3>
          <p className="text-sm text-[#8a8a96] mb-4">Area intelligence signals per LSOA</p>
          <ShowcaseSignals initialSignals={signals} initialPostcode={postcode} />
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
