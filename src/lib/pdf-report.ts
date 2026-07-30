import fs from "fs";
import path from "path";
import { createRequire } from "node:module";
import type PDFKit from "pdfkit";
import { formatDate } from "@/lib/format";
import { siteConfig } from "@/lib/site";

const require = createRequire(import.meta.url);
export const PDFDocument = require("pdfkit") as typeof import("pdfkit");

export const BRAND = {
  navy: "#0B2545",
  navyDark: "#071A33",
  orange: "#F5811F",
  bg: "#F7F8FA",
  border: "#E4E7EC",
  text: "#101828",
  muted: "#667085",
  white: "#FFFFFF",
  rowAlt: "#F9FAFB",
};

const LOGO_CANDIDATES = [
  path.join(process.cwd(), "public", "odlogo.png"),
  path.join(process.cwd(), "assets", "odlogo.png"),
];

export const PAGE = {
  margin: 36,
  footerHeight: 28,
};

export const TABLE = {
  headerHeight: 28,
  rowHeight: 22,
  fontSize: 8,
  headerFontSize: 8,
};

export interface TableColumn {
  key: string;
  label: string;
  width: number;
  align?: "left" | "center" | "right";
}

export interface SummaryCard {
  label: string;
  value: string;
}

export async function loadLogoBuffer(): Promise<Buffer | null> {
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
    // Logo is optional.
  }

  return null;
}

export function truncate(text: string, maxLength: number): string {
  const value = text.trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

export function getTableWidth(pageWidth: number): number {
  return pageWidth - PAGE.margin * 2;
}

export function assignColumnWidths(
  columns: Array<{ key: string; label: string; width: number; align?: "left" | "center" | "right" }>,
  flexKey: string,
  pageWidth: number
): TableColumn[] {
  const totalWidth = getTableWidth(pageWidth);
  const fixed = columns.filter((col) => col.key !== flexKey);
  const fixedSum = fixed.reduce((sum, col) => sum + col.width, 0);
  const flexWidth = Math.max(totalWidth - fixedSum, 80);

  return columns.map((col) => ({
    ...col,
    width: col.key === flexKey ? flexWidth : col.width,
  }));
}

export function drawBrandedHeader(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  reportTitle: string,
  logoBuffer: Buffer | null,
  exportedAt: Date = new Date()
): number {
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
  return headerHeight;
}

export function drawSummaryCards(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  startY: number,
  summaries: SummaryCard[]
): number {
  const summaryY = startY + 18;
  const summaryGap = 12;
  const cardCount = Math.max(summaries.length, 1);
  const summaryWidth = (getTableWidth(pageWidth) - summaryGap * (cardCount - 1)) / cardCount;

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

export function drawTableHeader(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  y: number
): number {
  let x = PAGE.margin;

  doc.save();
  doc
    .rect(PAGE.margin, y, columns.reduce((sum, col) => sum + col.width, 0), TABLE.headerHeight)
    .fill(BRAND.navyDark);

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

export function drawTableRow(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  y: number,
  row: Record<string, string>,
  rowIndex: number
): number {
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

export function drawFooters(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  pageHeight: number
): void {
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

export function renderPdfTable(params: {
  doc: PDFKit.PDFDocument;
  columns: TableColumn[];
  rows: Record<string, string>[];
  startY: number;
  emptyMessage: string;
}): void {
  const { doc, columns, rows, startY, emptyMessage } = params;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentBottom = pageHeight - PAGE.margin - PAGE.footerHeight;
  let y = startY;

  if (rows.length === 0) {
    doc.font("Helvetica").fontSize(11).fillColor(BRAND.muted).text(emptyMessage, PAGE.margin, y);
    drawFooters(doc, pageWidth, pageHeight);
    return;
  }

  y = drawTableHeader(doc, columns, y);

  rows.forEach((row, index) => {
    if (y + TABLE.rowHeight > contentBottom) {
      doc.addPage({ layout: "landscape", margin: PAGE.margin });
      y = PAGE.margin;
      y = drawTableHeader(doc, columns, y);
    }

    y = drawTableRow(doc, columns, y, row, index);
  });

  drawFooters(doc, pageWidth, pageHeight);
}
