import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAdminSession,
  authErrorResponse,
  requireAuth,
  requireWrite,
} from "@/lib/permissions";
import { categoryUpdateSchema } from "@/lib/validators";
import { formatZodError, formatZodFieldErrors } from "@/lib/validators/format";
import { createAuditLog } from "@/lib/audit";
import { categoryInclude, syncCategoryFormFields } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(await getAdminSession());

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: categoryInclude,
    });

    if (!category) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(category);
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
    const parsed = categoryUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: formatZodError(parsed.error),
          fields: formatZodFieldErrors(parsed.error),
        },
        { status: 400 }
      );
    }

    if (parsed.data.slug) {
      const conflict = await prisma.category.findFirst({
        where: { slug: parsed.data.slug, NOT: { id: params.id } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "Slug already in use" },
          { status: 409 }
        );
      }
    }

    const { formFields, ...categoryData } = parsed.data;

    await prisma.category.update({
      where: { id: params.id },
      data: categoryData,
    });

    if (formFields !== undefined) {
      await syncCategoryFormFields(params.id, formFields);
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: categoryInclude,
    });

    await createAuditLog({
      admin: session,
      action: "CATEGORY_UPDATED",
      targetType: "Category",
      targetId: params.id,
      metadata: parsed.data,
    });

    return NextResponse.json(category);
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

    const paymentCount = await prisma.payment.count({
      where: { categoryId: params.id },
    });

    if (paymentCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete category with existing payments. Deactivate it instead.",
        },
        { status: 409 }
      );
    }

    await prisma.formField.deleteMany({ where: { categoryId: params.id } });
    await prisma.category.delete({ where: { id: params.id } });

    await createAuditLog({
      admin: session,
      action: "CATEGORY_DELETED",
      targetType: "Category",
      targetId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
