import { headers } from "next/headers";
import Link from "next/link";
import { Search } from "lucide-react";
import { auth } from "@/lib/auth";

export async function StorefrontHeader() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1020]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="GameTrade home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-[#07101f] shadow-lg shadow-blue-500/20">
            <span className="font-display text-xl font-bold">G</span>
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-white">
            GAME<span className="text-cyan-300">TRADE</span>
          </span>
        </Link>

        <form action="/offers" className="order-3 w-full md:order-2 md:mx-auto md:max-w-xl md:flex-1">
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 focus-within:border-cyan-300/50">
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="search"
              name="q"
              placeholder="Search games, categories, offers..."
              className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500 lg:inline">
              SEARCH
            </kbd>
          </label>
        </form>

        <nav className="order-2 ml-auto flex items-center gap-2 text-sm md:order-3">
          <Link
            href="/sell"
            className="hidden rounded-lg px-3 py-2 font-medium text-slate-300 transition hover:bg-white/5 hover:text-white sm:inline-flex"
          >
            Become a seller
          </Link>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-white/10 px-3 py-2 font-medium text-white transition hover:border-white/20 hover:bg-white/5 [&::-webkit-details-marker]:hidden">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-xs">
                {session?.user.name?.slice(0, 1).toUpperCase() ?? "☺"}
              </span>
              <span className="hidden sm:inline">{session?.user.name ?? "Account"}</span>
            </summary>
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[#111a2d] p-1.5 shadow-2xl">
              {session ? (
                <>
                  <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-slate-200 hover:bg-white/5">
                    My account
                  </Link>
                  <Link href="/sell" className="block rounded-lg px-3 py-2 text-slate-200 hover:bg-white/5">
                    Seller center
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/sign-in" className="block rounded-lg px-3 py-2 text-slate-200 hover:bg-white/5">
                    Sign in
                  </Link>
                  <Link href="/sign-up" className="block rounded-lg px-3 py-2 text-slate-200 hover:bg-white/5">
                    Create account
                  </Link>
                </>
              )}
            </div>
          </details>
        </nav>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-5 pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 sm:px-8">
        <Link href="/games" className="shrink-0 transition hover:text-cyan-300">Explore games</Link>
        <Link href="/offers?sort=popular" className="shrink-0 transition hover:text-cyan-300">Popular offers</Link>
        <Link href="/help" className="shrink-0 transition hover:text-cyan-300">Help center</Link>
      </div>
    </header>
  );
}
