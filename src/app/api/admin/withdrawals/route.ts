import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAdminSession,
  authErrorResponse,
  requireAuth,
  requireWrite,
} from "@/lib/permissions";
import { withdrawalSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireAuth(await getAdminSession());

    const withdrawals = await prisma.withdrawal.findMany({
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(withdrawals);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = requireWrite(await getAdminSession());
    const body = await request.json();
    const parsed = withdrawalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        amount: parsed.data.amount,
        note: parsed.data.note,
        reference: parsed.data.reference,
        createdById: session.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      admin: session,
      action: "WITHDRAWAL_CREATED",
      targetType: "Withdrawal",
      targetId: withdrawal.id,
      metadata: { amount: withdrawal.amount },
    });

    return NextResponse.json(withdrawal, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
