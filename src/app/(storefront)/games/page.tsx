import type { Metadata } from "next";
import { GameCard } from "@/components/storefront/game-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import { getPublishedGames } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Explore Games | GameTrade",
  description: "Browse games and discover accounts, items, top-ups, and services.",
};

type Props = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function GamesPage({ searchParams }: Props) {
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q : "";
  const games = await getPublishedGames(search);

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <SectionHeading
        eyebrow="The game directory"
        title={search ? `Games matching “${search}”` : "Explore all games"}
        description="Choose a game to see its live categories and offers."
      />
      {games.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {games.map((game, index) => <GameCard key={game.id} game={game} index={index} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-white">
            {search ? "No games match that search yet" : "The catalog is getting ready"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            {search
              ? "Try a different title or browse the full game directory."
              : "Published games will appear here as the marketplace grows."}
          </p>
        </div>
      )}
    </main>
  );
}
