import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAdminSession,
  authErrorResponse,
  requireAuth,
  requireWrite,
} from "@/lib/permissions";
import { expenseUpdateSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(await getAdminSession());

    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = requireWrite(await getAdminSession());
    const body = await request.json();
    const parsed = expenseUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await prisma.expense.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const nextStatus = parsed.data.status ?? existing.status;
    let handledAt = existing.handledAt;
    if (nextStatus === "HANDLED" && existing.status !== "HANDLED") {
      handledAt = new Date();
    } else if (nextStatus !== "HANDLED") {
      handledAt = null;
    }

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        categoryId: parsed.data.categoryId === null ? null : parsed.data.categoryId,
        handledAt,
      },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      admin: session,
      action: "EXPENSE_UPDATED",
      targetType: "Expense",
      targetId: expense.id,
      metadata: parsed.data,
    });

    return NextResponse.json(expense);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = requireWrite(await getAdminSession());

    await prisma.expense.delete({ where: { id: params.id } });

    await createAuditLog({
      admin: session,
      action: "EXPENSE_DELETED",
      targetType: "Expense",
      targetId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
