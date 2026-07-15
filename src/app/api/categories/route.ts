import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      price: true,
      images: true,
      allowCustomAmount: true,
      minimumAmount: true,
      categoryType: true,
      formFields: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          key: true,
          type: true,
          required: true,
          options: true,
          order: true,
          affectsPrice: true,
        },
      },
    },
  });

  return NextResponse.json(categories);
}
