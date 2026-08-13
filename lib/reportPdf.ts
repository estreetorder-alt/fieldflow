import { PDFDocument, StandardFonts, rgb, RGB, PDFFont, PDFPage, PDFImage } from "pdf-lib";
import fs from "fs";
import path from "path";

// ── Brand palette (matches the Snapect web app) ──
const NAVY = rgb(8 / 255, 26 / 255, 54 / 255);
const ORANGE = rgb(255 / 255, 106 / 255, 0 / 255);
const WHITE = rgb(1, 1, 1);
const SLATE_900 = rgb(15 / 255, 23 / 255, 42 / 255);
const SLATE_600 = rgb(71 / 255, 85 / 255, 105 / 255);
const SLATE_400 = rgb(148 / 255, 163 / 255, 184 / 255);
const SLATE_200 = rgb(226 / 255, 232 / 255, 240 / 255);
const SLATE_100 = rgb(241 / 255, 245 / 255, 249 / 255);
const SLATE_50 = rgb(248 / 255, 250 / 255, 252 / 255);
const GREEN = rgb(21 / 255, 128 / 255, 61 / 255);
const GREEN_BG = rgb(220 / 255, 252 / 255, 231 / 255);
const BLUE = rgb(29 / 255, 78 / 255, 216 / 255);
const BLUE_BG = rgb(219 / 255, 234 / 255, 254 / 255);
const AMBER = rgb(180 / 255, 83 / 255, 9 / 255);
const AMBER_BG = rgb(254 / 255, 243 / 255, 199 / 255);
const RED = rgb(185 / 255, 28 / 255, 28 / 255);
const RED_BG = rgb(254 / 255, 226 / 255, 226 / 255);

const STATUS_STYLE: Record<string, { label: string; fg: RGB; bg: RGB }> = {
  pending: { label: "PENDING", fg: AMBER, bg: AMBER_BG },
  in_progress: { label: "IN PROGRESS", fg: BLUE, bg: BLUE_BG },
  completed: { label: "COMPLETED", fg: GREEN, bg: GREEN_BG },
  cancelled: { label: "CANCELLED", fg: RED, bg: RED_BG },
};

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 46;

export interface ReportOrder {
  id: string;
  address: string;
  status: string;
  serviceType: string;
  turnaroundLabel: string;
  totalPrice: number;
  compensationAmount: number;
  notes: string;
  customizeNotes: string;
  photos: string[];
  createdAt: string;
  invoicePaid: boolean;
  statusHistory: { status: string; timestamp: string; note: string }[];
}
export interface ReportPerson { name: string; email: string; phone?: string }

