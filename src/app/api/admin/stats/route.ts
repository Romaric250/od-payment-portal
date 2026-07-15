import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, authErrorResponse, requireAuth } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireAuth(await getAdminSession());

    const [successfulPayments, withdrawals, recentTransactions, categories, expenses] =
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
            category: { select: { name: true, statusPipeline: true } },
          },
        }),
        prisma.category.findMany({
          select: { id: true, name: true },
        }),
        prisma.expense.findMany({
          select: { amount: true, status: true, categoryId: true },
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

    const categorySummaries = categories.map((category) => {
      const categoryPayments = successfulPayments.filter(
        (p) => p.categoryId === category.id
      );
      const categoryExpenses = expenses.filter((e) => e.categoryId === category.id);
      const successfulTotal = categoryPayments.reduce((s, p) => s + p.amount, 0);
      const expenseTotal = categoryExpenses.reduce((s, e) => s + e.amount, 0);

      return {
        categoryId: category.id,
        name: category.name,
        totalPayments: categoryPayments.length,
        successfulPayments: categoryPayments.length,
        pendingPayments: 0,
        expenses: expenseTotal,
        netBalance: successfulTotal - expenseTotal,
      };
    });

    const [successful, pending, failed, allPayments] = await Promise.all([
      prisma.payment.count({ where: { status: "SUCCESSFUL" } }),
      prisma.payment.count({
        where: { status: { in: ["PENDING", "INITIATED"] } },
      }),
      prisma.payment.count({
        where: { status: { in: ["FAILED", "EXPIRED"] } },
      }),
      prisma.payment.groupBy({
        by: ["categoryId"],
        _count: { _all: true },
      }),
    ]);

    for (const summary of categorySummaries) {
      const counts = allPayments.find((p) => p.categoryId === summary.categoryId);
      if (counts) {
        summary.totalPayments = counts._count._all;
      }
    }

    const pendingByCategory = await prisma.payment.groupBy({
      by: ["categoryId"],
      where: { status: { in: ["PENDING", "INITIATED"] } },
      _count: { _all: true },
    });

    for (const summary of categorySummaries) {
      const pendingCount = pendingByCategory.find(
        (p) => p.categoryId === summary.categoryId
      );
      summary.pendingPayments = pendingCount?._count._all ?? 0;
    }

    const expenseSummary = {
      totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
      pendingExpenses: expenses
        .filter((e) => e.status === "PENDING")
        .reduce((s, e) => s + e.amount, 0),
      handledExpenses: expenses
        .filter((e) => e.status === "HANDLED")
        .reduce((s, e) => s + e.amount, 0),
      approvedExpenses: expenses
        .filter((e) => e.status === "APPROVED")
        .reduce((s, e) => s + e.amount, 0),
      counts: {
        total: expenses.length,
        pending: expenses.filter((e) => e.status === "PENDING").length,
        approved: expenses.filter((e) => e.status === "APPROVED").length,
        handled: expenses.filter((e) => e.status === "HANDLED").length,
      },
    };

    return NextResponse.json({
      totalRevenue,
      totalWithdrawn,
      balance,
      revenueByCategory,
      categorySummaries,
      expenseSummary,
      recentTransactions,
      counts: { successful, pending, failed },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
