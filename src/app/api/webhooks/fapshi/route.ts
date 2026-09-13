import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { fapshiService } from "@/lib/fapshi";
import { finalizePaymentStatus } from "@/lib/payments";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/webhooks/fapshi",
    secretConfigured: Boolean(env.fapshiWebhookSecret),
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const webhookSecret = request.headers.get("x-wh-secret");

    if (!fapshiService.verifyWebhookSecret(webhookSecret)) {
      logError("Fapshi webhook rejected", { reason: "invalid x-wh-secret" });
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }

    if (!env.fapshiWebhookSecret) {
      logInfo("Fapshi webhook accepted without secret", {
        hint: "Set FAPSHI_WEBHOOK_SECRET to match the Fapshi dashboard webhook secret",
      });
    }

    const payload = JSON.parse(rawBody) as unknown;
    const event = fapshiService.processWebhook(
      payload as Parameters<typeof fapshiService.processWebhook>[0]
    );

    logInfo("Fapshi webhook received", {
      status: event.status,
      transId: event.transactionId,
      externalId: event.externalId || undefined,
      userId: event.userId,
      amount: event.amount || undefined,
    });

    const payment = await findPayment(event);

    if (!payment) {
      logError("Fapshi webhook payment not found", {
        transId: event.transactionId,
        externalId: event.externalId || undefined,
        userId: event.userId,
      });
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (event.amount > 0 && event.amount !== payment.amount) {
      logError("Fapshi webhook amount mismatch", {
        paymentId: payment.id,
        expected: payment.amount,
        received: event.amount,
      });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    await finalizePaymentStatus({
      paymentId: payment.id,
      status: event.status,
      fapshiTransId: event.transactionId || payment.fapshiTransId || undefined,
      financialTransId: event.financialTransId,
      confirmedAt: event.confirmedAt,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    logError("Fapshi webhook error", {
      error: error instanceof Error ? error.message : "Webhook error",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook error" },
      { status: 400 }
    );
  }
}

async function findPayment(event: {
  transactionId: string;
  externalId: string;
  userId?: string;
}) {
  if (event.userId) {
    const byUserId = await prisma.payment.findUnique({
      where: { id: event.userId },
    });
    if (byUserId) return byUserId;
  }

  if (event.externalId) {
    const byExternalId = await prisma.payment.findUnique({
      where: { externalId: event.externalId },
    });
    if (byExternalId) return byExternalId;
  }

  if (event.transactionId) {
    return prisma.payment.findUnique({
      where: { fapshiTransId: event.transactionId },
    });
  }

  return null;
}
