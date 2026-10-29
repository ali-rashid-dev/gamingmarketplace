import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { UserRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";

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

  if (allowedRoles && !allowedRoles.includes(session.user.role as UserRole)) {
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

  if (!allowedRoles.includes(session.user.role as UserRole)) {
    redirect("/dashboard");
  }

  return session;
}
