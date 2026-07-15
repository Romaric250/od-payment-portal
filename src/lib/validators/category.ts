import { z } from "zod";

export const formFieldTypes = [
  "TEXT",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
  "TEXTAREA",
] as const;

export const categoryTypes = [
  "STANDARD",
  "TSHIRT",
  "DONATION",
  "EVENT",
  "SCHOLARSHIP",
] as const;

export const expenseStatuses = ["PENDING", "APPROVED", "HANDLED"] as const;

const httpUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Image URL must be a valid http(s) URL" }
  );

export const formFieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Field label is required").max(120),
  key: z
    .string()
    .min(2, "Field key must be at least 2 characters")
    .max(80)
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, and underscores"),
  type: z.enum(formFieldTypes),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1).max(120)).default([]),
  order: z.number().int().min(0).default(0),
  affectsPrice: z.boolean().default(false),
});

const categoryBaseSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .optional()
    .nullable()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    }),
  price: z
    .number({ error: "Price is required" })
    .int()
    .min(100, "Minimum price is 100 XAF"),
  images: z.array(httpUrlSchema).default([]),
  isActive: z.boolean().default(true),
  displayOrder: z
    .number({ error: "Display order must be a number" })
    .int()
    .min(0)
    .default(0),
  statusPipeline: z
    .array(z.string().trim().min(1).max(80))
    .min(1, "At least one fulfillment status is required"),
  allowCustomAmount: z.boolean().default(false),
  minimumAmount: z.number().int().min(100).nullish(),
  categoryType: z.enum(categoryTypes).default("STANDARD"),
  formFields: z.array(formFieldSchema).default([]),
});

function refineCategoryData(
  data: z.infer<typeof categoryBaseSchema>,
  ctx: z.RefinementCtx
) {
  if (data.allowCustomAmount && (data.minimumAmount == null || data.minimumAmount < 100)) {
    ctx.addIssue({
      code: "custom",
      message: "Minimum amount (at least 100 XAF) is required when custom amounts are enabled",
      path: ["minimumAmount"],
    });
  }

  const keys = new Set<string>();
  for (const field of data.formFields) {
    if (keys.has(field.key)) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate field key: ${field.key}`,
        path: ["formFields"],
      });
    }
    keys.add(field.key);

    if (
      (field.type === "SELECT" || field.type === "MULTI_SELECT") &&
      field.options.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: `${field.label} requires at least one option`,
        path: ["formFields"],
      });
    }

    if (field.affectsPrice && field.type !== "NUMBER") {
      ctx.addIssue({
        code: "custom",
        message: `${field.label}: only NUMBER fields can affect price`,
        path: ["formFields"],
      });
    }
  }

  const priceFields = data.formFields.filter((f) => f.affectsPrice);
  if (priceFields.length > 1) {
    ctx.addIssue({
      code: "custom",
      message: "Only one field can multiply the category price",
      path: ["formFields"],
    });
  }
}

function refineCategoryUpdateData(
  data: Partial<z.infer<typeof categoryBaseSchema>>,
  ctx: z.RefinementCtx
) {
  if (
    data.allowCustomAmount === true &&
    (data.minimumAmount == null || data.minimumAmount < 100)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Minimum amount (at least 100 XAF) is required when custom amounts are enabled",
      path: ["minimumAmount"],
    });
  }

  if (!data.formFields) return;

  const keys = new Set<string>();
  for (const field of data.formFields) {
    if (keys.has(field.key)) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate field key: ${field.key}`,
        path: ["formFields"],
      });
    }
    keys.add(field.key);

    if (
      (field.type === "SELECT" || field.type === "MULTI_SELECT") &&
      field.options.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: `${field.label} requires at least one option`,
        path: ["formFields"],
      });
    }

    if (field.affectsPrice && field.type !== "NUMBER") {
      ctx.addIssue({
        code: "custom",
        message: `${field.label}: only NUMBER fields can affect price`,
        path: ["formFields"],
      });
    }
  }

  const priceFields = data.formFields.filter((f) => f.affectsPrice);
  if (priceFields.length > 1) {
    ctx.addIssue({
      code: "custom",
      message: "Only one field can multiply the category price",
      path: ["formFields"],
    });
  }
}

export const categorySchema = categoryBaseSchema.superRefine(refineCategoryData);

/** PATCH updates — partial() must be applied before refinements (Zod 4). */
export const categoryUpdateSchema = categoryBaseSchema
  .partial()
  .superRefine(refineCategoryUpdateData);

export const expenseSchema = z.object({
  categoryId: z.string().optional().nullable(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  amount: z.number().int().min(1),
  status: z.enum(expenseStatuses).default("PENDING"),
});

export const expenseUpdateSchema = expenseSchema.partial().extend({
  handledAt: z.string().datetime().optional().nullable(),
});

export type FormFieldInput = z.infer<typeof formFieldSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
