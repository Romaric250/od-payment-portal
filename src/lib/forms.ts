import type { FormField, Category } from "@prisma/client";
import { detectNetwork, normalizePhone } from "@/lib/validators";

export type FormFieldInput = Pick<
  FormField,
  "label" | "key" | "type" | "required" | "options" | "order" | "affectsPrice"
>;

export const TSHIRT_QUANTITY_KEY = "quantity";

export type CategoryPricingContext = Pick<
  Category,
  "price" | "allowCustomAmount" | "minimumAmount" | "categoryType"
>;

export interface PayerInfo {
  payerName: string;
  payerEmail: string;
  payerPhone: string;
}

export function sortFormFields<T extends { order: number }>(fields: T[]): T[] {
  return [...fields].sort((a, b) => a.order - b.order);
}

export function validateFormResponses(
  fields: FormFieldInput[],
  responses: Record<string, string>
): string | null {
  for (const field of sortFormFields(fields)) {
    const raw = responses[field.key];
    const value = typeof raw === "string" ? raw.trim() : "";

    if (field.required && !value) {
      return `${field.label} is required`;
    }

    if (!value) continue;

    switch (field.type) {
      case "EMAIL":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return `${field.label} must be a valid email`;
        }
        break;
      case "PHONE": {
        const phone = normalizePhone(value);
        if (!/^6\d{8}$/.test(phone)) {
          return `${field.label} must be a valid Cameroon mobile number`;
        }
        break;
      }
      case "NUMBER": {
        const num = Number(value);
        if (!Number.isFinite(num) || num <= 0) {
          return `${field.label} must be a positive number`;
        }
        break;
      }
      case "SELECT":
        if (field.options.length > 0 && !field.options.includes(value)) {
          return `${field.label} has an invalid selection`;
        }
        break;
      case "MULTI_SELECT": {
        const selected = value.split(",").map((v) => v.trim()).filter(Boolean);
        if (selected.length === 0 && field.required) {
          return `${field.label} is required`;
        }
        if (
          field.options.length > 0 &&
          selected.some((option) => !field.options.includes(option))
        ) {
          return `${field.label} has an invalid selection`;
        }
        break;
      }
      default:
        break;
    }
  }

  return null;
}

export function extractPayerInfo(
  fields: FormFieldInput[],
  responses: Record<string, string>,
  legacy?: Partial<PayerInfo>
): PayerInfo | { error: string } {
  const legacyName = legacy?.payerName?.trim();
  const legacyEmail = legacy?.payerEmail?.trim();
  const legacyPhone = legacy?.payerPhone?.trim();

  if (legacyName && legacyEmail && legacyPhone) {
    const payerPhone = normalizePhone(legacyPhone);
    if (!/^6\d{8}$/.test(payerPhone)) {
      return { error: "Phone must be a valid Cameroon mobile number" };
    }
    return {
      payerName: legacyName,
      payerEmail: legacyEmail,
      payerPhone,
    };
  }

  if (fields.length === 0) {
    if (!legacyName || !legacyEmail || !legacyPhone) {
      return { error: "Name, email, and phone are required" };
    }
    return {
      payerName: legacyName,
      payerEmail: legacyEmail,
      payerPhone: normalizePhone(legacyPhone),
    };
  }

  const nameField =
    fields.find((f) => ["name", "payer_name", "full_name"].includes(f.key)) ??
    fields.find((f) => f.type === "TEXT" && /name/i.test(f.label));
  const emailField =
    fields.find((f) => f.type === "EMAIL") ??
    fields.find((f) => f.key === "email");
  const phoneField =
    fields.find((f) => f.type === "PHONE") ??
    fields.find((f) => f.key === "phone");

  const payerName = nameField ? responses[nameField.key]?.trim() : legacyName;
  const payerEmail = emailField ? responses[emailField.key]?.trim() : legacyEmail;
  const payerPhoneRaw = phoneField
    ? responses[phoneField.key]?.trim()
    : legacyPhone;

  if (!payerName || payerName.length < 2) {
    return { error: "Name is required" };
  }
  if (!payerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
    return { error: "Valid email is required" };
  }
  if (!payerPhoneRaw) {
    return { error: "Phone number is required" };
  }

  const payerPhone = normalizePhone(payerPhoneRaw);
  if (!/^6\d{8}$/.test(payerPhone)) {
    return { error: "Phone must be a valid Cameroon mobile number" };
  }

  return { payerName, payerEmail, payerPhone };
}

export function resolveQuantityMultiplier(
  category: Pick<Category, "categoryType">,
  fields: FormFieldInput[],
  responses: Record<string, string>
): { quantity: number } | { error: string } {
  const quantityField = fields.find((f) => f.affectsPrice && f.type === "NUMBER");
  if (quantityField) {
    const raw = responses[quantityField.key];
    const quantity = raw ? parseInt(raw, 10) : 1;
    if (!Number.isFinite(quantity) || quantity < 1) {
      return { error: `${quantityField.label} must be at least 1` };
    }
    return { quantity };
  }

  if (category.categoryType === "TSHIRT") {
    const raw = responses[TSHIRT_QUANTITY_KEY];
    const quantity = raw ? parseInt(raw, 10) : 1;
    if (!Number.isFinite(quantity) || quantity < 1) {
      return { error: "Quantity must be at least 1" };
    }
    return { quantity };
  }

  return { quantity: 1 };
}

export function calculatePaymentAmount(
  category: CategoryPricingContext,
  fields: FormFieldInput[],
  responses: Record<string, string>,
  customAmount?: number
): { amount: number } | { error: string } {
  if (category.allowCustomAmount && customAmount != null) {
    if (!Number.isInteger(customAmount)) {
      return { error: "Please enter a valid payment amount" };
    }
    const minimum = category.minimumAmount ?? 100;
    if (customAmount < minimum) {
      return { error: `Minimum amount is ${minimum} XAF` };
    }
    if (customAmount < 100) {
      return { error: "Minimum payment amount is 100 XAF" };
    }
    return { amount: customAmount };
  }

  const quantityResult = resolveQuantityMultiplier(category, fields, responses);
  if ("error" in quantityResult) {
    return quantityResult;
  }

  const amount = category.price * quantityResult.quantity;
  if (amount < 100) {
    return { error: "Minimum payment amount is 100 XAF" };
  }

  return { amount };
}

export function validateNetworkMatch(phone: string, network: "MTN" | "ORANGE"): string | null {
  const detected = detectNetwork(phone);
  if (detected && detected !== network) {
    return `This number appears to be ${detected === "MTN" ? "MTN" : "Orange Money"}. Please select the correct network.`;
  }
  return null;
}

export function serializeFormResponses(
  fields: FormFieldInput[],
  responses: Record<string, string>,
  extras?: Record<string, string>
): Array<{ fieldKey: string; value: string }> {
  const merged = { ...responses, ...extras };
  const keys = Array.from(
    new Set([
      ...fields.map((field) => field.key),
      ...Object.keys(extras ?? {}),
    ])
  );

  return keys
    .map((key) => {
      const raw = merged[key];
      if (raw == null || raw === "") return null;
      return { fieldKey: key, value: String(raw).trim() };
    })
    .filter((entry): entry is { fieldKey: string; value: string } => entry != null);
}
