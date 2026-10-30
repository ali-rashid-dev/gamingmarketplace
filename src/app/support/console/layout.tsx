import { requirePageRoles } from "@/lib/authorization";
import { UserRole } from "@/generated/prisma/enums";
import { SupportShell } from "./support-shell";

export default async function SupportConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRoles([UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  return <SupportShell>{children}</SupportShell>;
}
