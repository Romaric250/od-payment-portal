import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAdminSession,
  authErrorResponse,
  requireWrite,
} from "@/lib/permissions";
import { expenseBulkHandleSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = requireWrite(await getAdminSession());
    const body = await request.json();
    const parsed = expenseBulkHandleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { ids } = parsed.data;
    const now = new Date();

    const result = await prisma.expense.updateMany({
      where: {
        id: { in: ids },
        status: { not: "HANDLED" },
      },
      data: {
        status: "HANDLED",
        handledAt: now,
      },
    });

    await createAuditLog({
      admin: session,
      action: "EXPENSES_MARKED_HANDLED",
      targetType: "Expense",
      targetId: ids.join(","),
      metadata: { ids, updatedCount: result.count },
    });

    return NextResponse.json({ updatedCount: result.count });
  } catch (error) {
    return authErrorResponse(error);
  }
}
