"use server";

import { Prisma } from "@/generated/prisma/client";
import { UserRole } from "@/generated/prisma/enums";
import { requirePagePermissions } from "@/lib/authorization";
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

const rolesSchema = z.array(managedRoleSchema).min(1).max(5);

export async function setUserRoles(
  userIdInput: unknown,
  rolesInput: unknown
): Promise<ActionResult<{ roles: UserRole[] }>> {
  const session = await requirePagePermissions(["permissions.manage"]);
  const userId = userIdSchema.safeParse(userIdInput);
  if (!userId.success) return { success: false, error: "Invalid account id" };

  const parsedRoles = rolesSchema.safeParse(rolesInput);
  if (!parsedRoles.success) return { success: false, error: "Invalid account roles" };
  const roles = [...new Set(parsedRoles.data)];
  if (userId.data === session.user.id) {
    return { success: false, error: "You cannot change your own privileged role" };
  }

  try {
    const updatedRoles = await prisma.$transaction(
      async (transaction) => {
        const target = await transaction.user.findUnique({
          where: { id: userId.data },
          select: {
            id: true,
            emailVerified: true,
            roleAssignments: { select: { role: { select: { key: true } } } },
          },
        });
        if (!target) return null;
        const previousRoles = target.roleAssignments.map(({ role }) => role.key);
        const addingRoles = roles.filter((role) => !previousRoles.includes(role));
        if (
          roles.length === previousRoles.length &&
          roles.every((role) => previousRoles.includes(role))
        ) {
          return previousRoles;
        }
        if (
          !target.emailVerified &&
          addingRoles.some(
            (role) =>
              role === UserRole.SUPPORT ||
              role === UserRole.ADMIN ||
              role === UserRole.SUPER_ADMIN
          )
        ) {
          throw new RoleChangeError("Verify the account email before granting privileged access");
        }
        if (addingRoles.includes(UserRole.SELLER)) {
          const seller = await transaction.sellerProfile.findUnique({
            where: { userId: target.id },
            select: { status: true },
          });
          if (seller?.status !== "APPROVED") {
            throw new RoleChangeError("Seller access is granted only after seller approval");
          }
        }

        if (
          previousRoles.includes(UserRole.SUPER_ADMIN) &&
          !roles.includes(UserRole.SUPER_ADMIN)
        ) {
          const superAdminCount = await transaction.userRoleAssignment.count({
            where: { role: { key: UserRole.SUPER_ADMIN } },
          });
          if (superAdminCount <= 1) {
            throw new RoleChangeError("The last super administrator cannot be demoted");
          }
        }

        const roleRecords = await transaction.role.findMany({
          where: { key: { in: roles } },
          select: { id: true, key: true },
        });
        if (roleRecords.length !== roles.length) {
          throw new Error("Role configuration is incomplete");
        }
        const previousAssignments = await transaction.userRoleAssignment.findMany({
          where: { userId: target.id },
          select: { roleId: true, role: { select: { key: true } } },
        });
        const assignmentsToRemove = previousAssignments
          .filter(({ role }) => !roles.includes(role.key))
          .map(({ roleId }) => roleId);

        await transaction.userRoleAssignment.deleteMany({
          where: { userId: target.id, roleId: { in: assignmentsToRemove } },
        });
        await transaction.userRoleAssignment.createMany({
          data: roleRecords.map(({ id }) => ({ userId: target.id, roleId: id })),
          skipDuplicates: true,
        });

        if (roles.includes(UserRole.SUPPORT)) {
          await transaction.supportAgentProfile.upsert({
            where: { userId: target.id },
            create: { userId: target.id },
            update: {},
          });
        }

        await transaction.auditLog.create({
          data: {
            actorId: session.user.id,
            action: "access.user_roles.changed",
            entityType: "User",
            entityId: target.id,
            metadata: { previousRoles, roles },
          },
        });

        return roles;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (!updatedRoles) return { success: false, error: "Account not found" };
    return { success: true, data: { roles: updatedRoles } };
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
  const session = await requirePagePermissions(["admins.manage"]);
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
