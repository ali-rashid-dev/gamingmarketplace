import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SellerStatus, UserRole } from "@/generated/prisma/enums";
import { getAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import SellerApplicationForm from "@/components/storefront/seller-application-form";
import { hasAnyRole } from "@/lib/authorization";

export const metadata: Metadata = {
  title: "Seller application | GameTrade",
  description: "Apply to open a seller shop on GameTrade.",
};

export default async function SellerApplicationPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?next=%2Fsell%2Fapply");
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      shopName: true,
      description: true,
      status: true,
    },
  });
  const canApply = await hasAnyRole(session.user.id, [UserRole.BUYER]);

  return (
    <main className="mx-auto min-h-[65vh] max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Seller onboarding</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-white">Apply to sell</h1>
      <p className="mt-4 text-sm leading-6 text-slate-400">
        Tell us about the shop you want to open. Applications are reviewed before seller access is enabled.
      </p>
      <SellerApplicationForm
        canApply={canApply}
        initialApplication={
          sellerProfile
            ? {
                shopName: sellerProfile.shopName,
                description: sellerProfile.description ?? "",
                status: sellerProfile.status,
              }
            : null
        }
      />
      {sellerProfile?.status === SellerStatus.APPROVED && (
        <p className="mt-5 text-xs text-slate-500">Your seller profile is approved. Visit your account dashboard to continue.</p>
      )}
    </main>
  );
}
