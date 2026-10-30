import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Help Center | GameTrade",
  description: "Get answers about buying, selling, accounts, and marketplace support.",
};

const helpTopics = [
  {
    title: "Buying on GameTrade",
    body: "Browse the listing details carefully before you decide. Check the game, category, platform, seller shop, and any custom attributes shown on the offer.",
  },
  {
    title: "Payments and orders",
    body: "Order and payment tools are being introduced in stages. When checkout is available, the order page will explain the payment status and next steps.",
  },
  {
    title: "Account access",
    body: "Sign in with the email or provider you used to register. Use the password reset flow if you cannot access your account.",
  },
  {
    title: "Selling on GameTrade",
    body: "Seller applications are reviewed before a shop can list products. Visit the seller information page to learn how to apply.",
  },
];

export default function HelpPage() {
  return (
    <main className="mx-auto min-h-[65vh] max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">GameTrade support</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-white sm:text-5xl">Help center</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
        Find practical guidance for browsing the marketplace, managing your account, and getting support.
      </p>

      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        {helpTopics.map((topic) => (
          <article key={topic.title} className="rounded-2xl border border-white/[0.09] bg-card p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><CircleHelp className="h-5 w-5" /></span>
            <h2 className="mt-4 font-display text-xl font-semibold text-white">{topic.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{topic.body}</p>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-6">
        <h2 className="flex items-center gap-2 font-semibold text-white"><ShieldCheck className="h-5 w-5 text-cyan-300" /> Need help with a purchase?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Keep records of your order and communicate through marketplace tools whenever available. Read the buyer protection and refund information before completing a transaction.
        </p>
        <Link href="/policies#buyer-protection" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">
          View marketplace policies <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
      <p className="mt-7 text-sm text-slate-400">
        Still need assistance? <Link href="/contact" className="font-semibold text-cyan-200 hover:text-white">Contact support</Link>.
      </p>
    </main>
  );
}
