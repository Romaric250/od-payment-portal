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

export interface ExportableExpense {
  title: string;
  description: string | null;
  amount: number;
  status: string;
  handledAt: Date | string | null;
  createdAt: Date | string;
  category?: { name: string } | null;
  createdBy?: { name: string };
}

interface ExpensePdfExportOptions {
  categoryName?: string;
  statusLabel?: string;
  exportedAt?: Date;
}

const COLUMNS = [
  { key: "index", label: "#", width: 22, align: "center" as const },
  { key: "date", label: "Date", width: 72 },
  { key: "title", label: "Title", width: 110 },
  { key: "category", label: "Category", width: 88 },
  { key: "amount", label: "Amount", width: 68, align: "right" as const },
  { key: "status", label: "Status", width: 58, align: "center" as const },
  { key: "recordedBy", label: "Recorded by", width: 82 },
  { key: "handledAt", label: "Handled", width: 72 },
  { key: "description", label: "Description", width: 0 },
];

function buildRow(expense: ExportableExpense, index: number): Record<string, string> {
  return {
    index: String(index),
    date: truncate(formatDate(expense.createdAt), 18),
    title: truncate(expense.title, 28),
    category: truncate(expense.category?.name ?? "General", 18),
    amount: formatCurrency(expense.amount),
    status: expense.status,
    recordedBy: truncate(expense.createdBy?.name ?? "—", 18),
    handledAt: expense.handledAt ? truncate(formatDate(expense.handledAt), 18) : "—",
    description: truncate(expense.description ?? "—", 48),
  };
}

export async function expensesToPdf(
  expenses: ExportableExpense[],
  options: ExpensePdfExportOptions = {}
): Promise<Buffer> {
  const logoBuffer = await loadLogoBuffer();
  const exportedAt = options.exportedAt ?? new Date();
  const reportTitle = options.categoryName
    ? `Expenses - ${options.categoryName}`
    : "Expenses report";
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const handledCount = expenses.filter((expense) => expense.status === "HANDLED").length;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: PAGE.margin,
      bufferPages: true,
      info: {
        Title: options.categoryName
          ? `${options.categoryName} - Expenses`
          : "Expenses Report",
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
      { label: "Expenses", value: String(expenses.length) },
      { label: "Total amount", value: formatCurrency(totalAmount) },
      { label: "Handled", value: String(handledCount) },
      {
        label: "Filter",
        value: options.statusLabel ?? "All statuses",
      },
    ]);

    renderPdfTable({
      doc,
      columns: assignColumnWidths(COLUMNS, "description", pageWidth),
      rows: expenses.map((expense, index) => buildRow(expense, index + 1)),
      startY,
      emptyMessage: "No expenses to export for this selection.",
    });

    doc.end();
  });
}
