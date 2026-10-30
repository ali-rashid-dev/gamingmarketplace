import { getSellerProfile } from "../dashboard-data";

export default async function SellerVerificationPage() {
  const seller = await getSellerProfile();
  return (
    <main className="mx-auto max-w-3xl px-5 py-9 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Trust and safety</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">Verification</h1>
      <section className="mt-7 rounded-2xl border border-white/[0.09] bg-[#111a2b] p-5 sm:p-6">
        <p className="text-xs text-slate-500">Seller access</p>
        <p className="mt-1 text-lg font-semibold text-white">{seller.status.toLowerCase()}</p>
        <p className="mt-4 text-xs text-slate-500">Seller verification</p>
        <p className="mt-1 text-sm text-slate-200">
          {seller.verifiedAt
            ? `Verified on ${seller.verifiedAt.toLocaleDateString()}`
            : "No seller verification record"}
        </p>
        {!seller.verifiedAt && (
          <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4 text-sm leading-6 text-amber-100/80">
            Verification document submission is not enabled yet. Contact marketplace support for guidance. Do not upload identity documents or financial credentials through listings, messages, or ordinary support forms.
          </p>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Account email: {seller.user.emailVerified ? "verified" : "not verified"}
        </p>
      </section>
    </main>
  );
}
