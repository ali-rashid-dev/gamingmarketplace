import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import Link from "next/link";

export default async function SellerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRoles([UserRole.SELLER]);
  return (
    <>
      <header className="border-b border-white/[0.08] bg-[#0b1020]">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/seller/listings" className="font-semibold text-white">GameTrade Seller Studio</Link>
          <Link href="/seller/listings" className="text-sm text-slate-300 hover:text-cyan-200">Your listings</Link>
        </nav>
      </header>
      {children}
    </>
  );
}
