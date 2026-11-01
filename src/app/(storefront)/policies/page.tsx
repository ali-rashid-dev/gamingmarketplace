import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace Policies | GameTrade",
  description: "Read GameTrade buyer protection, privacy, terms, and refund information.",
};

const sections = [
  {
    id: "buyer-protection",
    title: "Buyer protection",
    text: [
      "For an item not marked delivered, open a case within 30 days of order placement. For missing, invalid, or misdescribed goods marked delivered, open a case within 7 days of the recorded delivery time. A case must be linked to an eligible paid order item.",
      "Choose the closest issue reason, describe what happened, and add relevant evidence. The seller and support may respond in the case. Keep communications and evidence relevant to the order; never upload passwords, recovery codes, payment credentials, or unrelated sensitive information.",
      "Support reviews the order record and submissions from both parties. A buyer may appeal a recorded decision once within 7 days. Cases and actions are retained in the case history and audit log.",
      "A support decision records a case outcome only. Refunds, partial refunds, and held-fund release are not currently connected to a payment provider and are not executed by this case workflow. Applicable legal rights are not limited by this policy.",
    ],
  },
  {
    id: "refunds",
    title: "Refunds and disputes",
    text: [
      "Buyer-protection cases are available from an eligible order item. Non-delivery cases must be opened within 30 days of order placement; delivery-quality cases must be opened within 7 days of recorded delivery. An appeal may be submitted once within 7 days of a decision.",
      "Authorized support staff record the outcome and explanation after reviewing case history and evidence. The current workflow does not initiate full or partial refunds, release held funds, or change payment and balance records. Do not treat a case decision as proof that a payment adjustment has occurred.",
      "Nothing in this summary limits rights that cannot be waived under applicable consumer protection law.",
    ],
  },
  {
    id: "terms",
    title: "Marketplace terms",
    text: [
      "Users must provide accurate account and listing information, follow applicable laws, and respect the rules and intellectual property rights of game publishers.",
      "Listings must describe the offered product or service honestly. Prohibited, stolen, fraudulent, or unsafe goods and attempts to bypass marketplace safeguards are not permitted.",
      "GameTrade may review, restrict, or remove accounts and listings to protect users and the marketplace, consistent with applicable law and any completed order obligations.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    text: [
      "GameTrade uses account and transaction information to operate the marketplace, protect accounts, provide support, and meet legal obligations.",
      "Share only information needed to complete a transaction. Never publish sensitive personal information, credentials, or authentication codes in a listing.",
      "Privacy rights and available account controls depend on your location. Contact support with questions about your information.",
    ],
  },
];

export default function PoliciesPage() {
  return (
    <main className="mx-auto min-h-[65vh] max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Trust & transparency</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-white sm:text-5xl">Marketplace policies</h1>
      <p className="mt-4 text-sm leading-6 text-slate-400">
        A plain-language overview of how to use GameTrade. This overview complements the terms presented during account registration and checkout.
      </p>
      <div className="mt-9 space-y-4">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-36 rounded-2xl border border-white/[0.09] bg-card p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-white">{section.title}</h2>
            <div className="mt-4 space-y-3">
              {section.text.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-slate-400">{paragraph}</p>)}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-6 text-xs text-slate-500">Policy summaries are informational and do not replace legal advice or the terms applicable to your transaction.</p>
    </main>
  );
}
