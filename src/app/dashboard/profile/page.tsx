import { requirePageSession } from "@/lib/authorization";
import { getBuyerProfile } from "../buyer-data";
import { ProfileForm } from "./profile-form";

export default async function BuyerProfilePage() {
  const { user } = await requirePageSession();
  const profile = await getBuyerProfile(user.id);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Personal details</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage your name, avatar, locale, and notification preferences.</p>
      <ProfileForm profile={profile} />
    </div>
  );
}
