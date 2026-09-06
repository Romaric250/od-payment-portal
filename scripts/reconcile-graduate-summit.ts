/**
 * Reconcile Graduate Summit payments from Fapshi CSV export.
 *
 * Success emails are sent ONLY when a payment is newly created or
 * confirmed from pending/initiated to successful (first-time only).
 * Already-successful payments are never re-emailed.
 *
 * Usage:
 *   npx tsx scripts/reconcile-graduate-summit.ts --dry-run
 *   npx tsx scripts/reconcile-graduate-summit.ts --execute
 */

import fs from "fs";
import path from "path";
import { PrismaClient, type Network, type Payment } from "@prisma/client";
import { fapshiService } from "../src/lib/fapshi";
import { finalizePaymentStatus } from "../src/lib/payments";
import { normalizePhone, detectNetwork } from "../src/lib/validators";

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
  paymentMethod: string;
  status: string;
  date: string;
}

interface FapshiDetails {
  transId: string;
  externalId: string;
  payerName: string;
  email: string;
  medium: string;
  paymentId: string | null;
  confirmedAt: Date;
  amount: number;
}

interface MissingContact {
  transactionId: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  amount: number;
  date: string;
  reason: string;
}

function parseAmount(raw: string): number {
  return parseInt(raw.replace(/[^\d]/g, ""), 10) || 0;
}

