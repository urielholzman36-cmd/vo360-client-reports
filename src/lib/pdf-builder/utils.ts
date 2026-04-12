import PDFDocument from "pdfkit";
import { BRAND, getLogoBuffer } from "./brand";

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_").trim();
}

export function drawHeaderBar(doc: InstanceType<typeof PDFDocument>, dateStr: string) {
  const pageWidth = doc.page.width;
  const logo = getLogoBuffer();
  const savedX = doc.x;
  const savedY = doc.y;
  doc.rect(0, 0, pageWidth, 80).fill(BRAND.colors.navy);
  doc.image(logo, 30, 15, { height: 50 });
  doc.font(BRAND.fonts.body).fontSize(10).fillColor(BRAND.colors.white)
    .text(dateStr, pageWidth - 180, 35, { width: 150, align: "right", lineBreak: false });
  doc.x = savedX;
  doc.y = savedY;
}

export function drawFooter(doc: InstanceType<typeof PDFDocument>) {
  const pageWidth = doc.page.width;
  const y = doc.page.height - 30;
  const savedY = doc.y;
  doc.font(BRAND.fonts.body).fontSize(8).fillColor(BRAND.colors.bodyText)
    .text("vo360.net  |  hello@vo360.net  |  Your Intelligent Execution Partner", 54, y,
      { width: pageWidth - 108, align: "center", lineBreak: false });
  doc.y = savedY;
}

export function drawSectionTitle(doc: InstanceType<typeof PDFDocument>, title: string) {
  doc.font(BRAND.fonts.heading).fontSize(14).fillColor(BRAND.colors.navy).text(title).moveDown(0.5);
}

export function resetBodyStyle(doc: InstanceType<typeof PDFDocument>) {
  doc.font(BRAND.fonts.body).fontSize(10).fillColor(BRAND.colors.bodyText);
}

export function drawStatCard(
  doc: InstanceType<typeof PDFDocument>,
  x: number, y: number, width: number, height: number,
  label: string, value: string, subtext: string, color: string
) {
  doc.roundedRect(x, y, width, height, 6).fill(color);
  doc.font(BRAND.fonts.heading).fontSize(22).fillColor(BRAND.colors.white)
    .text(value, x + 10, y + 12, { width: width - 20, align: "center" });
  doc.font(BRAND.fonts.body).fontSize(9).fillColor("rgba(255,255,255,0.85)")
    .text(label, x + 10, y + 38, { width: width - 20, align: "center" });
  if (subtext) {
    doc.font(BRAND.fonts.body).fontSize(7).fillColor("rgba(255,255,255,0.7)")
      .text(subtext, x + 10, y + 52, { width: width - 20, align: "center" });
  }
}
