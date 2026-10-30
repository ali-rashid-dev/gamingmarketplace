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
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
          <div className="flex items-center justify-between">
            <Link href="/seller" className="font-display font-semibold text-foreground">GameTrade Seller Studio</Link>
            <Link href="/seller/settings" className="text-sm text-muted-foreground transition hover:text-gold">Settings</Link>
          </div>
          <nav aria-label="Seller dashboard" className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {navigation.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-gold/40 hover:text-gold"
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
