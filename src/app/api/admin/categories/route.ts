import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAdminSession,
  authErrorResponse,
  requireWrite,
} from "@/lib/permissions";
import { categorySchema } from "@/lib/validators";
import { formatZodError, formatZodFieldErrors } from "@/lib/validators/format";
import { slugify } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import { categoryInclude, syncCategoryFormFields } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      include: categoryInclude,
    });

    return NextResponse.json(categories);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = requireWrite(await getAdminSession());
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: formatZodError(parsed.error),
          fields: formatZodFieldErrors(parsed.error),
        },
        { status: 400 }
      );
    }

    const { formFields, ...categoryData } = parsed.data;
    const slug = categoryData.slug || slugify(categoryData.name);

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A category with this slug already exists" },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: { ...categoryData, slug },
    });

    await syncCategoryFormFields(category.id, formFields);

    const fullCategory = await prisma.category.findUnique({
      where: { id: category.id },
      include: categoryInclude,
    });

    await createAuditLog({
      admin: session,
      action: "CATEGORY_CREATED",
      targetType: "Category",
      targetId: category.id,
      metadata: { name: category.name },
    });

    return NextResponse.json(fullCategory, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
