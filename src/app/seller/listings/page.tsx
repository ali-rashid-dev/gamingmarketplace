import Link from "next/link";
import { getSellerListings } from "./listing-data";
import { SellerListings } from "./seller-listings";

export default async function SellerListingsPage() {
  const listings = await getSellerListings();
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Seller studio</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">Your listings</h1>
          <p className="mt-2 text-sm text-slate-400">Create offers, manage availability, and track review status.</p>
        </div>
        <Link href="/seller/listings/new" className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
          Create listing
        </Link>
      </div>
      <SellerListings listings={listings} />
    </main>
  );
}
