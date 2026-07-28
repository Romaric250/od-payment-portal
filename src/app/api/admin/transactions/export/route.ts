import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, authErrorResponse, requireAuth } from "@/lib/permissions";
import type { PaymentStatus } from "@prisma/client";
import { transactionsToPdf } from "@/lib/export-transactions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireAuth(await getAdminSession());

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const status = (searchParams.get("status") ?? "SUCCESSFUL") as PaymentStatus;

    const transactions = await prisma.payment.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        status,
      },
      include: {
        category: { select: { name: true, slug: true } },
        formResponses: { select: { fieldKey: true, value: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const category =
      categoryId && !transactions[0]?.category
        ? await prisma.category.findUnique({
            where: { id: categoryId },
            select: { name: true, slug: true },
          })
        : null;

    const categoryName = transactions[0]?.category?.name ?? category?.name;
    const slug = transactions[0]?.category?.slug ?? category?.slug ?? "all";
    const pdf = await transactionsToPdf(transactions, { categoryName });
    const filename = `${slug}-successful-payments.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
