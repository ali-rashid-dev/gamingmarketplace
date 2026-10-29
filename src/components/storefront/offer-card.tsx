import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Star } from "lucide-react";
import {
  formatPrice,
  getOfferImage,
  type StorefrontOffer,
} from "@/lib/storefront";

const gameGradients = [
  "from-indigo-500/50 via-blue-600/30 to-slate-950",
  "from-fuchsia-500/40 via-violet-600/30 to-slate-950",
  "from-emerald-500/40 via-teal-700/30 to-slate-950",
  "from-orange-500/40 via-rose-700/30 to-slate-950",
];

export function OfferCard({
  offer,
  index = 0,
}: {
  offer: StorefrontOffer;
  index?: number;
}) {
  const image = getOfferImage(offer.images);
  return (
    <Link
      href={`/offers/${offer.id}`}
      className="group overflow-hidden rounded-2xl border border-white/[0.09] bg-[#111a2b] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:shadow-xl hover:shadow-blue-950/40"
    >
      <div className={`relative aspect-[1.55] overflow-hidden bg-gradient-to-br ${gameGradients[index % gameGradients.length]}`}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col justify-between p-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
              {offer.game.name}
            </span>
            <span className="max-w-[85%] font-display text-2xl font-semibold leading-tight text-white/90">
              {offer.category.name}
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
          {offer.category.name}
        </span>
        <span className="absolute bottom-3 right-3 rounded-lg bg-slate-950/80 px-2.5 py-1.5 text-sm font-bold text-white backdrop-blur">
          {formatPrice(offer.price, offer.currency)}
        </span>
      </div>
      <div className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-300/80">
          {offer.game.name}
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-12 font-semibold leading-6 text-white group-hover:text-cyan-100">
          {offer.title}
        </h3>
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-400">
            {offer.seller.shopName}
            {offer.seller.verifiedAt && (
              <BadgeCheck aria-label="Verified seller" className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
            )}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
            {offer._count.reviews || "New"}
            <ArrowUpRight className="ml-1 h-3.5 w-3.5 text-slate-500 transition group-hover:text-cyan-300" />
          </span>
        </div>
      </div>
    </Link>
  );
}
