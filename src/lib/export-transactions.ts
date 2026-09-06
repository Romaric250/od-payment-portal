import { formatCurrency, formatDate } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import {
  PDFDocument,
  PAGE,
  assignColumnWidths,
  drawBrandedHeader,
  drawSummaryCards,
  loadLogoBuffer,
  renderPdfTable,
  truncate,
} from "@/lib/pdf-report";

export interface ExportableTransaction {
  createdAt: Date | string;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  amount: number;
  network: string;
  status: string;
  fulfillmentStatus: string | null;
  externalId: string;
  fapshiTransId: string | null;
  formResponses?: Array<{ fieldKey: string; value: string }>;
  category?: { name: string };
}

interface PdfExportOptions {
  categoryName?: string;
  exportedAt?: Date;
  dateRangeLabel?: string;
}

const COLUMNS = [
  { key: "index", label: "#", width: 22, align: "center" as const },
  { key: "date", label: "Date", width: 72 },
  { key: "payer", label: "Payer", width: 88 },
  { key: "email", label: "Email", width: 108 },
  { key: "phone", label: "Phone", width: 68 },
  { key: "amount", label: "Amount", width: 62, align: "right" as const },
  { key: "network", label: "Network", width: 48, align: "center" as const },
  { key: "fulfillment", label: "Fulfillment", width: 62 },
  { key: "reference", label: "Reference", width: 96 },
  { key: "details", label: "Form details", width: 0 },
];

function formatFormDetails(responses: ExportableTransaction["formResponses"]): string {
  if (!responses?.length) return "—";
  return responses.map((r) => `${r.fieldKey}: ${r.value}`).join(" · ");
}

function buildRow(tx: ExportableTransaction, index: number): Record<string, string> {
  const reference = tx.fapshiTransId ?? tx.externalId;

  return {
    index: String(index),
    date: truncate(formatDate(tx.createdAt), 18),
    payer: truncate(tx.payerName, 22),
    email: truncate(tx.payerEmail, 28),
    phone: truncate(tx.payerPhone, 16),
    amount: formatCurrency(tx.amount),
    network: tx.network,
    fulfillment: tx.fulfillmentStatus ?? "—",
    reference: truncate(reference, 24),
    details: truncate(formatFormDetails(tx.formResponses), 48),
  };
}

export async function transactionsToPdf(
  transactions: ExportableTransaction[],
  options: PdfExportOptions = {}
): Promise<Buffer> {
  const logoBuffer = await loadLogoBuffer();
  const exportedAt = options.exportedAt ?? new Date();
  const reportTitle = options.categoryName
    ? `Successful payments - ${options.categoryName}`
    : "Successful payments report";
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: PAGE.margin,
      bufferPages: true,
      info: {
        Title: options.categoryName
          ? `${options.categoryName} - Successful Payments`
          : "Successful Payments Report",
        Author: siteConfig.name,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const headerBottom = drawBrandedHeader(doc, pageWidth, reportTitle, logoBuffer, exportedAt);
    const startY = drawSummaryCards(doc, pageWidth, headerBottom, [
      { label: "Successful payments", value: String(transactions.length) },
      { label: "Total collected", value: formatCurrency(totalAmount) },
      { label: "Period", value: options.dateRangeLabel ?? "All time" },
      { label: "Category", value: options.categoryName ?? "All categories" },
    ]);

    renderPdfTable({
      doc,
      columns: assignColumnWidths(COLUMNS, "details", pageWidth),
      rows: transactions.map((tx, index) => buildRow(tx, index + 1)),
      startY,
      emptyMessage: "No successful payments to export for this selection.",
    });

    doc.end();
  });
}