function parseCsvLine(line: string): CsvRow | null {
  const statusMatch = line.match(/,(SUCCESSFUL|EXPIRED|FAILED|PENDING),(.+)$/);
  if (!statusMatch) return null;

  const status = statusMatch[1];
  const date = statusMatch[2];
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
    paymentMethod: match[6].trim(),
    status,
    date: date.trim(),
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

function mapNetwork(medium: string, fallbackMethod: string): Network {
  const value = `${medium} ${fallbackMethod}`.toLowerCase();
  return value.includes("orange") ? "ORANGE" : "MTN";
}

function parseCsvDate(raw: string): Date {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFapshiDetails(row: CsvRow): Promise<FapshiDetails | null> {
  try {
    const status = await fapshiService.checkPaymentStatus(row.transactionId);
    if (status.status?.toUpperCase() !== "SUCCESSFUL") {
      return null;
    }

    const raw = status as typeof status & {
      payerName?: string;
      email?: string;
      medium?: string;
      userId?: string;
      dateConfirmed?: string;
    };

    return {
      transId: row.transactionId,
      externalId: raw.externalId ?? row.reference,
      payerName: raw.payerName?.trim() || (row.customer === "—" ? "" : row.customer),
      email: raw.email?.trim() ?? "",
      medium: raw.medium ?? row.paymentMethod,
      paymentId: raw.userId?.trim() || null,
      confirmedAt: raw.dateConfirmed
        ? new Date(raw.dateConfirmed)
        : parseCsvDate(row.date),
      amount: raw.amount ?? row.amount,
    };
  } catch (error) {
    console.error(`Fapshi lookup failed for ${row.transactionId}`, error);
    return null;
  }
}

async function findPayment(
  details: FapshiDetails,
  row: CsvRow,
  existingPayments: Payment[]
): Promise<Payment | undefined> {
  const byExternalId = new Map(existingPayments.map((p) => [p.externalId, p]));
  const byFapshiTransId = new Map(
    existingPayments.filter((p) => p.fapshiTransId).map((p) => [p.fapshiTransId as string, p])
  );
  const byId = new Map(existingPayments.map((p) => [p.id, p]));

  if (details.paymentId && byId.has(details.paymentId)) {
    return byId.get(details.paymentId);
  }

  const byReference = byExternalId.get(details.externalId) ?? byExternalId.get(row.reference);
  if (byReference) return byReference;

  const byTrans = byFapshiTransId.get(details.transId);
  if (byTrans) return byTrans;

  if (details.paymentId) {
    const anywhere = await prisma.payment.findUnique({ where: { id: details.paymentId } });
    if (anywhere) return anywhere;
  }

  if (details.payerName) {
    const normalized = normalizeName(details.payerName);
    const matches = existingPayments.filter(
      (p) =>
        p.amount === TARGET_AMOUNT &&
        p.status !== "SUCCESSFUL" &&
        normalizeName(p.payerName) === normalized
    );
    if (matches.length === 1) return matches[0];
  }

  return undefined;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = !args.has("--execute");

  const csvRows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const successful15000 = csvRows.filter(
    (row) => row.status === "SUCCESSFUL" && row.amount === TARGET_AMOUNT
  );

  const category = await prisma.category.findUnique({
    where: { id: CATEGORY_ID },
  });
  if (!category) throw new Error(`Category not found: ${CATEGORY_ID}`);

  const existingPayments = await prisma.payment.findMany({
    where: { categoryId: CATEGORY_ID },
  });

  const allPayments = await prisma.payment.findMany({
    where: {
      OR: [
        { categoryId: CATEGORY_ID },
        { externalId: { in: successful15000.map((row) => row.reference) } },
        { fapshiTransId: { in: successful15000.map((row) => row.transactionId) } },
      ],
    },
  });

  const report = {
    csvSuccessful15000: successful15000.length,
    alreadySuccessful: 0,
    confirmedPending: 0,
    emailsSent: 0,
    created: 0,
    skipped: 0,
    errors: [] as string[],
    missingContacts: [] as MissingContact[],
  };

  console.log(`Mode: ${dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log(`Category: ${category.name}`);
  console.log(`CSV successful 15,000: ${successful15000.length}`);

  for (const row of successful15000) {
    const details = await fetchFapshiDetails(row);
    if (!details) {
      report.skipped += 1;
      continue;
    }

    let payment = await findPayment(details, row, allPayments);

    if (payment && payment.categoryId !== CATEGORY_ID) {
      if (!dryRun) {
        payment = await prisma.payment.update({
          where: { id: payment.id },
          data: { categoryId: CATEGORY_ID },
        });
      }
      console.log(`Aligned category for payment ${payment.id}`);
    }

    if (payment?.status === "SUCCESSFUL") {
      report.alreadySuccessful += 1;
      continue;
    }

    if (payment) {
      if (dryRun) {
        console.log(`[DRY RUN] Confirm ${payment.payerName} (${payment.id})`);
        report.confirmedPending += 1;
        continue;
      }

      try {
        if (details.email && payment.payerEmail !== details.email) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              payerEmail: details.email,
              payerName: details.payerName || payment.payerName,
            },
          });
        }

        await finalizePaymentStatus({
          paymentId: payment.id,
          status: "SUCCESSFUL",
          fapshiTransId: details.transId,
          confirmedAt: details.confirmedAt,
        });
        console.log(`Confirmed: ${payment.payerName} (${payment.id})`);
        report.confirmedPending += 1;
        report.emailsSent += 1;
      } catch (error) {
        report.errors.push(
          `Confirm ${payment.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      continue;
    }

    const payerName = details.payerName;
    const payerEmail = details.email;

    if (!payerName || !payerEmail) {
      report.missingContacts.push({
        transactionId: details.transId,
        reference: details.externalId,
        name: payerName || row.customer,
        email: payerEmail,
        phone: "",
        amount: row.amount,
        date: row.date,
        reason: "Missing name or email from Fapshi",
      });
      report.skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(`[DRY RUN] Create ${payerName} <${payerEmail}>`);
      report.created += 1;
      continue;
    }

    try {
      const network = mapNetwork(details.medium, row.paymentMethod);
      const created = await prisma.payment.create({
        data: {
          categoryId: CATEGORY_ID,
          payerName,
          payerEmail,
          payerPhone: "670000000",
          network,
          amount: TARGET_AMOUNT,
          externalId: details.externalId,
          fapshiTransId: details.transId,
          status: "PENDING",
        },
      });

      await finalizePaymentStatus({
        paymentId: created.id,
        status: "SUCCESSFUL",
        fapshiTransId: details.transId,
        confirmedAt: details.confirmedAt,
      });

      report.missingContacts.push({
        transactionId: details.transId,
        reference: details.externalId,
        name: payerName,
        email: payerEmail,
        phone: "670000000",
        amount: row.amount,
        date: row.date,
        reason: "Created from Fapshi export; phone placeholder used",
      });

      console.log(`Created: ${payerName} (${created.id})`);
      report.created += 1;
      report.emailsSent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Unique constraint")) {
        const existing = await prisma.payment.findFirst({
          where: {
            OR: [{ externalId: details.externalId }, { fapshiTransId: details.transId }],
          },
        });
        if (existing && existing.status !== "SUCCESSFUL") {
          await finalizePaymentStatus({
            paymentId: existing.id,
            status: "SUCCESSFUL",
            fapshiTransId: details.transId,
            confirmedAt: details.confirmedAt,
          });
          report.confirmedPending += 1;
          report.emailsSent += 1;
          continue;
        }
      }
      report.errors.push(`Create ${payerName}: ${message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const pendingInCategory = await prisma.payment.findMany({
    where: { categoryId: CATEGORY_ID, status: { in: ["PENDING", "INITIATED"] } },
    select: {
      id: true,
      payerName: true,
      payerEmail: true,
      payerPhone: true,
      amount: true,
      fapshiTransId: true,
      externalId: true,
      createdAt: true,
    },
  });

  const csvNames = new Set(
    successful15000
      .map((row) => (row.customer === "—" ? "" : normalizeName(row.customer)))
      .filter(Boolean)
  );

  for (const pending of pendingInCategory) {
    if (pending.amount !== TARGET_AMOUNT || !pending.fapshiTransId) continue;

    try {
      const fapshiStatus = await fapshiService.checkPaymentStatus(pending.fapshiTransId);
      if (fapshiStatus.status?.toUpperCase() !== "SUCCESSFUL") {
        const normalized = normalizeName(pending.payerName);
        if (!csvNames.has(normalized)) {
          report.missingContacts.push({
            transactionId: pending.fapshiTransId,
            reference: pending.externalId,
            name: pending.payerName,
            email: pending.payerEmail,
            phone: pending.payerPhone,
            amount: pending.amount,
            date: pending.createdAt.toISOString(),
            reason: `Still ${fapshiStatus.status ?? "unknown"} on Fapshi — follow up manually`,
          });
        }
        continue;
      }

      if (dryRun) {
        console.log(`[DRY RUN] Confirm pending ${pending.payerName} (${pending.id})`);
        report.confirmedPending += 1;
        continue;
      }

      await finalizePaymentStatus({
        paymentId: pending.id,
        status: "SUCCESSFUL",
        fapshiTransId: pending.fapshiTransId,
        confirmedAt: fapshiStatus.date ? new Date(fapshiStatus.date) : new Date(),
      });
      console.log(`Confirmed pending: ${pending.payerName} (${pending.id})`);
      report.confirmedPending += 1;
      report.emailsSent += 1;
    } catch (error) {
      report.errors.push(
        `Pending check ${pending.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const stillMissing = await prisma.payment.findMany({
    where: {
      categoryId: CATEGORY_ID,
      status: { in: ["PENDING", "INITIATED"] },
      amount: TARGET_AMOUNT,
    },
    select: {
      id: true,
      payerName: true,
      payerEmail: true,
      payerPhone: true,
      amount: true,
      fapshiTransId: true,
      externalId: true,
      createdAt: true,
    },
  });

  for (const pending of stillMissing) {
    if (
      report.missingContacts.some(
        (item) => item.reference === pending.externalId || item.email === pending.payerEmail
      )
    ) {
      continue;
    }

    report.missingContacts.push({
      transactionId: pending.fapshiTransId ?? "",
      reference: pending.externalId,
      name: pending.payerName,
      email: pending.payerEmail,
      phone: pending.payerPhone,
      amount: pending.amount,
      date: pending.createdAt.toISOString(),
      reason: "Still pending on platform after reconciliation",
    });
  }

  const uniqueMissing = new Map<string, MissingContact>();
  for (const item of report.missingContacts) {
    uniqueMissing.set(`${item.email}|${item.reference}`, item);
  }
  report.missingContacts = [...uniqueMissing.values()];

  const outputDir = path.join(process.cwd(), "scripts", "output");
  fs.mkdirSync(outputDir, { recursive: true });

  const missingPath = path.join(outputDir, "graduate-summit-missing-contacts.csv");
  const missingCsv = [
    "TransactionId,Reference,Name,Email,Phone,Amount,Date,Reason",
    ...report.missingContacts.map((item) =>
      [
        item.transactionId,
        item.reference,
        `"${item.name.replace(/"/g, '""')}"`,
        item.email,
        item.phone,
        item.amount,
        `"${item.date}"`,
        `"${item.reason.replace(/"/g, '""')}"`,
      ].join(",")
    ),
  ].join("\n");
  fs.writeFileSync(missingPath, missingCsv);

  const summaryPath = path.join(outputDir, "graduate-summit-reconciliation-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(report, null, 2));

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Missing contacts: ${missingPath}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
