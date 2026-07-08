import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAdminSession,
  authErrorResponse,
  requireWrite,
} from "@/lib/permissions";
import { fulfillmentStatusSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = requireWrite(await getAdminSession());
    const body = await request.json();
    const parsed = fulfillmentStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { category: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!payment.category.statusPipeline.includes(parsed.data.fulfillmentStatus)) {
      return NextResponse.json(
        { error: "Invalid fulfillment status for this category" },
        { status: 400 }
      );
    }

    const fromStatus = payment.fulfillmentStatus;

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { fulfillmentStatus: parsed.data.fulfillmentStatus },
      include: { category: true },
    });

    await prisma.statusLog.create({
      data: {
        paymentId: payment.id,
        fromStatus,
        toStatus: parsed.data.fulfillmentStatus,
        changedById: session.id,
      },
    });

    await createAuditLog({
      admin: session,
      action: "FULFILLMENT_STATUS_UPDATED",
      targetType: "Payment",
      targetId: payment.id,
      metadata: {
        fromStatus,
        toStatus: parsed.data.fulfillmentStatus,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return authErrorResponse(error);
  }
}
