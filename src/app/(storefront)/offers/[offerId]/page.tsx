import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { BadgeCheck, Check, ChevronRight, ShieldCheck } from "lucide-react";
import { getOfferById, getOfferImage, formatPrice } from "@/lib/storefront";
import { auth } from "@/lib/auth";

type Props = { params: Promise<{ offerId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { offerId } = await params;
  const offer = await getOfferById(offerId);
  return {
    title: `${offer.title} | GameTrade`,
    description: `${offer.title} for ${offer.game.name}. View offer details and seller information.`,
    openGraph: {
      title: `${offer.title} | GameTrade`,
      description: `${offer.title} for ${offer.game.name}.`,
      images: getOfferImage(offer.images) ? [getOfferImage(offer.images)!] : undefined,
    },
  };
}

export default async function OfferDetailPage({ params }: Props) {
  const { offerId } = await params;
  const [offer, session] = await Promise.all([
    getOfferById(offerId),
    auth.api.getSession({ headers: await headers() }),
  ]);
  const image = getOfferImage(offer.images);

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/games" className="hover:text-cyan-200">Games</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/games/${offer.game.slug}`} className="hover:text-cyan-200">{offer.game.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/games/${offer.game.slug}/${offer.category.slug}`} className="hover:text-cyan-200">{offer.category.name}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <section>
          <div className="relative flex aspect-[1.65] items-end overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-cyan-900/30 p-6 sm:p-9">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={offer.title} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute -right-10 -top-20 h-80 w-80 rounded-full border border-white/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" />
            <div className="relative">
              <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-100">
                {offer.game.name} · {offer.category.name}
              </span>
            </div>
          </div>

          <div className="mt-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">{offer.game.name} / {offer.category.name}</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">{offer.title}</h1>
            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-300">{offer.description}</p>
            <dl className="mt-5 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
              <div><dt className="text-slate-500">Platform</dt><dd className="mt-1 text-slate-200">{offer.platform || "Not specified"}</dd></div>
              <div><dt className="text-slate-500">Region</dt><dd className="mt-1 text-slate-200">{offer.region || "Not specified"}</dd></div>
              <div><dt className="text-slate-500">Delivery</dt><dd className="mt-1 text-slate-200">{offer.deliveryType === "INSTANT" ? "Instant" : "Manual"}{offer.deliveryEstimate ? ` · ${offer.deliveryEstimate}` : ""}</dd></div>
              {offer.expiresAt && <div><dt className="text-slate-500">Offer expires</dt><dd className="mt-1 text-slate-200">{offer.expiresAt.toLocaleDateString()}</dd></div>}
            </dl>
          </div>

          {offer.attributes.length > 0 && (
            <section className="mt-8 rounded-2xl border border-white/[0.09] bg-card p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold text-white">Offer details</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {offer.attributes.map((attribute) => (
                  <div key={attribute.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <dt className="text-xs text-slate-500">{attribute.label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-slate-200">
                      {typeof attribute.value === "string"
                        ? attribute.value
                        : JSON.stringify(attribute.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="mt-8 rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.04] p-5">
            <h2 className="flex items-center gap-2 font-semibold text-white">
              <ShieldCheck className="h-5 w-5 text-cyan-300" /> Buyer protection
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Keep your communication and transaction on GameTrade. If you have an issue with an order, contact support through the help center.
            </p>
            <Link href="/policies#buyer-protection" className="mt-3 inline-block text-xs font-semibold text-cyan-200 hover:text-white">
              Read buyer protection details
            </Link>
          </section>
        </section>

        <aside className="space-y-4">
          <div className="sticky top-40 rounded-2xl border border-white/10 bg-card p-5 sm:p-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">Offer price</p>
            <p className="mt-1 font-display text-4xl font-semibold text-white">{formatPrice(offer.price, offer.currency)}</p>
            <p className="mt-2 text-xs text-slate-400">{offer.quantity} available</p>
            <div className="mt-5 grid gap-2">
              {session ? (
                <>
                  <p className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-3 text-center text-sm text-cyan-100">
                    Signed in as {session.user.email}
                  </p>
                  <Link href="/dashboard" className="rounded-xl bg-cyan-300 px-4 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-cyan-200">
                    Go to your account
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/sign-up" className="rounded-xl bg-cyan-300 px-4 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-cyan-200">
                    Create account to continue
                  </Link>
                  <Link href="/sign-in" className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/[0.04]">
                    Already have an account? Sign in
                  </Link>
                </>
              )}
            </div>
            <div className="mt-5 space-y-3 border-t border-white/[0.07] pt-5 text-xs text-slate-400">
              <p className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-300" /> Secure checkout is coming to your account</p>
              <p className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-300" /> Seller and item details shown upfront</p>
            </div>
          </div>

          <Link href={`/shops/${offer.seller.slug}`} className="block rounded-2xl border border-white/[0.09] bg-card p-5 transition hover:border-cyan-300/25">
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Sold by</span>
                <span className="mt-1 flex items-center gap-1.5 font-semibold text-white">
                  {offer.seller.shopName}
                  {offer.seller.verifiedAt && <BadgeCheck aria-label="Verified seller" className="h-4 w-4 text-cyan-300" />}
                </span>
              </span>
              <span className="text-xs text-cyan-200">View shop</span>
            </span>
            {offer.seller.description && <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-400">{offer.seller.description}</p>}
            <p className="mt-3 text-xs text-slate-500">{offer.seller._count.listings} active offers</p>
          </Link>
        </aside>
      </div>
    </main>
  );
}
