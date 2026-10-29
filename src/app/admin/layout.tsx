import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  return children;
}
