import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import Link from "next/link";

const navigation = [
  ["Overview", "/seller"],
  ["Listings", "/seller/listings"],
  ["Create listing", "/seller/listings/new"],
  ["Orders", "/seller/orders"],
  ["Messages", "/seller/messages"],
  ["Reviews", "/seller/reviews"],
  ["Earnings", "/seller/earnings"],
  ["Shop profile", "/seller/profile"],
  ["Verification", "/seller/verification"],
  ["Settings", "/seller/settings"],
] as const;

export default async function SellerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRoles([UserRole.SELLER]);
  return (
    <>
      <header className="border-b border-white/[0.08] bg-[#0b1020]">
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
          <div className="flex items-center justify-between">
            <Link href="/seller" className="font-semibold text-white">GameTrade Seller Studio</Link>
            <Link href="/seller/settings" className="text-sm text-slate-300 hover:text-cyan-200">Settings</Link>
          </div>
          <nav aria-label="Seller dashboard" className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {navigation.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-100"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
