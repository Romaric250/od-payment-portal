import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, authErrorResponse, requireAuth } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireAuth(await getAdminSession());

    const [successfulPayments, withdrawals, recentTransactions, categories] =
      await Promise.all([
        prisma.payment.findMany({
          where: { status: "SUCCESSFUL" },
          select: { amount: true, categoryId: true },
        }),
        prisma.withdrawal.findMany({ select: { amount: true } }),
        prisma.payment.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            category: { select: { name: true } },
          },
        }),
        prisma.category.findMany({
          select: { id: true, name: true },
        }),
      ]);

    const totalRevenue = successfulPayments.reduce((s, p) => s + p.amount, 0);
    const totalWithdrawn = withdrawals.reduce((s, w) => s + w.amount, 0);
    const balance = totalRevenue - totalWithdrawn;

    const revenueByCategory = categories.map((category) => {
      const amount = successfulPayments
        .filter((p) => p.categoryId === category.id)
        .reduce((s, p) => s + p.amount, 0);
      return { categoryId: category.id, name: category.name, amount };
    });

    const [successful, pending, failed] = await Promise.all([
      prisma.payment.count({ where: { status: "SUCCESSFUL" } }),
      prisma.payment.count({
        where: { status: { in: ["PENDING", "INITIATED"] } },
      }),
      prisma.payment.count({
        where: { status: { in: ["FAILED", "EXPIRED"] } },
      }),
    ]);

    return NextResponse.json({
      totalRevenue,
      totalWithdrawn,
      balance,
      revenueByCategory,
      recentTransactions,
      counts: { successful, pending, failed },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
