import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  const sampleIds = [
    "6a72ef3a506a7f6ee64d4307",
    "6a712cd025ca351d90669cbd",
    "6a70ebcd58c71460316051b1",
  ];

  const byId = await prisma.payment.findMany({
    where: { id: { in: sampleIds } },
    select: {
      id: true,
      categoryId: true,
      status: true,
      payerName: true,
      externalId: true,
      fapshiTransId: true,
    },
  });

  const categoryPayments = await prisma.payment.findMany({
    where: { categoryId: "6a68d3d175496544cd212166" },
    select: {
      id: true,
      status: true,
      payerName: true,
      externalId: true,
      fapshiTransId: true,
    },
  });

  console.log("sample by id", JSON.stringify(byId, null, 2));
  console.log("category total", categoryPayments.length);
  console.log(
    "category status",
    categoryPayments.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {})
  );

  await prisma.$disconnect();
}

main().catch(console.error);
