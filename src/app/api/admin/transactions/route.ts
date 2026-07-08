import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, authErrorResponse, requireAuth } from "@/lib/permissions";
import type { PaymentStatus, Network } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireAuth(await getAdminSession());

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const status = searchParams.get("status") as PaymentStatus | null;
    const fulfillmentStatus = searchParams.get("fulfillmentStatus") ?? undefined;
    const network = searchParams.get("network") as Network | null;
    const search = searchParams.get("search") ?? undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
    const skip = (page - 1) * limit;

    const where = {
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status } : {}),
      ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
      ...(network ? { network } : {}),
      ...(search
        ? {
            OR: [
              { payerName: { contains: search, mode: "insensitive" as const } },
              { payerPhone: { contains: search } },
              { payerEmail: { contains: search, mode: "insensitive" as const } },
              { externalId: { contains: search } },
            ],
          }
        : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true, statusPipeline: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
