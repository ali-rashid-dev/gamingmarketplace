import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp, MessageCircle, ShieldQuestion } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact GameTrade | Support",
  description: "Find the right path to contact GameTrade support.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="mx-auto min-h-[65vh] max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">We’re here to help</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-white sm:text-5xl">Contact GameTrade</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
        Choose the support path that best fits your question. For account-specific help, sign in so the support team can identify your account and order.
      </p>
      <div className="mt-9 grid gap-4 md:grid-cols-3">
        <ContactCard icon={<CircleHelp className="h-5 w-5" />} title="Browse help topics" body="Find quick answers about accounts, offers, and using the marketplace." href="/help" action="Visit help center" />
        <ContactCard icon={<MessageCircle className="h-5 w-5" />} title="Account support" body="Open your account dashboard for account-specific assistance." href="/dashboard" action="Go to my account" />
        <ContactCard icon={<ShieldQuestion className="h-5 w-5" />} title="Policy questions" body="Review buyer protection, refund information, privacy, and marketplace rules." href="/policies" action="Read policies" />
      </div>
      <p className="mt-8 text-xs leading-5 text-slate-500">
        Never send your password, payment card details, or account recovery codes in a support request.
      </p>
    </main>
  );
}

function ContactCard({
  icon,
  title,
  body,
  href,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-white/[0.09] bg-card p-6">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">{icon}</span>
      <h2 className="mt-4 font-display text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{body}</p>
      <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">
        {action}<ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
