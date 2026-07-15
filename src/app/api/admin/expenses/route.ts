import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAdminSession,
  authErrorResponse,
  requireAuth,
  requireWrite,
} from "@/lib/permissions";
import { expenseSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireAuth(await getAdminSession());

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const expenses = await prisma.expense.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(status ? { status: status as "PENDING" | "APPROVED" | "HANDLED" } : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = requireWrite(await getAdminSession());
    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    if (parsed.data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: parsed.data.categoryId },
      });
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
    }

    const expense = await prisma.expense.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        amount: parsed.data.amount,
        status: parsed.data.status,
        categoryId: parsed.data.categoryId ?? null,
        createdById: session.id,
        handledAt: parsed.data.status === "HANDLED" ? new Date() : null,
      },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      admin: session,
      action: "EXPENSE_CREATED",
      targetType: "Expense",
      targetId: expense.id,
      metadata: { title: expense.title, amount: expense.amount },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
