export const PLATFORM_FEE_RATE = 0.03;
export const PLATFORM_FEE_PERCENT_LABEL = "3%";
export const DEFAULT_NOTIFICATION_EMAIL = "info@open-dreams.org";

export function getPlatformFeeAmount(baseAmount: number): number {
  return Math.round(baseAmount * PLATFORM_FEE_RATE);
}

export function applyPlatformFee(
  baseAmount: number,
  includePlatformFee: boolean
): number {
  if (!includePlatformFee) return baseAmount;
  return baseAmount + getPlatformFeeAmount(baseAmount);
}

export function resolvePaymentNotificationEmails(params: {
  categoryEmails?: string[] | null;
  globalEmails?: string[] | null;
}): string[] {
  const categoryEmails = (params.categoryEmails ?? []).filter(Boolean);
  if (categoryEmails.length > 0) {
    return Array.from(new Set(categoryEmails.map((email) => email.toLowerCase())));
  }

  const globalEmails = (params.globalEmails ?? []).filter(Boolean);
  if (globalEmails.length > 0) {
    return Array.from(new Set(globalEmails.map((email) => email.toLowerCase())));
  }

  return [DEFAULT_NOTIFICATION_EMAIL];
}

export function parseEmailList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,;\n]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function formatEmailList(emails: string[] | null | undefined): string {
  return (emails ?? []).join(", ");
}
