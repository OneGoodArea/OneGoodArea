import Link from "next/link";
import { ApiError, getScores, getSignals, getTransactions } from "@/lib/showcase/api";
import { ProptechShowcase } from "@/modules/showcase-proptech/ProptechShowcase";
import "@/modules/showcase-proptech/proptech.css";

export const dynamic = "force-dynamic";

export default async function ProptechShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ postcode?: string }>;
}) {
  const { postcode } = await searchParams;

  let signals: Awaited<ReturnType<typeof getSignals>> = [];
  let initialScore: Awaited<ReturnType<typeof getScores>> | null = null;
  let transactions: Awaited<ReturnType<typeof getTransactions>> | null = null;
  let apiError: ApiError | null = null;

  if (postcode) {
    try {
      const [sig, score] = await Promise.all([
        getSignals(postcode),
        getScores(postcode),
      ]);
      signals = sig;
      initialScore = score;
    } catch (err) {
      apiError = err instanceof ApiError ? err : null;
      signals = [];
      initialScore = null;
    }
    /* Transactions can legitimately 404 when a valid postcode has no sales
       in the window; signals/scores should still render. */
    try {
      transactions = await getTransactions(postcode);
    } catch {
      transactions = null;
    }
  }

  return (
    <main className="prx-root min-h-screen">
      <header className="prx-header">
        <div className="prx-header__inner">
          <Link href="/" className="prx-header__brand">
            OneGoodArea
          </Link>
          <nav className="prx-header__nav">
            <Link href="/" className="prx-header__link">
              Homepage
            </Link>
            <Link href="/showcase/proptech" className="prx-header__link prx-header__link--active">
              PropTech
            </Link>
            <Link href="/playground" className="prx-header__link">
              Playground
            </Link>
          </nav>
        </div>
      </header>

      <section className="prx-hero">
        <span className="prx-hero__eyebrow">Area intelligence for the places you build</span>
        <h1 className="prx-hero__h1">
          Every listing, street and scheme,
          <br />
          with the area already explained.
        </h1>
        <p className="prx-hero__lead">
          Source-backed schools, crime, prices, transport and score for any UK postcode.
        </p>
      </section>

      {apiError ? (
        <div className="prx-showcase">
          <p className="prx-scores__error">
            API error {apiError.status}: {apiError.message}
          </p>
        </div>
      ) : (
        <ProptechShowcase
          initialPostcode={postcode}
          initialSignals={signals}
          initialScore={initialScore}
          initialTransactions={transactions}
        />
      )}
    </main>
  );
}
