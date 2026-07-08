import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  getAdminSession,
  authErrorResponse,
  requireSuperAdmin,
} from "@/lib/permissions";
import { adminUpdateSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = requireSuperAdmin(await getAdminSession());
    const body = await request.json();
    const parsed = adminUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { password, ...rest } = parsed.data;

    const updateData = {
      ...rest,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    };

    const admin = await prisma.admin.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accessLevel: true,
        isActive: true,
      },
    });

    await createAuditLog({
      admin: session,
      action: "ADMIN_UPDATED",
      targetType: "Admin",
      targetId: admin.id,
      metadata: rest,
    });

    return NextResponse.json(admin);
  } catch (error) {
    return authErrorResponse(error);
  }
}
