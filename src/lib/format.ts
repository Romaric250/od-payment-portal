export function formatCurrency(amount: number, currency = "XAF"): string {
  const formatted = new Intl.NumberFormat("fr-CM", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return currency === "XAF" ? `${formatted} FCFA` : `${formatted} ${currency}`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-CM", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
