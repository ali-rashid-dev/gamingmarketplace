"use server";

import { Prisma } from "@/generated/prisma/client";
import { UserRole } from "@/generated/prisma/enums";
import { requirePageRoles } from "@/lib/authorization";
import type { ActionResult } from "@/lib/action-result";
import prisma from "@/lib/prisma";
import { z } from "zod";

const userIdSchema = z.string().min(1).max(128);
const managedRoleSchema = z.enum([
  UserRole.BUYER,
  UserRole.SELLER,
  UserRole.SUPPORT,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
]);

class RoleChangeError extends Error {}

export async function changePrivilegedUserRole(
  userIdInput: unknown,
  roleInput: unknown
): Promise<ActionResult<{ role: UserRole }>> {
  const session = await requirePageRoles([UserRole.SUPER_ADMIN]);
  const userId = userIdSchema.safeParse(userIdInput);
  if (!userId.success) return { success: false, error: "Invalid account id" };

  const role = managedRoleSchema.safeParse(roleInput);
  if (!role.success) return { success: false, error: "Invalid account role" };
  if (userId.data === session.user.id) {
    return { success: false, error: "You cannot change your own privileged role" };
  }

  try {
    const updatedRole = await prisma.$transaction(
      async (transaction) => {
        const target = await transaction.user.findUnique({
          where: { id: userId.data },
          select: { id: true, role: true, emailVerified: true },
        });
        if (!target) return null;
        if (target.role === role.data) return target.role;
        if (
          !target.emailVerified &&
          (role.data === UserRole.SUPPORT ||
            role.data === UserRole.ADMIN ||
            role.data === UserRole.SUPER_ADMIN)
        ) {
          throw new RoleChangeError("Verify the account email before granting privileged access");
        }

        if (target.role === UserRole.SUPER_ADMIN && role.data !== UserRole.SUPER_ADMIN) {
          const superAdminCount = await transaction.user.count({
            where: { role: UserRole.SUPER_ADMIN },
          });
          if (superAdminCount <= 1) {
            throw new RoleChangeError("The last super administrator cannot be demoted");
          }
        }

        const changed = await transaction.user.updateMany({
          where: { id: target.id, role: target.role },
          data: { role: role.data },
        });
        if (changed.count !== 1) {
          throw new RoleChangeError("Account role changed concurrently. Refresh and try again.");
        }

        if (role.data === UserRole.SUPPORT) {
          await transaction.supportAgentProfile.upsert({
            where: { userId: target.id },
            create: { userId: target.id },
            update: {},
          });
        }

        await transaction.auditLog.create({
          data: {
            actorId: session.user.id,
            action: "access.user_role.changed",
            entityType: "User",
            entityId: target.id,
            metadata: { previousRole: target.role, role: role.data },
          },
        });

        return role.data;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (!updatedRole) return { success: false, error: "Account not found" };
    return { success: true, data: { role: updatedRole } };
  } catch (error) {
    if (error instanceof RoleChangeError) {
      return { success: false, error: error.message };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return {
        success: false,
        error: "A conflicting access change occurred. Refresh and try again.",
      };
    }
    throw error;
  }
}

export async function revokeUserSessions(
  userIdInput: unknown
): Promise<ActionResult<{ revokedSessions: number }>> {
  const session = await requirePageRoles([UserRole.SUPER_ADMIN]);
  const userId = userIdSchema.safeParse(userIdInput);
  if (!userId.success) return { success: false, error: "Invalid account id" };
  if (userId.data === session.user.id) {
    return { success: false, error: "You cannot revoke your own sessions from this screen" };
  }

  return prisma.$transaction(async (transaction) => {
    const target = await transaction.user.findUnique({
      where: { id: userId.data },
      select: { id: true },
    });
    if (!target) return { success: false, error: "Account not found" };

    const revoked = await transaction.session.deleteMany({ where: { userId: target.id } });
    await transaction.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "access.user_sessions.revoked",
        entityType: "User",
        entityId: target.id,
        metadata: { revokedSessions: revoked.count },
      },
    });
    return { success: true, data: { revokedSessions: revoked.count } };
  });
}
