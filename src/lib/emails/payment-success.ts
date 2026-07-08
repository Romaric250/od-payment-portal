import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import {
  adminPaymentNotificationEmail,
  payerReceiptEmail,
} from "@/lib/emails/templates";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import type { Payment, Category } from "@prisma/client";

export async function sendPaymentSuccessEmails(
  payment: Payment & { category: Category }
) {
  const settings = await prisma.settings.findFirst();
  const orgName = settings?.orgName ?? "Open Dreams";
  const notificationEmails = settings?.notificationEmails ?? [];

  const timestamp = formatDate(payment.confirmedAt ?? payment.updatedAt);
  const transactionId = payment.fapshiTransId ?? payment.externalId;

  if (notificationEmails.length > 0) {
    await sendEmail({
      to: notificationEmails,
      subject: `Payment Successful — ${payment.payerName} paid ${payment.amount} FCFA for ${payment.category.name}`,
      html: adminPaymentNotificationEmail({
        payerName: payment.payerName,
        amount: payment.amount,
        categoryName: payment.category.name,
        transactionId,
        network: payment.network,
        timestamp,
        adminUrl: `${env.appUrl}/admin/transactions`,
      }),
    });
  }

  await sendEmail({
    to: payment.payerEmail,
    subject: `Receipt — ${payment.category.name} (${payment.amount} FCFA)`,
    html: payerReceiptEmail({
      payerName: payment.payerName,
      amount: payment.amount,
      categoryName: payment.category.name,
      transactionId,
      orgName,
    }),
  });
}
