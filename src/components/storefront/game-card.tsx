import Link from "next/link";
import { ArrowUpRight, Gamepad2 } from "lucide-react";

type GameCardData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  categories: { id: string; name: string; slug: string }[];
  _count: { listings: number };
};

const gameColors = [
  "from-blue-600/30 via-indigo-500/15 to-slate-950",
  "from-violet-600/30 via-fuchsia-500/15 to-slate-950",
  "from-emerald-600/30 via-teal-500/15 to-slate-950",
  "from-orange-600/30 via-rose-500/15 to-slate-950",
];

export function GameCard({ game, index = 0 }: { game: GameCardData; index?: number }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="group relative flex min-h-64 flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-card p-5 transition hover:-translate-y-1 hover:border-cyan-300/30"
    >
      {game.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.coverImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-65 transition duration-500 group-hover:scale-105 group-hover:opacity-80"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gameColors[index % gameColors.length]}`}>
          <div className="absolute -right-10 -top-12 h-52 w-52 rounded-full border border-white/[0.08]" />
          <div className="absolute -right-3 top-[-1.5rem] h-40 w-40 rounded-full border border-white/[0.08]" />
          <Gamepad2 className="absolute right-6 top-8 h-20 w-20 rotate-[-12deg] text-white/[0.12]" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/45 to-transparent" />
      {game.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={game.logoUrl} alt="" className="absolute left-5 top-5 h-10 max-w-28 object-contain object-left" />
      )}
      <div className="relative">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/80">
          {game._count.listings.toLocaleString()} active offers
        </span>
        <h3 className="mt-2 font-display text-2xl font-semibold text-white">{game.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-300">
          {game.description || "Explore accounts, items, and services."}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {game.categories.slice(0, 3).map((category) => (
              <span key={category.id} className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-200">
                {category.name}
              </span>
            ))}
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-cyan-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  );
}
