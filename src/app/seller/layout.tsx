import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";

export default async function SellerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRoles([UserRole.SELLER]);
  return children;
}
