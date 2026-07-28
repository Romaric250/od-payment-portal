import fs from "fs";
import path from "path";
import { createRequire } from "node:module";
import type PDFKit from "pdfkit";
import { formatCurrency, formatDate } from "@/lib/format";
import { siteConfig } from "@/lib/site";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit") as typeof import("pdfkit");

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
}

const BRAND = {
  navy: "#0B2545",
  navyDark: "#071A33",
  orange: "#F5811F",
  bg: "#F7F8FA",
  border: "#E4E7EC",
  text: "#101828",
  muted: "#667085",
  white: "#FFFFFF",
  rowAlt: "#F9FAFB",
  success: "#12B76A",
};

const LOGO_CANDIDATES = [
  path.join(process.cwd(), "public", "odlogo.png"),
  path.join(process.cwd(), "assets", "odlogo.png"),
];

async function loadLogoBuffer(): Promise<Buffer | null> {
  for (const candidate of LOGO_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }

  try {
    const response = await fetch(siteConfig.logoUrl);
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
  } catch {
    // Logo is optional; report still exports without it.
  }

  return null;
}

const PAGE = {
  margin: 36,
  footerHeight: 28,
};

const TABLE = {
  headerHeight: 28,
  rowHeight: 22,
  fontSize: 8,
  headerFontSize: 8,
};

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
] as const;

interface TableColumn {
  key: string;
  label: string;
  width: number;
  align?: "left" | "center" | "right";
}

function getTableWidth(pageWidth: number): number {
  return pageWidth - PAGE.margin * 2;
}

function assignColumnWidths(pageWidth: number): TableColumn[] {
  const totalWidth = getTableWidth(pageWidth);
  const fixed = COLUMNS.filter((col) => col.key !== "details");
  const fixedSum = fixed.reduce((sum, col) => sum + col.width, 0);
  const detailsWidth = Math.max(totalWidth - fixedSum, 80);

  return COLUMNS.map((col) => ({
    key: col.key,
    label: col.label,
    width: col.key === "details" ? detailsWidth : col.width,
    align: "align" in col ? col.align : undefined,
  }));
}

