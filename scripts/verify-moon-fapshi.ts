import { PrismaClient } from "@prisma/client";
import { fapshiService } from "../src/lib/fapshi";

const SUMMIT_ID = "6a68d3d175496544cd212166";
const MOON_ID = "6a5f5f500e0a413246b551fc";

type Row = {
  category: string;
  name: string;
  email: string;
  dbStatus: string;
  fapshiStatus: string;
  amount: number;
  transId: string;
  financialId: string;
  ok: boolean;
  error?: string;
};

async function main() {
  const prisma = new PrismaClient();

  const payments = await prisma.payment.findMany({
    where: {
      categoryId: { in: [MOON_ID, SUMMIT_ID] },
      status: "SUCCESSFUL",
      amount: 15000,
    },
    include: { category: { select: { name: true } } },
    orderBy: [{ categoryId: "asc" }, { payerName: "asc" }],
  });

  const rows: Row[] = [];

  for (const payment of payments) {
    const category = payment.category.name;
    if (!payment.fapshiTransId) {
      rows.push({
        category,
        name: payment.payerName,
        email: payment.payerEmail,
        dbStatus: payment.status,
        fapshiStatus: "NO_TRANS_ID",
        amount: payment.amount,
        transId: "",
        financialId: payment.financialTransId ?? "",
        ok: false,
        error: "Missing fapshiTransId",
      });
      continue;
    }

    try {
      const fapshi = await fapshiService.checkPaymentStatus(payment.fapshiTransId);
      const raw = fapshi as typeof fapshi & { financialTransId?: string };
      const fapshiStatus = (fapshi.status ?? "UNKNOWN").toUpperCase();
      const ok = fapshiStatus === "SUCCESSFUL" || fapshiStatus === "SUCCESS";
      rows.push({
        category,
        name: payment.payerName,
        email: payment.payerEmail,
        dbStatus: payment.status,
        fapshiStatus,
        amount: payment.amount,
        transId: payment.fapshiTransId,
        financialId: raw.financialTransId ?? payment.financialTransId ?? "",
        ok,
      });
    } catch (error) {
      rows.push({
        category,
        name: payment.payerName,
        email: payment.payerEmail,
        dbStatus: payment.status,
        fapshiStatus: "ERROR",
        amount: payment.amount,
        transId: payment.fapshiTransId,
        financialId: payment.financialTransId ?? "",
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  const moon = rows.filter((r) => r.category.includes("Moon"));
  const summit = rows.filter((r) => r.category.includes("Summit"));

  function printGroup(title: string, group: Row[]) {
    const ok = group.filter((r) => r.ok).length;
    const bad = group.filter((r) => !r.ok);
    console.log(`\n=== ${title} ===`);
    console.log(`Successful on Fapshi: ${ok}/${group.length}`);
    for (const row of group) {
      console.log(
        `${row.ok ? "OK" : "NOT_OK"} ${row.fapshiStatus} | ${row.name} <${row.email}> | ${row.transId} | ${row.financialId || "-"}`
      );
    }
    if (bad.length) {
      console.log(`\nNeeds attention (${bad.length}):`);
      for (const row of bad) {
        console.log(`- ${row.name} | Fapshi=${row.fapshiStatus} | ${row.transId} | ${row.error ?? ""}`);
      }
    }
  }

  printGroup("Project Moon", moon);
  printGroup("Graduate Summit", summit);

  console.log("\n=== TOTAL ===");
  console.log(`Checked: ${rows.length}`);
  console.log(`Fapshi SUCCESSFUL: ${rows.filter((r) => r.ok).length}`);
  console.log(`Not successful / errors: ${rows.filter((r) => !r.ok).length}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
