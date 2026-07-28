import type { CategoryType } from "@prisma/client";

export interface PostPaymentFollowUp {
  postPaymentTitle: string | null;
  postPaymentDescription: string | null;
  postPaymentLink: string | null;
  postPaymentLinkLabel: string | null;
  categoryType?: CategoryType | string;
}

export const paymentFollowUpCategorySelect = {
  name: true,
  slug: true,
  categoryType: true,
  postPaymentTitle: true,
  postPaymentDescription: true,
  postPaymentLink: true,
  postPaymentLinkLabel: true,
} as const;

export function hasPostPaymentFollowUp(
  info: Partial<PostPaymentFollowUp> | null | undefined
): boolean {
  if (!info) return false;
  return Boolean(info.postPaymentDescription?.trim() || info.postPaymentLink?.trim());
}

export function getPostPaymentLinkLabel(label: string | null | undefined): string {
  const trimmed = label?.trim();
  return trimmed || "Open link";
}

export function getPostPaymentTitle(
  title: string | null | undefined,
  categoryType?: CategoryType | string
): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;
  if (categoryType === "EVENT") return "Event information";
  return "What's next";
}

export function formatPostPaymentDescription(description: string): string {
  return description
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n");
}
