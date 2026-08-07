import Link from "next/link";

export default function Loading() {
  return (
    <main className="prx-root prx-loading min-h-screen">
      <header className="prx-header">
        <div className="prx-header__inner">
          <Link href="/" className="prx-header__brand">
            OneGoodArea
          </Link>
          <nav className="prx-header__nav">
            <Link href="/" className="prx-header__link">
              Homepage
            </Link>
            <span className="prx-header__link prx-header__link--active">PropTech</span>
            <Link href="/playground" className="prx-header__link">
              Playground
            </Link>
          </nav>
        </div>
      </header>

      <section className="prx-hero" aria-hidden>
        <span className="prx-skeleton prx-skeleton--eyebrow" />
        <span className="prx-skeleton prx-skeleton--h1" />
        <span className="prx-skeleton prx-skeleton--h1 prx-skeleton--narrow" />
        <span className="prx-skeleton prx-skeleton--lead" />
      </section>

      <div className="prx-showcase" aria-hidden>
        <span className="prx-skeleton prx-skeleton--control" />
        <span className="prx-skeleton prx-skeleton--tabs" />
        <span className="prx-skeleton prx-skeleton--card" />
        <span className="prx-skeleton prx-skeleton--card" />
        <span className="prx-skeleton prx-skeleton--card prx-skeleton--wide" />
      </div>
    </main>
  );
}
