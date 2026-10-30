"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateBuyerProfile } from "../actions";

type Profile = {
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  profile: {
    username: string;
    bio: string | null;
    locale: string;
    preferredCurrency: string;
    emailNotifications: boolean;
    countryCode: string | null;
  } | null;
};

const fieldClass = "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-gold";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.profile?.username ?? "");
  const [image, setImage] = useState(profile.image ?? "");
  const [bio, setBio] = useState(profile.profile?.bio ?? "");
  const [locale, setLocale] = useState(profile.profile?.locale ?? "en");
  const [countryCode, setCountryCode] = useState(profile.profile?.countryCode?.trim() ?? "");
  const [preferredCurrency, setPreferredCurrency] = useState(profile.profile?.preferredCurrency ?? "USD");
  const [emailNotifications, setEmailNotifications] = useState(profile.profile?.emailNotifications ?? true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await updateBuyerProfile({
          name,
          username,
          image,
          bio,
          locale,
          countryCode: countryCode.toUpperCase(),
          preferredCurrency,
          emailNotifications,
        });
        if (!result.success) throw new Error(result.error);
        setSaved(true);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update profile");
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
      <label className="block text-xs font-medium text-muted-foreground">
        Name
        <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
      </label>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Email</p>
        <p className="mt-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-sm">{profile.email}</p>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {profile.emailVerified ? "Verified" : "Not verified"} · Email changes require verification and aren’t available here yet.
        </p>
      </div>
      <label className="block text-xs font-medium text-muted-foreground">
        Username
        <input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" value={username} onChange={(event) => setUsername(event.target.value)} className={fieldClass} />
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Avatar URL (HTTPS)
        <input type="url" maxLength={500} value={image} onChange={(event) => setImage(event.target.value)} className={fieldClass} placeholder="https://…" />
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        About you
        <textarea maxLength={500} rows={3} value={bio} onChange={(event) => setBio(event.target.value)} className={fieldClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Country code
          <input maxLength={2} pattern="[A-Za-z]{2}" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className={fieldClass} placeholder="US" />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Language / locale
          <input required maxLength={16} value={locale} onChange={(event) => setLocale(event.target.value)} className={fieldClass} placeholder="en" />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Preferred currency
          <select value={preferredCurrency} onChange={(event) => setPreferredCurrency(event.target.value)} className={fieldClass}>
            {["USD", "EUR", "GBP", "CAD", "AUD"].map((code) => <option key={code}>{code}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-muted-foreground">
          <input type="checkbox" checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)} className="accent-[var(--gold)]" />
          Email notifications
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {saved && <p role="status" className="text-sm text-patina">Profile updated.</p>}
      <button disabled={busy} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {busy ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
