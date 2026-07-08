import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { syncPaymentFromFapshi } from "@/lib/payments";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    let payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: { name: true, slug: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (
      payment.fapshiTransId &&
      (payment.status === "INITIATED" || payment.status === "PENDING")
    ) {
      payment = await syncPaymentFromFapshi(payment.id);
    }

    return NextResponse.json({
      id: payment!.id,
      status: payment!.status,
      amount: payment!.amount,
      externalId: payment!.externalId,
      fapshiTransId: payment!.fapshiTransId,
      payerEmail: payment!.payerEmail,
      payerName: payment!.payerName,
      confirmedAt: payment!.confirmedAt,
      updatedAt: payment!.updatedAt,
      category: payment!.category,
    });
  } catch (error) {
    console.error("GET /api/payments/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
