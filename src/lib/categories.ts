import { prisma } from "@/lib/prisma";
import type { FormFieldInput } from "@/lib/forms";

export async function syncCategoryFormFields(
  categoryId: string,
  formFields: FormFieldInput[]
) {
  await prisma.formField.deleteMany({ where: { categoryId } });

  if (formFields.length === 0) return;

  await prisma.formField.createMany({
    data: formFields.map((field, index) => ({
      categoryId,
      label: field.label,
      key: field.key,
      type: field.type,
      required: field.required,
      options: field.options,
      order: field.order ?? index,
      affectsPrice: field.affectsPrice,
    })),
  });
}

export const categoryInclude = {
  formFields: { orderBy: { order: "asc" as const } },
  _count: { select: { payments: true } },
};
