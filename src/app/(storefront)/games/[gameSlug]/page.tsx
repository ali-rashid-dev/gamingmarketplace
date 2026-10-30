import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gamepad2 } from "lucide-react";
import { OfferCard } from "@/components/storefront/offer-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import { getGameBySlug, getOffers } from "@/lib/storefront";

type Props = { params: Promise<{ gameSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gameSlug } = await params;
  const game = await getGameBySlug(gameSlug);
  return {
    title: game.seoTitle || `${game.name} Marketplace | GameTrade`,
    description:
      game.seoDescription ||
      game.description ||
      `Explore ${game.name} accounts, items, currency, and services on GameTrade.`,
  };
}

export default async function GameLandingPage({ params }: Props) {
  const { gameSlug } = await params;
  const game = await getGameBySlug(gameSlug);
  const offers = await getOffers("recent", 8, { gameId: game.id });

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-500">
        <Link href="/games" className="hover:text-cyan-200">Games</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">{game.name}</span>
      </nav>

      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/10 bg-card p-7 sm:p-10">
        {game.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.coverImageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" />
        ) : (
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_10%,rgba(59,130,246,0.28),transparent_40%),linear-gradient(120deg,#101827,#10172a)]" />
        )}
        {game.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.logoUrl} alt="" className="mb-5 h-12 max-w-40 object-contain object-left" />
        )}
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Game marketplace</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white sm:text-5xl">{game.name}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
          {game.description || `Find ${game.name} accounts, items, services, and more from marketplace sellers.`}
        </p>
      </section>

      <section className="mt-12">
        <SectionHeading eyebrow="Browse by product" title={`${game.name} categories`} />
        {game.categories.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {game.categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/games/${game.slug}/${category.slug}`}
                className="group rounded-2xl border border-white/[0.09] bg-card p-5 transition hover:border-cyan-300/30 hover:bg-secondary"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${index % 2 ? "bg-indigo-400/10 text-indigo-200" : "bg-cyan-300/10 text-cyan-200"}`}>
                    <Gamepad2 className="h-5 w-5" />
                  </span>
                  <span className="text-xs text-slate-500">{category._count.listings} offers</span>
                </span>
                <h2 className="mt-4 font-display text-xl font-semibold text-white">{category.name}</h2>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{category.type}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
                  Browse category <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
            Categories for this game are coming soon.
          </p>
        )}
      </section>

      <section className="mt-14">
        <SectionHeading eyebrow="Live marketplace" title={`Latest ${game.name} offers`} />
        {offers.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {offers.map((offer, index) => <OfferCard key={offer.id} offer={offer} index={index} />)}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
            There are no active offers for {game.name} yet. Check back soon.
          </p>
        )}
      </section>
    </main>
  );
}
