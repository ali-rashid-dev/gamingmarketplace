import { getSellerProfile } from "../dashboard-data";
import { SellerSettingsForm } from "./seller-settings-form";

export default async function SellerSettingsPage() {
  const seller = await getSellerProfile();
  return (
    <main className="mx-auto max-w-3xl px-5 py-9 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Preferences</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">Seller settings</h1>
      <p className="mt-2 text-sm text-slate-400">Manage your availability, notification preference, and currency preference.</p>
      <SellerSettingsForm
        isAvailable={seller.isAvailable}
        emailNotifications={seller.profile?.emailNotifications ?? true}
        preferredCurrency={seller.profile?.preferredCurrency ?? "USD"}
        username={seller.profile?.username ?? ""}
      />
    </main>
  );
}
