"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSellerAccountSettings, updateSellerAvailability } from "../dashboard-actions";

export function SellerSettingsForm({
  isAvailable: initialAvailability,
  emailNotifications: initialNotifications,
  preferredCurrency: initialCurrency,
  username: initialUsername,
}: {
  isAvailable: boolean;
  emailNotifications: boolean;
  preferredCurrency: string;
  username: string;
}) {
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState(initialAvailability);
  const [emailNotifications, setEmailNotifications] = useState(initialNotifications);
  const [preferredCurrency, setPreferredCurrency] = useState(initialCurrency);
  const [username, setUsername] = useState(initialUsername);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  function run(action: () => Promise<{ success: boolean; error?: string }>, success: string) {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) throw new Error(result.error ?? "Unable to save settings");
        setNotice(success);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to save settings");
      }
    });
  }
  const inputClass = "mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white";
  return (
    <div className="mt-7 space-y-5">
      <section className="rounded-2xl border border-white/[0.09] bg-card p-5 sm:p-6">
        <h2 className="font-semibold text-white">Shop availability</h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">When unavailable, your shop and active offers are hidden from buyers. You can still update listings and orders.</p>
        <label className="mt-4 flex items-center gap-3 text-sm text-slate-200">
          <input type="checkbox" checked={isAvailable} onChange={(event) => setIsAvailable(event.target.checked)} className="accent-cyan-300" />
          Shop is available to buyers
        </label>
        <button disabled={busy || isAvailable === initialAvailability} onClick={() => run(() => updateSellerAvailability(isAvailable), "Availability updated")} className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Save availability</button>
      </section>
      <form onSubmit={(event) => {
        event.preventDefault();
        run(() => updateSellerAccountSettings({ emailNotifications, preferredCurrency, ...(username ? { username } : {}) }), "Settings saved");
      }} className="rounded-2xl border border-white/[0.09] bg-card p-5 sm:p-6">
        <h2 className="font-semibold text-white">Account preferences</h2>
        <label className="mt-4 block text-xs font-medium text-slate-300">Username
          <input minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" value={username} onChange={(event) => setUsername(event.target.value)} className={inputClass} />
        </label>
        <label className="mt-4 block text-xs font-medium text-slate-300">Preferred currency
          <select value={preferredCurrency} onChange={(event) => setPreferredCurrency(event.target.value)} className={inputClass}>
            {["USD", "EUR", "GBP", "CAD", "AUD"].map((currency) => <option key={currency}>{currency}</option>)}
          </select>
        </label>
        <label className="mt-4 flex items-center gap-3 text-sm text-slate-200">
          <input type="checkbox" checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)} className="accent-cyan-300" />
          Receive email notifications
        </label>
        <button disabled={busy} className="mt-4 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">Save settings</button>
      </form>
      {error && <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/[0.05] p-3 text-sm text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.05] p-3 text-sm text-emerald-100">{notice}</p>}
    </div>
  );
}
