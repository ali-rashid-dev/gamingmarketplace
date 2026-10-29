"use client";

import { useState } from "react";
import Link from "next/link";
import { SellerStatus } from "@/generated/prisma/enums";
import { submitSellerApplication } from "@/app/seller/actions";

type Application = {
  shopName: string;
  description: string;
  status: SellerStatus;
} | null;

export default function SellerApplicationForm({
  canApply,
  initialApplication,
}: {
  canApply: boolean;
  initialApplication: Application;
}) {
  const [application, setApplication] = useState(initialApplication);
  const [shopName, setShopName] = useState(initialApplication?.shopName ?? "");
  const [description, setDescription] = useState(initialApplication?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await submitSellerApplication({ shopName, description });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setApplication({
        shopName: result.data.sellerProfile.shopName,
        description: result.data.sellerProfile.description ?? "",
        status: result.data.sellerProfile.status,
      });
    } catch {
      setError("Unable to submit your application. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (application && application.status !== SellerStatus.REJECTED) {
    const isApproved = application.status === SellerStatus.APPROVED;
    return (
      <section className="mt-8 rounded-2xl border border-white/10 bg-[#111a2b] p-6">
        <h2 className="font-semibold text-white">
          {isApproved ? "Seller application approved" : "Application under review"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {isApproved
            ? `${application.shopName} is approved to sell on GameTrade.`
            : `We’re reviewing your application for ${application.shopName}.`}
        </p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.04]">
          Go to your account
        </Link>
      </section>
    );
  }

  if (!canApply) {
    return (
      <p className="mt-8 rounded-2xl border border-white/10 bg-[#111a2b] p-6 text-sm text-slate-300">
        This account cannot submit a seller application. Visit your <Link href="/dashboard" className="text-cyan-200 hover:text-white">account dashboard</Link> for help.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-[#111a2b] p-6">
      <label className="block text-sm font-medium text-slate-200">
        Shop name
        <input
          required
          minLength={3}
          maxLength={80}
          value={shopName}
          onChange={(event) => setShopName(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
        />
      </label>
      <label className="block text-sm font-medium text-slate-200">
        Shop description
        <textarea
          maxLength={1000}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
        />
      </label>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Submitting…" : application ? "Resubmit application" : "Submit application"}
      </button>
    </form>
  );
}
