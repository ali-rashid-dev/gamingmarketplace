import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  return (
    <>
      <header className="border-b border-border bg-card">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/admin/catalog" className="font-semibold text-primary">
            GameTrade Admin
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/catalog"
              className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              Game catalog
            </Link>
            <Link
              href="/admin/listings"
              className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              Listing review
            </Link>
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