export async function generateOrderReportPdf(opts: {
  order: ReportOrder;
  client: ReportPerson | null;
  agent: ReportPerson | null;
  formattedDate: string;
}): Promise<Uint8Array> {
  const { order, client, agent, formattedDate } = opts;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Snapect Field Inspection Report — ${order.id}`);
  pdf.setAuthor("Snapect");
  pdf.setSubject(`Order report for ${order.address}`);
  pdf.setProducer("Snapect Field Inspection Platform");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let logo: PDFImage | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "snapect-icon.png");
    const logoBytes = fs.readFileSync(logoPath);
    logo = await pdf.embedPng(logoBytes);
  } catch {
    logo = null; // Falls back to wordmark-only header if the asset isn't reachable.
  }

  const pages: PDFPage[] = [];
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  pages.push(page);
  let y = PAGE_H;

  const pageCountLabel = () => `Page ${pages.length}`;

  function drawFooter(p: PDFPage) {
    const fy = FOOTER_H;
    p.drawLine({ start: { x: MARGIN, y: fy }, end: { x: PAGE_W - MARGIN, y: fy }, thickness: 0.75, color: SLATE_200 });
    p.drawText("This report was generated and issued by Snapect — Verified Field Inspection Network.", {
      x: MARGIN, y: fy - 14, size: 7.5, font, color: SLATE_600,
    });
    const year = new Date(order.createdAt).getFullYear() || new Date().getFullYear();
    p.drawText(`© ${year} Snapect. All rights reserved.  ·  support@snapect.com  ·  snapect.com`, {
      x: MARGIN, y: fy - 26, size: 7.5, font, color: SLATE_400,
    });
  }

  function newPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    y = PAGE_H - 40;
    page.drawText("Snapect Field Inspection Report — continued", { x: MARGIN, y, size: 9, font: bold, color: SLATE_600 });
    page.drawText(order.id, { x: PAGE_W - MARGIN - font.widthOfTextAtSize(order.id, 9), y, size: 9, font, color: SLATE_400 });
    y -= 26;
  }

  function ensureSpace(h: number) {
    if (y - h < FOOTER_H + 20) newPage();
  }

  function sectionTitle(text: string) {
    y -= 8;
    ensureSpace(28);
    page.drawText(text.toUpperCase(), { x: MARGIN, y, size: 9.5, font: bold, color: NAVY });
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1.25, color: ORANGE });
    y -= 16;
  }

  function wrapText(text: string, size: number, f: PDFFont, maxWidth: number): string[] {
    const words = (text ?? "").split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function labelValueRow(label: string, value: string, xOffset = 0, width = CONTENT_W) {
    ensureSpace(16);
    page.drawText(label, { x: MARGIN + xOffset, y, size: 8.5, font, color: SLATE_600 });
    const lines = wrapText(value || "—", 9.5, bold, width - 130);
    page.drawText(lines[0], { x: MARGIN + xOffset + 130, y, size: 9.5, font: bold, color: SLATE_900 });
    y -= 15;
    for (const extra of lines.slice(1)) {
      ensureSpace(14);
      page.drawText(extra, { x: MARGIN + xOffset + 130, y, size: 9.5, font: bold, color: SLATE_900 });
      y -= 14;
    }
  }

  // ── Header band ──
  const headerH = 108;
  page.drawRectangle({ x: 0, y: PAGE_H - headerH, width: PAGE_W, height: headerH, color: NAVY });
  page.drawRectangle({ x: 0, y: PAGE_H - headerH, width: PAGE_W, height: 4, color: ORANGE });

  if (logo) {
    const logoW = 42;
    const logoH = logoW * (logo.height / logo.width);
    page.drawImage(logo, { x: MARGIN, y: PAGE_H - headerH + (headerH - logoH) / 2 + 6, width: logoW, height: logoH });
    page.drawText("SNAPECT", { x: MARGIN + logoW + 10, y: PAGE_H - 46, size: 20, font: bold, color: WHITE });
    page.drawText("BPO & REO Field Inspection Network", { x: MARGIN + logoW + 10, y: PAGE_H - 62, size: 9, font, color: rgb(0.75, 0.8, 0.9) });
  } else {
    page.drawText("SNAPECT", { x: MARGIN, y: PAGE_H - 46, size: 22, font: bold, color: WHITE });
    page.drawText("BPO & REO Field Inspection Network", { x: MARGIN, y: PAGE_H - 62, size: 9, font, color: rgb(0.75, 0.8, 0.9) });
  }

  const rightX = PAGE_W - MARGIN;
  const rTitle = "FIELD INSPECTION REPORT";
  page.drawText(rTitle, { x: rightX - bold.widthOfTextAtSize(rTitle, 11), y: PAGE_H - 40, size: 11, font: bold, color: ORANGE });
  const rOrder = `Order ${order.id}`;
  page.drawText(rOrder, { x: rightX - font.widthOfTextAtSize(rOrder, 9), y: PAGE_H - 56, size: 9, font, color: WHITE });
  const rGen = `Generated ${new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric" })}`;
  page.drawText(rGen, { x: rightX - font.widthOfTextAtSize(rGen, 8), y: PAGE_H - 70, size: 8, font, color: rgb(0.75, 0.8, 0.9) });
  const rProc = "Processed and issued by Snapect";
  page.drawText(rProc, { x: rightX - font.widthOfTextAtSize(rProc, 8), y: PAGE_H - 84, size: 8, font, color: rgb(0.75, 0.8, 0.9) });

  y = PAGE_H - headerH - 30;

  // ── Status + address ──
  const st = STATUS_STYLE[order.status] ?? { label: order.status.toUpperCase(), fg: SLATE_600, bg: SLATE_100 };
  const badgeText = st.label;
  const badgeW = bold.widthOfTextAtSize(badgeText, 8.5) + 20;
  page.drawRectangle({ x: MARGIN, y: y - 4, width: badgeW, height: 18, color: st.bg });
  page.drawText(badgeText, { x: MARGIN + 10, y: y, size: 8.5, font: bold, color: st.fg });
  y -= 30;

  page.drawText(order.address, { x: MARGIN, y, size: 15, font: bold, color: SLATE_900 });
  y -= 18;
  page.drawText(`${order.serviceType}  ·  ${order.turnaroundLabel}  ·  Submitted ${formattedDate}`, {
    x: MARGIN, y, size: 9, font, color: SLATE_600,
  });
  y -= 28;

  // ── Order + financial summary ──
  sectionTitle("Order Summary");
  const amount = order.compensationAmount > 0 ? order.compensationAmount : order.totalPrice;
  labelValueRow("Service Type", order.serviceType);
  labelValueRow("Turnaround", order.turnaroundLabel);
  labelValueRow("Total Amount", `$${amount.toFixed(2)}`);
  labelValueRow("Invoice Status", order.invoicePaid ? "Paid" : "Outstanding");
  if (order.customizeNotes) labelValueRow("Customization", order.customizeNotes);
  y -= 8;

  // ── Client & Agent (two columns) ──
  sectionTitle("Client & Field Agent");
  const colW = (CONTENT_W - 24) / 2;
  const startY = y;
  page.drawText("CLIENT", { x: MARGIN, y, size: 8, font: bold, color: SLATE_400 });
  page.drawText("FIELD AGENT", { x: MARGIN + colW + 24, y, size: 8, font: bold, color: SLATE_400 });
  y -= 15;
  const clientY0 = y, agentY0 = y;
  page.drawText(client?.name ?? "—", { x: MARGIN, y, size: 10.5, font: bold, color: SLATE_900 });
  page.drawText(agent?.name ?? "Not yet assigned", { x: MARGIN + colW + 24, y, size: 10.5, font: bold, color: SLATE_900 });
  y -= 14;
  page.drawText(client?.email ?? "", { x: MARGIN, y, size: 8.5, font, color: SLATE_600 });
  if (agent?.email) page.drawText(agent.email, { x: MARGIN + colW + 24, y, size: 8.5, font, color: SLATE_600 });
  y = Math.min(clientY0, agentY0) - 14 - 12;

  // ── Notes ──
  if (order.notes) {
    sectionTitle("Special Instructions");
    const lines = wrapText(order.notes, 9.5, font, CONTENT_W);
    for (const line of lines) {
      ensureSpace(14);
      page.drawText(line, { x: MARGIN, y, size: 9.5, font, color: SLATE_900 });
      y -= 14;
    }
    y -= 8;
  }

  // ── Photos ──
  sectionTitle(`Delivered Photos (${order.photos.length})`);
  if (order.photos.length === 0) {
    page.drawText("No photos were delivered for this order.", { x: MARGIN, y, size: 9, font, color: SLATE_400 });
    y -= 20;
  } else {
    let col = 0;
    const photoColW = CONTENT_W / 2;
    let rowStartY = y;
    for (const filename of order.photos) {
      ensureSpace(16);
      const x = MARGIN + col * photoColW;
      page.drawText("•", { x, y, size: 9, font: bold, color: ORANGE });
      const lines = wrapText(filename, 8.5, font, photoColW - 14);
      page.drawText(lines[0], { x: x + 12, y, size: 8.5, font, color: SLATE_600 });
      col = col === 0 ? 1 : 0;
      if (col === 0) { y = rowStartY - 14; rowStartY = y; } 
    }
    if (col === 1) y -= 14;
    y -= 10;
  }

  // ── Status history ──
  sectionTitle("Status History");
  if (order.statusHistory.length === 0) {
    page.drawText("No history recorded.", { x: MARGIN, y, size: 9, font, color: SLATE_400 });
    y -= 20;
  } else {
    for (const ev of order.statusHistory) {
      const lines = wrapText(ev.note, 9, font, CONTENT_W - 90);
      const rowH = 14 + lines.length * 12;
      ensureSpace(rowH);
      const evDate = new Date(ev.timestamp).toLocaleString("en-US", {
        timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      const evSt = STATUS_STYLE[ev.status] ?? { label: ev.status.toUpperCase(), fg: SLATE_600, bg: SLATE_100 };
      page.drawCircle({ x: MARGIN + 2, y: y + 3, size: 3, color: evSt.fg });
      page.drawText(evDate, { x: MARGIN + 12, y, size: 8, font: bold, color: SLATE_600 });
      let ly = y;
      for (const line of lines) {
        page.drawText(line, { x: MARGIN + 90, y: ly, size: 9, font, color: SLATE_900 });
        ly -= 12;
      }
      y = Math.min(ly, y - 14) - 4;
    }
  }

  for (const p of pages) drawFooter(p);
  // Page numbers, added last once total page count is known
  pages.forEach((p, i) => {
    const label = `Page ${i + 1} of ${pages.length}`;
    p.drawText(label, {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(label, 7.5), y: FOOTER_H - 26, size: 7.5, font, color: SLATE_400,
    });
  });

  return pdf.save();
}
