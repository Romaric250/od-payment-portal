import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAdminSession,
  authErrorResponse,
  requireWrite,
} from "@/lib/permissions";
import { finalizePaymentStatus } from "@/lib/payments";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const CONFIRMABLE_STATUSES = new Set(["INITIATED", "PENDING"]);

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = requireWrite(await getAdminSession());

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { category: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "SUCCESSFUL") {
      return NextResponse.json(
        { error: "Payment is already marked as successful" },
        { status: 409 }
      );
    }

    if (!CONFIRMABLE_STATUSES.has(payment.status)) {
      return NextResponse.json(
        {
          error: `Cannot confirm a payment with status "${payment.status}". Only pending payments can be confirmed.`,
        },
        { status: 400 }
      );
    }

    const updated = await finalizePaymentStatus({
      paymentId: payment.id,
      status: "SUCCESSFUL",
      confirmedAt: new Date(),
    });

    await createAuditLog({
      admin: session,
      action: "PAYMENT_MANUALLY_CONFIRMED",
      targetType: "Payment",
      targetId: payment.id,
      metadata: {
        previousStatus: payment.status,
        amount: payment.amount,
        categoryId: payment.categoryId,
        categoryName: payment.category.name,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return authErrorResponse(error);
  }
}
