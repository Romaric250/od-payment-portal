export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrency(amount: number, currency = "XAF"): string {
  const formatted = formatAmount(amount);

  return currency === "XAF" ? `${formatted} FCFA` : `${formatted} ${currency}`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-CM", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
