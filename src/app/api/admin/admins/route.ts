import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  getAdminSession,
  authErrorResponse,
  requireSuperAdmin,
} from "@/lib/permissions";
import { adminCreateSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/resend";
import { adminInviteEmail } from "@/lib/emails/templates";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireSuperAdmin(await getAdminSession());

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accessLevel: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(admins);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = requireSuperAdmin(await getAdminSession());
    const body = await request.json();
    const parsed = adminCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await prisma.admin.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An admin with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const admin = await prisma.admin.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        role: parsed.data.role,
        accessLevel: parsed.data.accessLevel,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accessLevel: true,
        isActive: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      admin: session,
      action: "ADMIN_CREATED",
      targetType: "Admin",
      targetId: admin.id,
      metadata: { email: admin.email },
    });

    await sendEmail({
      to: admin.email,
      subject: "Your Open Dreams admin account",
      html: adminInviteEmail({
        name: admin.name,
        email: admin.email,
        loginUrl: `${env.appUrl}/admin/login`,
        temporaryPassword: parsed.data.password,
      }),
    });

    return NextResponse.json(admin, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
