import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthError,
  getAdminSession,
  authErrorResponse,
  requireAuth,
} from "@/lib/permissions";
import { logError, serializeError } from "@/lib/logger";
import type { ExpenseStatus } from "@prisma/client";
import { expensesToPdf } from "@/lib/export-expenses";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  HANDLED: "Handled",
};

export async function GET(request: Request) {
  try {
    requireAuth(await getAdminSession());

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const status = searchParams.get("status") as ExpenseStatus | null;

    const expenses = await prisma.expense.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        category: { select: { name: true, slug: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const category =
      categoryId && !expenses[0]?.category
        ? await prisma.category.findUnique({
            where: { id: categoryId },
            select: { name: true, slug: true },
          })
        : null;

    const categoryName = expenses[0]?.category?.name ?? category?.name;
    const slug = expenses[0]?.category?.slug ?? category?.slug ?? "all";
    const statusLabel = status ? STATUS_LABELS[status] : "All statuses";

    const pdf = await expensesToPdf(expenses, { categoryName, statusLabel });
    const filename = `${slug}-expenses.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    logError("expenses-export", { error: serializeError(error) });
    return NextResponse.json(
      { error: "Unable to generate the export file. Please try again shortly." },
      { status: 500 }
    );
  }
}
