import { z } from "zod";

const MTN_PREFIXES = ["67", "65", "680", "681", "682", "683"];
const ORANGE_PREFIXES = ["69", "656", "657", "658", "659"];

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\s+/g, "").replace(/^\+237/, "").replace(/^237/, "");
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

export function detectNetwork(phone: string): "MTN" | "ORANGE" | null {
  const normalized = normalizePhone(phone);
  if (!/^6\d{8}$/.test(normalized)) return null;

  if (MTN_PREFIXES.some((p) => normalized.startsWith(p))) return "MTN";
  if (ORANGE_PREFIXES.some((p) => normalized.startsWith(p))) return "ORANGE";
  return null;
}

export const cameroonPhoneSchema = z
  .string()
  .min(9, "Phone number is required")
  .transform(normalizePhone)
  .refine((phone) => /^6\d{8}$/.test(phone), {
    message: "Enter a valid Cameroon mobile number (e.g. 670000000)",
  });

export const checkoutSchema = z
  .object({
    categorySlug: z.string().min(1),
    payerName: z.string().min(2, "Name is required").max(100),
    payerEmail: z.string().email("Valid email is required"),
    payerPhone: cameroonPhoneSchema,
    network: z.enum(["MTN", "ORANGE"]),
  })
  .superRefine((data, ctx) => {
    const detected = detectNetwork(data.payerPhone);
    if (detected && detected !== data.network) {
      ctx.addIssue({
        code: "custom",
        message: `This number appears to be ${detected === "MTN" ? "MTN" : "Orange Money"}. Please select the correct network.`,
        path: ["network"],
      });
    }
  });

export const categorySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().int().min(100, "Minimum price is 100 XAF"),
  images: z.array(z.string().url()).default([]),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  statusPipeline: z
    .array(z.string().min(1).max(80))
    .min(1, "At least one fulfillment status is required"),
});

export const withdrawalSchema = z.object({
  amount: z.number().int().min(100),
  note: z.string().max(500).optional().nullable(),
  reference: z.string().max(120).optional().nullable(),
});

export const adminCreateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]).default("ADMIN"),
  accessLevel: z.enum(["READ_WRITE", "READ_ONLY"]).default("READ_ONLY"),
});

export const adminUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]).optional(),
  accessLevel: z.enum(["READ_WRITE", "READ_ONLY"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export const settingsSchema = z.object({
  notificationEmails: z.array(z.string().email()).min(0),
  orgName: z.string().min(2).max(120),
});

export const fulfillmentStatusSchema = z.object({
  fulfillmentStatus: z.string().min(1).max(80),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
