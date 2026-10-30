"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSellerShopProfile } from "../dashboard-actions";

export function SellerProfileForm({
  shopName: initialShopName,
  description: initialDescription,
  displayName: initialDisplayName,
  slug,
}: {
  shopName: string;
  description: string;
  displayName: string;
  slug: string;
}) {
  const router = useRouter();
  const [shopName, setShopName] = useState(initialShopName);
  const [description, setDescription] = useState(initialDescription);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await updateSellerShopProfile({ shopName, description, displayName });
        if (!result.success) throw new Error(result.error);
        setSaved(true);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update seller profile");
      }
    });
  }
  const inputClass = "mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white";
  return (
    <form onSubmit={submit} className="mt-7 space-y-5 rounded-2xl border border-white/[0.09] bg-card p-5 sm:p-6">
      <label className="block text-xs font-medium text-slate-300">Shop name<input required minLength={3} maxLength={80} value={shopName} onChange={(event) => setShopName(event.target.value)} className={inputClass} /></label>
      <label className="block text-xs font-medium text-slate-300">Shop description<textarea maxLength={1000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} /></label>
      <label className="block text-xs font-medium text-slate-300">Account display name<input maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} /></label>
      <p className="text-xs text-slate-500">Public shop URL: <Link href={`/shops/${slug}`} className="text-cyan-200 hover:text-white">/shops/{slug}</Link></p>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {saved && <p role="status" className="text-sm text-emerald-200">Profile saved.</p>}
      <button disabled={busy} className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">Save profile</button>
    </form>
  );
}
