/**
 * Resend success emails (payer receipt + WhatsApp info + admin notifications)
 * for Graduate Summit successful 15,000 FCFA payments from the Fapshi CSV.
 *
 * Usage:
 *   npx tsx scripts/resend-graduate-summit-emails.ts --dry-run
 *   npx tsx scripts/resend-graduate-summit-emails.ts --execute
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { fapshiService } from "../src/lib/fapshi";
import { sendPaymentSuccessEmails } from "../src/lib/emails/payment-success";

const CATEGORY_ID = "6a68d3d175496544cd212166";
const TARGET_AMOUNT = 15_000;
const CSV_PATH = path.join(
  process.cwd(),
  "transactions-Registration Fee-2026-08-15.csv"
);

const prisma = new PrismaClient();

interface CsvRow {
  transactionId: string;
  reference: string;
  customer: string;
  amount: number;
  status: string;
}

function parseAmount(raw: string): number {
  return parseInt(raw.replace(/[^\d]/g, ""), 10) || 0;
}

function parseCsvLine(line: string): CsvRow | null {
  const statusMatch = line.match(/,(SUCCESSFUL|EXPIRED|FAILED|PENDING),(.+)$/);
  if (!statusMatch) return null;

  const prefix = line.slice(0, line.length - statusMatch[0].length);
  const match = prefix.match(
    /^([^,]+),([0-9a-f-]{36}),([\s\S]*?),FCFA[\s\u00a0\u202f]*([\d,]+),FCFA[\s\u00a0\u202f]*([\d,]+|—),([^,]+)$/
  );
  if (!match) return null;

  return {
    transactionId: match[1].trim(),
    reference: match[2].trim(),
    customer: match[3].trim(),
    amount: parseAmount(match[4]),
    status: statusMatch[1],
  };
}

function parseCsv(content: string): CsvRow[] {
  return content
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine)
    .filter((row): row is CsvRow => row !== null);
}

async function findPaymentId(row: CsvRow): Promise<string | null> {
  const byReference = await prisma.payment.findUnique({
    where: { externalId: row.reference },
    select: { id: true },
  });
  if (byReference) return byReference.id;

  const byTransId = await prisma.payment.findUnique({
    where: { fapshiTransId: row.transactionId },
    select: { id: true },
  });
  if (byTransId) return byTransId.id;

  try {
    const status = await fapshiService.checkPaymentStatus(row.transactionId);
    const userId = (status as { userId?: string }).userId?.trim();
    if (userId) {
      const byUserId = await prisma.payment.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (byUserId) return byUserId.id;
    }
  } catch {
    // ignore
  }

  return null;
}

async function main() {
  const dryRun = !process.argv.includes("--execute");

  const rows = parseCsv(fs.readFileSync(CSV_PATH, "utf8")).filter(
    (row) => row.status === "SUCCESSFUL" && row.amount === TARGET_AMOUNT
  );

  const category = await prisma.category.findUnique({
    where: { id: CATEGORY_ID },
    select: { name: true, notificationEmails: true },
  });

  if (!category) throw new Error("Category not found");

  console.log(`Mode: ${dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log(`Category: ${category.name}`);
  console.log(`Admin notification emails: ${category.notificationEmails.join(", ") || "(global fallback)"}`);
  console.log(`Payments to email: ${rows.length}\n`);

  const report = {
    sent: 0,
    skipped: 0,
    notFound: [] as string[],
    errors: [] as string[],
  };

  for (const row of rows) {
    const paymentId = await findPaymentId(row);
    if (!paymentId) {
      report.notFound.push(`${row.customer || row.transactionId} (${row.transactionId})`);
      continue;
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { category: true },
    });

    if (!payment || payment.status !== "SUCCESSFUL") {
      report.skipped += 1;
      console.log(`Skip (not successful): ${row.customer} -> ${paymentId}`);
      continue;
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would email ${payment.payerName} <${payment.payerEmail}>`);
      report.sent += 1;
      continue;
    }

    try {
      await sendPaymentSuccessEmails(payment);
      console.log(`Sent: ${payment.payerName} <${payment.payerEmail}>`);
      report.sent += 1;
    } catch (error) {
      report.errors.push(
        `${payment.payerName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const outputPath = path.join(
    process.cwd(),
    "scripts/output/graduate-summit-email-resend.json"
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(report, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
