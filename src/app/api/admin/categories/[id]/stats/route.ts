import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, authErrorResponse, requireAuth } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(await getAdminSession());

    const category = await prisma.category.findUnique({
      where: { id: params.id },
    });

    if (!category) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const payments = await prisma.payment.findMany({
      where: { categoryId: params.id },
      select: {
        status: true,
        amount: true,
        fulfillmentStatus: true,
      },
    });

    const successful = payments.filter((p) => p.status === "SUCCESSFUL");
    const totalCollected = successful.reduce((sum, p) => sum + p.amount, 0);

    const fulfillmentBreakdown: Record<string, number> = {};
    for (const status of category.statusPipeline) {
      fulfillmentBreakdown[status] = 0;
    }
    for (const payment of successful) {
      const status = payment.fulfillmentStatus ?? category.statusPipeline[0];
      fulfillmentBreakdown[status] = (fulfillmentBreakdown[status] ?? 0) + 1;
    }

    const statusCounts = {
      total: payments.length,
      successful: payments.filter((p) => p.status === "SUCCESSFUL").length,
      pending: payments.filter(
        (p) => p.status === "PENDING" || p.status === "INITIATED"
      ).length,
      failed: payments.filter(
        (p) => p.status === "FAILED" || p.status === "EXPIRED"
      ).length,
    };

    const averageOrderValue =
      successful.length > 0
        ? Math.round(totalCollected / successful.length)
        : 0;

    return NextResponse.json({
      totalCollected,
      statusCounts,
      fulfillmentBreakdown,
      averageOrderValue,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
