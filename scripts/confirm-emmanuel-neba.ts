import { PrismaClient } from "@prisma/client";
import { fapshiService } from "../src/lib/fapshi";
import { finalizePaymentStatus } from "../src/lib/payments";

const FINANCIAL_TRANS_ID = "18258290123";
const CATEGORY_ID = "6a68d3d175496544cd212166";
const PAYER_EMAIL = "emmanuelshu8020@gmail.com";
const PAYER_PHONE = "673669111";
const CONFIRMED_AT = new Date("2026-08-07T20:21:20");

async function main() {
  const prisma = new PrismaClient();
  const dryRun = !process.argv.includes("--execute");

  const byFinancial = await prisma.payment.findFirst({
    where: { financialTransId: FINANCIAL_TRANS_ID },
    include: { category: true },
  });

  if (byFinancial) {
    console.log("Already recorded:", byFinancial.id, byFinancial.status);
    await prisma.$disconnect();
    return;
  }

  const attempts = await prisma.payment.findMany({
    where: {
      categoryId: CATEGORY_ID,
      payerEmail: PAYER_EMAIL,
    },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  console.log("Emmanuel attempts:", attempts.length);
  for (const attempt of attempts) {
    console.log(
      `- ${attempt.id} | ${attempt.status} | ${attempt.fapshiTransId} | ${attempt.createdAt.toISOString()}`
    );
    if (attempt.fapshiTransId) {
      try {
        const fapshi = await fapshiService.checkPaymentStatus(attempt.fapshiTransId);
        console.log(`  Fapshi: ${fapshi.status}`, (fapshi as { financialTransId?: string }).financialTransId ?? "");
      } catch {
        console.log("  Fapshi lookup failed");
      }
    }
  }

  let payment =
    attempts.find((p) => p.status !== "SUCCESSFUL") ??
    attempts.sort(
      (a, b) =>
        Math.abs(a.createdAt.getTime() - CONFIRMED_AT.getTime()) -
        Math.abs(b.createdAt.getTime() - CONFIRMED_AT.getTime())
    )[0];

  if (!payment) {
    console.error("Could not locate payment record");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("\nSelected payment:", payment.id, payment.status);
  if (payment.status === "SUCCESSFUL") {
    console.log("\nAlready SUCCESSFUL — no action needed");
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] Would confirm ${payment.id} (${payment.payerName}) with financialTransId ${FINANCIAL_TRANS_ID}`);
    await prisma.$disconnect();
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { payerPhone: PAYER_PHONE },
  });

  await finalizePaymentStatus({
    paymentId: payment.id,
    status: "SUCCESSFUL",
    fapshiTransId: payment.fapshiTransId ?? undefined,
    financialTransId: FINANCIAL_TRANS_ID,
    confirmedAt: CONFIRMED_AT,
  });

  console.log(`\nConfirmed and emailed: ${payment.payerName} (${payment.id})`);
  await prisma.$disconnect();
}

main().catch(console.error);