function truncate(text: string, maxLength: number): string {
  const value = text.trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function formatFormDetails(responses: ExportableTransaction["formResponses"]): string {
  if (!responses?.length) return "—";
  return responses.map((r) => `${r.fieldKey}: ${r.value}`).join(" · ");
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  options: PdfExportOptions,
  transactionCount: number,
  totalAmount: number,
  logoBuffer: Buffer | null
) {
  const headerHeight = 88;
  doc.save();
  doc.rect(0, 0, pageWidth, headerHeight).fill(BRAND.navy);

  if (logoBuffer) {
    doc.image(logoBuffer, PAGE.margin, 18, { width: 52, height: 52 });
  }

  const textX = PAGE.margin + (logoBuffer ? 64 : 0);
  doc
    .fillColor(BRAND.white)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(siteConfig.name, textX, 24, { continued: false });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#D0D5DD")
    .text(siteConfig.portalName, textX, 46);

  const exportedAt = options.exportedAt ?? new Date();
  const reportTitle = options.categoryName
    ? `Successful payments - ${options.categoryName}`
    : "Successful payments report";

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(BRAND.white)
    .text(reportTitle, PAGE.margin, 24, {
      width: pageWidth - PAGE.margin * 2,
      align: "right",
    });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#D0D5DD")
    .text(`Exported ${formatDate(exportedAt)}`, PAGE.margin, 44, {
      width: pageWidth - PAGE.margin * 2,
      align: "right",
    });

  doc.restore();

  const summaryY = headerHeight + 18;
  const summaryGap = 12;
  const summaryWidth = (getTableWidth(pageWidth) - summaryGap * 2) / 3;
  const summaries = [
    { label: "Successful payments", value: String(transactionCount) },
    { label: "Total collected", value: formatCurrency(totalAmount) },
    {
      label: "Category",
      value: options.categoryName ?? "All categories",
    },
  ];

  summaries.forEach((item, index) => {
    const x = PAGE.margin + index * (summaryWidth + summaryGap);
    doc
      .roundedRect(x, summaryY, summaryWidth, 52, 8)
      .fillAndStroke(BRAND.white, BRAND.border);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text(item.label.toUpperCase(), x + 12, summaryY + 10, { width: summaryWidth - 24 });
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(BRAND.navy)
      .text(item.value, x + 12, summaryY + 26, { width: summaryWidth - 24 });
  });

  return summaryY + 52 + 20;
}

function drawTableHeader(doc: PDFKit.PDFDocument, columns: TableColumn[], y: number) {
  let x = PAGE.margin;

  doc.save();
  doc.rect(PAGE.margin, y, columns.reduce((sum, col) => sum + col.width, 0), TABLE.headerHeight).fill(
    BRAND.navyDark
  );

  columns.forEach((column) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(TABLE.headerFontSize)
      .fillColor(BRAND.white)
      .text(column.label, x + 6, y + 9, {
        width: column.width - 12,
        align: column.align ?? "left",
        lineBreak: false,
      });
    x += column.width;
  });

  doc.restore();
  return y + TABLE.headerHeight;
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  y: number,
  row: Record<string, string>,
  rowIndex: number
) {
  const rowWidth = columns.reduce((sum, col) => sum + col.width, 0);

  if (rowIndex % 2 === 1) {
    doc.save();
    doc.rect(PAGE.margin, y, rowWidth, TABLE.rowHeight).fill(BRAND.rowAlt);
    doc.restore();
  }

  let x = PAGE.margin;
  columns.forEach((column) => {
    doc
      .font("Helvetica")
      .fontSize(TABLE.fontSize)
      .fillColor(BRAND.text)
      .text(row[column.key] ?? "", x + 6, y + 7, {
        width: column.width - 12,
        align: column.align ?? "left",
        lineBreak: false,
      });
    x += column.width;
  });

  doc
    .moveTo(PAGE.margin, y + TABLE.rowHeight)
    .lineTo(PAGE.margin + rowWidth, y + TABLE.rowHeight)
    .strokeColor(BRAND.border)
    .lineWidth(0.5)
    .stroke();

  return y + TABLE.rowHeight;
}

function drawFooters(doc: PDFKit.PDFDocument, pageWidth: number, pageHeight: number) {
  const range = doc.bufferedPageRange();

  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    const footerY = pageHeight - PAGE.margin;

    doc
      .moveTo(PAGE.margin, footerY - 10)
      .lineTo(pageWidth - PAGE.margin, footerY - 10)
      .strokeColor(BRAND.border)
      .lineWidth(0.5)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text("Open Dreams · open-dreams.org", PAGE.margin, footerY, {
        continued: false,
      });

    doc.text(`Page ${pageIndex + 1} of ${range.count}`, PAGE.margin, footerY, {
      width: pageWidth - PAGE.margin * 2,
      align: "right",
    });
  }
}

function buildRow(
  tx: ExportableTransaction,
  index: number
): Record<string, string> {
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
    const pageHeight = doc.page.height;
    const columns = assignColumnWidths(pageWidth);
    const contentBottom = pageHeight - PAGE.margin - PAGE.footerHeight;
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    let y = drawHeader(
      doc,
      pageWidth,
      options,
      transactions.length,
      totalAmount,
      logoBuffer
    );

    if (transactions.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor(BRAND.muted)
        .text("No successful payments to export for this selection.", PAGE.margin, y);
    } else {
      y = drawTableHeader(doc, columns, y);

      transactions.forEach((tx, index) => {
        if (y + TABLE.rowHeight > contentBottom) {
          doc.addPage({ layout: "landscape", margin: PAGE.margin });
          y = PAGE.margin;
          y = drawTableHeader(doc, columns, y);
        }

        y = drawTableRow(doc, columns, y, buildRow(tx, index + 1), index);
      });
    }

    drawFooters(doc, pageWidth, pageHeight);
    doc.end();
  });
}
