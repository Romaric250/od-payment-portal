import { PrismaClient } from "@prisma/client";
import { fapshiService } from "../src/lib/fapshi";

const SUMMIT_ID = "6a68d3d175496544cd212166";

async function main() {
  const prisma = new PrismaClient();
  const summit = await prisma.payment.findMany({
    where: { categoryId: SUMMIT_ID, amount: 15000, status: "SUCCESSFUL" },
    select: {
      id: true,
      payerName: true,
      payerEmail: true,
      fapshiTransId: true,
      createdAt: true,
      formResponses: { select: { fieldKey: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const p of summit) {
    const hasForm = p.formResponses.some(
      (f) => f.fieldKey === "t_shirt_size" || f.fieldKey === "whatsapp_number"
    );
    if (!p.fapshiTransId) {
      console.log(`${p.payerName} | ${p.id} | no fapshi id | form=${hasForm}`);
      continue;
    }
    try {
      const status = await fapshiService.checkPaymentStatus(p.fapshiTransId);
      const raw = status as typeof status & {
        redirectUrl?: string;
        userId?: string;
        email?: string;
      };
      const url = raw.redirectUrl ?? "";
      const slug = url.includes("project-moon")
        ? "MOON"
        : url.includes("graduate-summit")
          ? "SUMMIT"
          : url
            ? `OTHER:${url}`
            : "NO_REDIRECT";
      console.log(
        `${slug} | form=${hasForm ? "yes" : "no"} | ${p.createdAt.toISOString().slice(0, 10)} | ${p.payerName} | ${p.fapshiTransId} | ${raw.email ?? p.payerEmail}`
      );
    } catch (error) {
      console.log(
        `ERROR | ${p.payerName} | ${p.fapshiTransId} | ${error instanceof Error ? error.message : String(error)}`
      );
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
