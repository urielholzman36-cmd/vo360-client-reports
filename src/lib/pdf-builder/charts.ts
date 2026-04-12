import PDFDocument from "pdfkit";
import { BRAND } from "./brand";

type Doc = InstanceType<typeof PDFDocument>;

export function drawBarChart(
  doc: Doc, x: number, y: number, width: number, height: number,
  data: { label: string; current: number; previous: number }[]
) {
  if (data.length === 0) return;
  const maxVal = Math.max(...data.flatMap((d) => [d.current, d.previous]), 1);
  const barAreaHeight = height - 30;
  const groupWidth = width / data.length;
  const barWidth = groupWidth * 0.3;
  const gap = groupWidth * 0.1;
  const baseline = y + barAreaHeight;

  for (let i = 0; i < data.length; i++) {
    const gx = x + i * groupWidth + gap;
    const prevH = (data[i].previous / maxVal) * barAreaHeight;
    if (data[i].previous > 0) {
      doc.roundedRect(gx, baseline - prevH, barWidth, prevH, 2).fill(BRAND.colors.lightGray);
    }
    const curH = (data[i].current / maxVal) * barAreaHeight;
    if (data[i].current > 0) {
      doc.roundedRect(gx + barWidth + 2, baseline - curH, barWidth, curH, 2).fill(BRAND.colors.orange);
    }
    doc.font(BRAND.fonts.body).fontSize(7).fillColor(BRAND.colors.bodyText)
      .text(data[i].label, gx, baseline + 4, { width: groupWidth - gap * 2, align: "center" });
  }
}

export function drawDoughnutChart(
  doc: Doc, cx: number, cy: number, radius: number,
  segments: { value: number; color: string; label: string }[]
) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return;
  let startAngle = -Math.PI / 2;

  for (const seg of segments) {
    const sliceAngle = (seg.value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const innerRadius = radius * 0.55;
    doc.save();
    doc.path(arcPath(cx, cy, radius, innerRadius, startAngle, endAngle));
    doc.fill(seg.color);
    doc.restore();
    startAngle = endAngle;
  }

  let legendY = cy + radius + 10;
  for (const seg of segments) {
    doc.circle(cx - radius + 5, legendY + 4, 3).fill(seg.color);
    doc.font(BRAND.fonts.body).fontSize(7).fillColor(BRAND.colors.bodyText)
      .text(`${seg.label}: ${seg.value}`, cx - radius + 12, legendY, { width: radius * 2 });
    legendY += 12;
  }
}

function arcPath(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number): { x: number; y: number } {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function drawHorizontalBarChart(
  doc: Doc, x: number, y: number, width: number,
  bars: { label: string; value: number; color: string }[]
) {
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const barHeight = 18;
  const rowHeight = 30;
  for (let i = 0; i < bars.length; i++) {
    const rowY = y + i * rowHeight;
    const barW = Math.max(4, (bars[i].value / maxVal) * (width - 100));
    doc.font(BRAND.fonts.body).fontSize(9).fillColor(BRAND.colors.bodyText)
      .text(bars[i].label, x, rowY + 3, { width: 60 });
    doc.roundedRect(x + 65, rowY, barW, barHeight, 3).fill(bars[i].color);
    doc.font(BRAND.fonts.heading).fontSize(9).fillColor(BRAND.colors.white)
      .text(String(bars[i].value), x + 65 + 6, rowY + 4);
  }
}
