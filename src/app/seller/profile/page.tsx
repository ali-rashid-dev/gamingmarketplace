import { getSellerProfile } from "../dashboard-data";
import { SellerProfileForm } from "./seller-profile-form";

export default async function SellerProfilePage() {
  const seller = await getSellerProfile();
  return (
    <main className="mx-auto max-w-3xl px-5 py-9 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Public shop</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">Seller profile</h1>
      <p className="mt-2 text-sm text-slate-400">Manage the shop details shown to buyers.</p>
      <SellerProfileForm
        shopName={seller.shopName}
        description={seller.description ?? ""}
        displayName={seller.user.name}
        slug={seller.slug}
      />
    </main>
  );
}
