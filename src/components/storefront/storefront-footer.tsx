import Link from "next/link";

export function StorefrontFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-[#080c17]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="font-display text-xl font-bold text-white">
            GAME<span className="text-cyan-300">TRADE</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
            A safer place to discover game accounts, items, currency, and services from verified sellers.
          </p>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-300">Discover</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <Link href="/games" className="hover:text-white">All games</Link>
            <Link href="/offers?sort=popular" className="hover:text-white">Popular offers</Link>
            <Link href="/sell" className="hover:text-white">Sell with us</Link>
          </div>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-300">Support</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <Link href="/help" className="hover:text-white">Help center</Link>
            <Link href="/contact" className="hover:text-white">Contact us</Link>
            <Link href="/policies#buyer-protection" className="hover:text-white">Buyer protection</Link>
          </div>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-300">Legal</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <Link href="/policies#terms" className="hover:text-white">Terms of service</Link>
            <Link href="/policies#privacy" className="hover:text-white">Privacy policy</Link>
            <Link href="/policies#refunds" className="hover:text-white">Refund policy</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-5 py-5 text-xs text-slate-500 sm:px-8">
          <span>© {new Date().getFullYear()} GameTrade. All rights reserved.</span>
          <span>Independent marketplace. Not affiliated with game publishers.</span>
        </div>
      </div>
    </footer>
  );
}
