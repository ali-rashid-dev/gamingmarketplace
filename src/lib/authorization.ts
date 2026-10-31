import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { SellerStatus, type UserRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export async function getSession(requestHeaders: Headers) {
  return auth.api.getSession({ headers: requestHeaders });
}

export async function authorizeRequest(
  request: Request,
  allowedRoles?: readonly UserRole[]
): Promise<AuthSession | NextResponse> {
  const session = await getSession(request.headers);

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (allowedRoles && !(await hasAnyRole(session.user.id, allowedRoles))) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  return session;
}

export function isAuthorizationResponse(
  result: AuthSession | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

export async function requirePageSession(): Promise<AuthSession> {
  const session = await getSession(await headers());

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

export async function requirePageRoles(
  allowedRoles: readonly UserRole[]
): Promise<AuthSession> {
  const session = await requirePageSession();

  if (!(await hasAnyRole(session.user.id, allowedRoles))) {
    redirect("/dashboard");
  }

  return session;
}

export async function getActiveRoles(userId: string): Promise<UserRole[]> {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { role: { select: { key: true } } },
  });
  const roles = assignments.map(({ role }) => role.key);

  if (roles.includes("SELLER")) {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId },
      select: { status: true },
    });
    if (sellerProfile?.status !== SellerStatus.APPROVED) {
      return roles.filter((role) => role !== "SELLER");
    }
  }

  return roles;
}

export async function hasAnyRole(
  userId: string,
  allowedRoles: readonly UserRole[]
): Promise<boolean> {
  if (allowedRoles.length === 0) return false;
  const activeRoles = await getActiveRoles(userId);
  return activeRoles.some((role) => allowedRoles.includes(role));
}

export async function hasAllPermissions(
  userId: string,
  requiredPermissions: readonly string[]
): Promise<boolean> {
  if (requiredPermissions.length === 0) return false;
  const activeRoles = await getActiveRoles(userId);
  if (activeRoles.length === 0) return false;

  const grants = await prisma.rolePermission.findMany({
    where: {
      role: { key: { in: activeRoles } },
      permissionKey: { in: [...requiredPermissions] },
    },
    select: { permissionKey: true },
  });
  const grantedPermissions = new Set(grants.map(({ permissionKey }) => permissionKey));
  return requiredPermissions.every((permission) => grantedPermissions.has(permission));
}

export async function authorizeRequestPermissions(
  request: Request,
  requiredPermissions: readonly string[]
): Promise<AuthSession | NextResponse> {
  const session = await getSession(request.headers);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!(await hasAllPermissions(session.user.id, requiredPermissions))) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  return session;
}

export async function requirePagePermissions(
  requiredPermissions: readonly string[]
): Promise<AuthSession> {
  const session = await requirePageSession();
  if (!(await hasAllPermissions(session.user.id, requiredPermissions))) {
    redirect("/dashboard");
  }
  return session;
}
