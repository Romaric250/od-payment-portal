import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAdminSession,
  authErrorResponse,
  requireAuth,
  requireSuperAdmin,
} from "@/lib/permissions";
import { settingsSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireAuth(await getAdminSession());

    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          notificationEmails: [],
          orgName: "Open Dreams",
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = requireSuperAdmin(await getAdminSession());
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await prisma.settings.findFirst();

    const settings = existing
      ? await prisma.settings.update({
          where: { id: existing.id },
          data: parsed.data,
        })
      : await prisma.settings.create({ data: parsed.data });

    await createAuditLog({
      admin: session,
      action: "SETTINGS_UPDATED",
      targetType: "Settings",
      targetId: settings.id,
      metadata: parsed.data,
    });

    return NextResponse.json(settings);
  } catch (error) {
    return authErrorResponse(error);
  }
}
