import { PrismaClient } from "@prisma/client";

const SUMMIT_ID = "6a68d3d175496544cd212166";
const MOON_ID = "6a5f5f500e0a413246b551fc";

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^237/, "");
}

async function main() {
  const prisma = new PrismaClient();

  const select = {
    id: true,
    status: true,
    payerName: true,
    payerEmail: true,
    payerPhone: true,
    amount: true,
    fapshiTransId: true,
    financialTransId: true,
    externalId: true,
    createdAt: true,
    confirmedAt: true,
    formResponses: { select: { fieldKey: true, value: true } },
  } as const;

  const moon = await prisma.payment.findMany({
    where: { categoryId: MOON_ID },
    select,
    orderBy: { createdAt: "asc" },
  });

  const summit = await prisma.payment.findMany({
    where: { categoryId: SUMMIT_ID },
    select,
    orderBy: { createdAt: "asc" },
  });

  console.log("=== PROJECT MOON PAYMENTS ===", moon.length);
  for (const p of moon) {
    console.log(
      JSON.stringify({
        id: p.id,
        status: p.status,
        name: p.payerName,
        email: p.payerEmail,
        phone: p.payerPhone,
        amount: p.amount,
        fapshi: p.fapshiTransId,
        financial: p.financialTransId,
        created: p.createdAt,
        confirmed: p.confirmedAt,
        form: p.formResponses,
      })
    );
  }

  console.log("\n=== GRADUATE SUMMIT PAYMENTS ===", summit.length);
  for (const p of summit) {
    console.log(
      JSON.stringify({
        id: p.id,
        status: p.status,
        name: p.payerName,
        email: p.payerEmail,
        phone: p.payerPhone,
        amount: p.amount,
        fapshi: p.fapshiTransId,
        financial: p.financialTransId,
        created: p.createdAt,
        confirmed: p.confirmedAt,
        form: p.formResponses,
      })
    );
  }

  const moonNames = new Map<string, typeof moon>();
  const moonEmails = new Map<string, typeof moon>();
  const moonPhones = new Map<string, typeof moon>();

  for (const p of moon) {
    const n = normalizeName(p.payerName);
    const e = normalizeEmail(p.payerEmail);
    const ph = normalizePhone(p.payerPhone);
    if (n) moonNames.set(n, [...(moonNames.get(n) ?? []), p]);
    if (e) moonEmails.set(e, [...(moonEmails.get(e) ?? []), p]);
    if (ph.length >= 8) moonPhones.set(ph, [...(moonPhones.get(ph) ?? []), p]);
  }

  const matches: Array<{
    reason: string;
    summit: (typeof summit)[number];
    moon: (typeof moon)[number];
  }> = [];

  for (const s of summit) {
    const byName = moonNames.get(normalizeName(s.payerName));
    const byEmail = moonEmails.get(normalizeEmail(s.payerEmail));
    const byPhone = moonPhones.get(normalizePhone(s.payerPhone));
    const moonHit = byEmail?.[0] ?? byPhone?.[0] ?? byName?.[0];
    if (!moonHit) continue;
    const reasons = [
      byEmail ? "email" : null,
      byPhone ? "phone" : null,
      byName ? "name" : null,
    ].filter(Boolean);
    matches.push({ reason: reasons.join("+"), summit: s, moon: moonHit });
  }

  console.log("\n=== MATCHES TO REMOVE FROM SUMMIT ===", matches.length);
  for (const m of matches) {
    console.log(
      JSON.stringify({
        reason: m.reason,
        summitId: m.summit.id,
        summitStatus: m.summit.status,
        name: m.summit.payerName,
        email: m.summit.payerEmail,
        phone: m.summit.payerPhone,
        moonId: m.moon.id,
        moonStatus: m.moon.status,
        moonName: m.moon.payerName,
        moonEmail: m.moon.payerEmail,
      })
    );
  }

  const summitByStatus = summit.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});
  const moonByStatus = moon.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\nSummit status", summitByStatus);
  console.log("Moon status", moonByStatus);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
