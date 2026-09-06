import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      _count: { select: { payments: true } },
    },
    orderBy: { name: "asc" },
  });

  console.log("=== CATEGORIES ===");
  for (const c of categories) {
    console.log(
      `${c.id} | ${c.price} | ${c._count.payments} payments | ${c.slug} | ${c.name}`
    );
  }

  const moon = categories.filter((c) =>
    /moon|summer|academy/i.test(`${c.name} ${c.slug}`)
  );
  const summit = categories.filter((c) =>
    /summit|graduate/i.test(`${c.name} ${c.slug}`)
  );

  console.log("\n=== MOON CANDIDATES ===");
  console.log(JSON.stringify(moon, null, 2));
  console.log("\n=== SUMMIT CANDIDATES ===");
  console.log(JSON.stringify(summit, null, 2));

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
