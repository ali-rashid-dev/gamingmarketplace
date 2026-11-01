import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Store, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Sell on GameTrade",
  description: "Learn how to open a seller shop on GameTrade.",
  alternates: { canonical: "/sell" },
};

export default function SellPage() {
  return (
    <main className="mx-auto min-h-[65vh] max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">For game experts</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-white sm:text-6xl">Turn your game knowledge into your next shop.</h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
            Apply to sell accounts, items, top-ups, and services to players looking for their next great find.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200">
              Create an account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/sell/apply" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.04]">Apply to sell</Link>
          </div>
        </div>
        <div className="grid gap-3">
          <SellBenefit icon={<Store className="h-5 w-5" />} title="Your shop, your catalog" body="Present your offers with descriptions, imagery, supported platforms, and game-specific details." />
          <SellBenefit icon={<BadgeCheck className="h-5 w-5" />} title="Reviewed seller access" body="Seller applications are reviewed before a shop is approved to list offers." />
          <SellBenefit icon={<TrendingUp className="h-5 w-5" />} title="Meet players where they are" body="Organized game and category pages help customers find the products they want." />
        </div>
      </div>
      <section className="mt-10 rounded-2xl border border-white/[0.09] bg-card p-6">
        <h2 className="font-display text-2xl font-semibold text-white">How to apply</h2>
        <ol className="mt-4 grid gap-4 text-sm leading-6 text-slate-400 sm:grid-cols-3">
          <li><span className="font-bold text-cyan-300">1.</span> Create an account or sign in to your existing GameTrade account.</li>
          <li><span className="font-bold text-cyan-300">2.</span> Submit your shop name and a short description for review.</li>
          <li><span className="font-bold text-cyan-300">3.</span> We’ll review your application and notify you of its status.</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/sell/apply" className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">Start seller application</Link>
          <Link href="/sign-in?next=%2Fsell%2Fapply" className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.04]">Already have an account? Sign in</Link>
        </div>
      </section>
      <p className="mt-12 border-t border-white/[0.08] pt-6 text-xs leading-5 text-slate-500">
        Seller onboarding and marketplace transaction features are being introduced in stages. Do not accept payment or deliver goods outside marketplace safeguards.
      </p>
    </main>
  );
}

function SellBenefit({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-white/[0.09] bg-card p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">{icon}</span>
      <h2 className="mt-3 font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
    </article>
  );
}
