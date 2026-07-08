import { prisma } from "@/lib/prisma";
import { fapshiService } from "@/lib/fapshi";
import { sendPaymentSuccessEmails } from "@/lib/emails/payment-success";
import type { PaymentStatus } from "@prisma/client";

export async function finalizePaymentStatus(params: {
  paymentId: string;
  status: PaymentStatus;
  fapshiTransId?: string;
  financialTransId?: string;
  confirmedAt?: Date;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    include: { category: true },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  const wasSuccessful = payment.status === "SUCCESSFUL";
  const isNowSuccessful = params.status === "SUCCESSFUL";

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: params.status,
      fapshiTransId: params.fapshiTransId ?? payment.fapshiTransId,
      financialTransId: params.financialTransId ?? payment.financialTransId,
      confirmedAt:
        isNowSuccessful && !payment.confirmedAt
          ? params.confirmedAt ?? new Date()
          : payment.confirmedAt,
      fulfillmentStatus:
        isNowSuccessful && !payment.fulfillmentStatus
          ? payment.category.statusPipeline[0] ?? "Received"
          : payment.fulfillmentStatus,
    },
    include: { category: true },
  });

  if (!wasSuccessful && isNowSuccessful) {
    await sendPaymentSuccessEmails(updated);
  }

  return updated;
}

export async function syncPaymentFromFapshi(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment?.fapshiTransId) {
    return prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        category: { select: { name: true, slug: true } },
      },
    });
  }

  const fapshiStatus = await fapshiService.checkPaymentStatus(
    payment.fapshiTransId
  );

  await finalizePaymentStatus({
    paymentId: payment.id,
    status: fapshiService.mapStatus(fapshiStatus.status),
    fapshiTransId: fapshiStatus.transId,
    financialTransId: fapshiStatus.financialTransId,
    confirmedAt: fapshiStatus.date ? new Date(fapshiStatus.date) : undefined,
  });

  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      category: { select: { name: true, slug: true } },
    },
  });
}
