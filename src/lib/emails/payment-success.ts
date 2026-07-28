import { prisma } from "@/lib/prisma";
import { resolvePaymentNotificationEmails } from "@/lib/pricing";
import { hasPostPaymentFollowUp } from "@/lib/post-payment";
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
  const notificationEmails = resolvePaymentNotificationEmails({
    categoryEmails: payment.category.notificationEmails,
    globalEmails: settings?.notificationEmails,
  });

  const timestamp = formatDate(payment.confirmedAt ?? payment.updatedAt);
  const transactionId = payment.fapshiTransId ?? payment.externalId;

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

  await sendEmail({
    to: payment.payerEmail,
    subject: hasPostPaymentFollowUp(payment.category)
      ? `Receipt & next steps — ${payment.category.name}`
      : `Receipt — ${payment.category.name} (${payment.amount} FCFA)`,
    html: payerReceiptEmail({
      payerName: payment.payerName,
      amount: payment.amount,
      categoryName: payment.category.name,
      transactionId,
      orgName,
      followUp: {
        postPaymentTitle: payment.category.postPaymentTitle,
        postPaymentDescription: payment.category.postPaymentDescription,
        postPaymentLink: payment.category.postPaymentLink,
        postPaymentLinkLabel: payment.category.postPaymentLinkLabel,
        categoryType: payment.category.categoryType,
      },
    }),
  });
}
