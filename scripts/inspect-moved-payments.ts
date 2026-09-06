import { PrismaClient } from "@prisma/client";

const SUMMIT_ID = "6a68d3d175496544cd212166";
const MOON_ID = "6a5f5f500e0a413246b551fc";

async function main() {
  const prisma = new PrismaClient();

  const [summitCat, moonCat] = await Promise.all([
    prisma.category.findUnique({
      where: { id: SUMMIT_ID },
      include: { formFields: { select: { key: true, label: true } } },
    }),
    prisma.category.findUnique({
      where: { id: MOON_ID },
      include: { formFields: { select: { key: true, label: true } } },
    }),
  ]);

  console.log("Summit created", summitCat?.createdAt, summitCat?.name);
  console.log("Summit fields", summitCat?.formFields);
  console.log("Moon created", moonCat?.createdAt, moonCat?.name);
  console.log("Moon fields", moonCat?.formFields);

  const summit = await prisma.payment.findMany({
    where: { categoryId: SUMMIT_ID, amount: 15000 },
    select: {
      id: true,
      status: true,
      payerName: true,
      payerEmail: true,
      payerPhone: true,
      fapshiTransId: true,
      createdAt: true,
      confirmedAt: true,
      formResponses: { select: { fieldKey: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n=== SUMMIT 15k created BEFORE summit category ===");
  for (const p of summit) {
    if (summitCat && p.createdAt < summitCat.createdAt) {
      console.log(
        JSON.stringify({
          id: p.id,
          status: p.status,
          name: p.payerName,
          email: p.payerEmail,
          created: p.createdAt,
          formKeys: p.formResponses.map((f) => f.fieldKey),
        })
      );
    }
  }

  console.log("\n=== SUMMIT 15k SUCCESSFUL with no summit form fields ===");
  for (const p of summit) {
    if (p.status !== "SUCCESSFUL") continue;
    const keys = p.formResponses.map((f) => f.fieldKey);
    const hasSummitForm = keys.includes("t_shirt_size") || keys.includes("whatsapp_number");
    if (!hasSummitForm) {
      console.log(
        JSON.stringify({
          id: p.id,
          name: p.payerName,
          email: p.payerEmail,
          created: p.createdAt,
          beforeCategory: summitCat ? p.createdAt < summitCat.createdAt : null,
          formKeys: keys,
        })
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
