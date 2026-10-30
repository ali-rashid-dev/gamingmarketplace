import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  CircleDollarSign,
  Gamepad2,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { GameCard } from "@/components/storefront/game-card";
import { OfferCard } from "@/components/storefront/offer-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import {
  getFeaturedGames,
  getOffers,
  getOfferImage,
} from "@/lib/storefront";
import prisma from "@/lib/prisma";
import { GameStatus } from "@/generated/prisma/enums";

export default async function HomePage() {
  const [games, popularOffers, recentOffers, categories] = await Promise.all([
    getFeaturedGames(),
    getOffers("popular", 4),
    getOffers("recent", 4),
    prisma.category.findMany({
      where: {
        isActive: true,
        game: { status: GameStatus.PUBLISHED },
        listings: { some: { status: "ACTIVE", publishedAt: { not: null }, seller: { status: "APPROVED" } } },
      },
      orderBy: { listings: { _count: "desc" } },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        game: { select: { name: true, slug: true, logoUrl: true } },
      },
    }),
  ]);
  const heroOffer = popularOffers[0] ?? recentOffers[0];
  const heroImage = heroOffer ? getOfferImage(heroOffer.images) : null;

  return (
    <main>
      <section className="relative isolate overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_68%_30%,rgba(37,99,235,0.2),transparent_35%),radial-gradient(ellipse_at_20%_70%,rgba(8,145,178,0.12),transparent_38%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-xs font-semibold text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              The player-to-player marketplace
            </div>
            <h1 className="mt-6 max-w-2xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Your next
              <span className="block bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                game-changing
              </span>
              find is here.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
              Discover game accounts, rare items, top-ups, and services from sellers who know the game.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/games" className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">
                Explore games <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/offers?sort=popular" className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]">
                Browse popular offers
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-300" /> Buyer-focused protection</span>
              <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-cyan-300" /> Reviewed sellers</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 rounded-[2rem] bg-blue-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-popover p-3 shadow-2xl shadow-black/50">
              <div className="relative flex aspect-[1.15] flex-col justify-between overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-indigo-500/30 via-slate-900 to-cyan-900/40 p-6 sm:p-8">
                {heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
                ) : (
                  <div className="absolute -right-8 top-8 h-64 w-64 rounded-full border border-white/10 shadow-[0_0_100px_rgba(56,189,248,0.12)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-slate-950/10" />
                <div className="relative flex items-center justify-between">
                  <span className="rounded-full border border-white/20 bg-slate-950/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-100 backdrop-blur">
                    Player-picked finds
                  </span>
                  <Gamepad2 className="h-5 w-5 text-white/70" />
                </div>
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">
                    {heroOffer?.game.name ?? "Find your next favorite"}
                  </p>
                  <h2 className="mt-2 max-w-md font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
                    {heroOffer?.title ?? "Explore a world of game deals"}
                  </h2>
                  {heroOffer && (
                    <Link href={`/offers/${heroOffer.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-cyan-200">
                      Discover offer <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                  {!heroOffer && (
                    <Link href="/games" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-cyan-200">
                      Find a game <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-xl border border-white/10 bg-popover p-3 shadow-xl sm:flex">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-300/10 text-cyan-200"><ShieldCheck className="h-5 w-5" /></span>
              <span><strong className="block text-xs text-white">Trade with confidence</strong><small className="text-[10px] text-slate-400">Support when you need it</small></span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-5 py-16 sm:px-8">
        <section>
          <SectionHeading eyebrow="Choose your world" title="Featured games" description="Jump into the communities and titles you love." href="/games" />
          {games.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {games.slice(0, 4).map((game, index) => <GameCard key={game.id} game={game} index={index} />)}
            </div>
          ) : (
            <EmptySection title="New games are on the way" href="/games" linkText="Explore the catalog" />
          )}
        </section>

        <section>
          <SectionHeading eyebrow="Player favorites" title="Popular offers" description="Offers getting attention from the community." href="/offers?sort=popular" />
          {popularOffers.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {popularOffers.map((offer, index) => <OfferCard key={offer.id} offer={offer} index={index} />)}
            </div>
          ) : (
            <EmptySection title="Popular offers will show up here" href="/games" linkText="Browse games" />
          )}
        </section>

        <section>
          <SectionHeading eyebrow="Fresh from the community" title="Recently listed" href="/offers" />
          {recentOffers.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recentOffers.map((offer, index) => <OfferCard key={offer.id} offer={offer} index={index} />)}
            </div>
          ) : (
            <EmptySection title="Be the first to discover new offers" href="/games" linkText="Explore games" />
          )}
        </section>

        <section>
          <SectionHeading eyebrow="Find your category" title="What are you looking for?" description="Go straight to the kind of game product you want." />
          {categories.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category, index) => (
                <Link
                  key={category.id}
                  href={`/games/${category.game.slug}/${category.slug}`}
                  className="group flex items-center gap-4 rounded-2xl border border-white/[0.09] bg-card p-4 transition hover:border-cyan-300/30 hover:bg-secondary"
                >
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${index % 2 ? "bg-indigo-400/10 text-indigo-200" : "bg-cyan-300/10 text-cyan-200"}`}>
                    {index % 2 ? <PackageCheck className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-white">{category.name}</strong>
                    <small className="mt-1 block truncate text-xs text-slate-400">{category.game.name} · {category.type}</small>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-300" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptySection title="Categories will appear as games are added" href="/games" linkText="View games" />
          )}
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-cyan-200/10 bg-gradient-to-br from-patina/20 via-card to-background p-7 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">Built for better trades</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">Play more. Worry less.</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">We want every player to know what they’re buying and where to go if they need help.</p>
              <Link href="/policies#buyer-protection" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-200 hover:text-white">
                Learn about buyer protection <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TrustCard icon={<ShieldCheck className="h-5 w-5" />} title="Buyer support" body="A clear path to help if an order does not go as expected." />
              <TrustCard icon={<BadgeCheck className="h-5 w-5" />} title="Seller review" body="Seller applications are reviewed before shops are approved." />
              <TrustCard icon={<CircleDollarSign className="h-5 w-5" />} title="Clear pricing" body="See the offer price and details before you decide." />
            </div>
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="Simple by design" title="How GameTrade works" />
          <div className="grid gap-4 md:grid-cols-3">
            <StepCard number="01" title="Find your game" body="Browse published games and explore the categories that fit your play style." />
            <StepCard number="02" title="Compare offers" body="Review listing details, seller information, supported platforms, and prices." />
            <StepCard number="03" title="Trade with support" body="Create an account to continue when you’re ready. Our help center is here along the way." />
          </div>
        </section>
      </div>
    </main>
  );
}

function EmptySection({ title, href, linkText }: { title: string; href: string; linkText: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-7">
      <p className="text-sm text-slate-400">{title}</p>
      <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">
        {linkText}<ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function TrustCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-slate-950/25 p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">{icon}</span>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-400">{body}</p>
    </div>
  );
}

function StepCard({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-card p-6">
      <span className="font-display text-3xl font-bold text-cyan-300/70">{number}</span>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </div>
  );
}
