import type { AccessLevel, AdminRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  accessLevel: AccessLevel;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user as AdminSession;
}

export function canWrite(session: AdminSession): boolean {
  return session.accessLevel === "READ_WRITE";
}

export function isSuperAdmin(session: AdminSession): boolean {
  return session.role === "SUPER_ADMIN";
}

export function requireAuth(session: AdminSession | null): AdminSession {
  if (!session) {
    throw new AuthError("Unauthorized", 401);
  }
  return session;
}

export function requireWrite(session: AdminSession | null): AdminSession {
  const admin = requireAuth(session);
  if (!canWrite(admin)) {
    throw new AuthError("Forbidden — read-only access", 403);
  }
  return admin;
}

export function requireSuperAdmin(session: AdminSession | null): AdminSession {
  const admin = requireAuth(session);
  if (!isSuperAdmin(admin)) {
    throw new AuthError("Forbidden — super admin only", 403);
  }
  return admin;
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
