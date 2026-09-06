export function parseExportDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): { gte?: Date; lte?: Date; label: string } | { error: string } {
  let gte: Date | undefined;
  let lte: Date | undefined;

  if (startDate) {
    gte = new Date(`${startDate}T00:00:00.000`);
    if (Number.isNaN(gte.getTime())) {
      return { error: "Invalid start date" };
    }
  }

  if (endDate) {
    lte = new Date(`${endDate}T23:59:59.999`);
    if (Number.isNaN(lte.getTime())) {
      return { error: "Invalid end date" };
    }
  }

  if (gte && lte && gte > lte) {
    return { error: "Start date must be before end date" };
  }

  let label = "All time";
  if (gte && lte) {
    label = `${formatExportDate(gte)} – ${formatExportDate(lte)}`;
  } else if (gte) {
    label = `From ${formatExportDate(gte)}`;
  } else if (lte) {
    label = `Until ${formatExportDate(lte)}`;
  }

  return { gte, lte, label };
}

function formatExportDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function dateRangeFilenamePart(
  startDate?: string | null,
  endDate?: string | null
): string {
  if (startDate && endDate) return `${startDate}-to-${endDate}`;
  if (startDate) return `from-${startDate}`;
  if (endDate) return `until-${endDate}`;
  return "all";
}
