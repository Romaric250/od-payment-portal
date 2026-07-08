import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fapshiService } from "@/lib/fapshi";
import { finalizePaymentStatus } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-fapshi-signature") ?? undefined;

    const headers: Record<string, string | undefined> = {
      apiuser: request.headers.get("apiuser") ?? undefined,
      apikey: request.headers.get("apikey") ?? undefined,
    };

    if (!fapshiService.verifyWebhookSignature(rawBody, signature, headers)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as unknown;
    const event = fapshiService.processWebhook(
      payload as Parameters<typeof fapshiService.processWebhook>[0]
    );

    const payment = await prisma.payment.findUnique({
      where: { externalId: event.externalId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (event.amount && event.amount !== payment.amount) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    await finalizePaymentStatus({
      paymentId: payment.id,
      status: event.status,
      fapshiTransId: event.transactionId,
      financialTransId: event.financialTransId,
      confirmedAt: event.confirmedAt,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Fapshi webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook error" },
      { status: 400 }
    );
  }
}
