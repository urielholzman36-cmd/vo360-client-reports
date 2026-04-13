import PDFDocument from "pdfkit";
import { BRAND } from "./brand";
import { drawHeaderBar, drawFooter, drawSectionTitle, resetBodyStyle, drawStatCard, sanitizeFilename } from "./utils";
import { drawBarChart, drawDoughnutChart, drawHorizontalBarChart } from "./charts";
import type { NarrativeOutput } from "../narrative-writer/types";
import type { ReportMonthData } from "../ghl-data-puller/monthly-aggregate";

export interface BuildPdfInput {
  narrative: NarrativeOutput;
  currentMonth: ReportMonthData;
  previousMonth: ReportMonthData | null;
  businessName: string;
  periodLabel: string;
  isFirstMonth: boolean;
}

export async function buildReportPdf(input: BuildPdfInput): Promise<Buffer> {
  const { narrative, currentMonth, previousMonth, businessName, periodLabel, isFirstMonth } = input;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: BRAND.page.size, margins: BRAND.page.margins });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = 612;
    const contentWidth = pageWidth - BRAND.page.margins.left - BRAND.page.margins.right;
    const leftX = BRAND.page.margins.left;
    const dateStr = new Date().toISOString().split("T")[0];

    let addingPage = false;
    doc.on("pageAdded", () => {
      if (addingPage) return;
      addingPage = true;
      drawHeaderBar(doc, dateStr);
      doc.x = leftX;
      doc.y = 100;
      addingPage = false;
    });

    // PAGE 1: Cover + Executive Summary
    drawHeaderBar(doc, dateStr);

    doc.moveDown(4);
    doc.font(BRAND.fonts.heading).fontSize(26).fillColor(BRAND.colors.navy)
      .text("Monthly Growth Report", leftX, doc.y, { width: contentWidth });
    doc.font(BRAND.fonts.heading).fontSize(18).fillColor(BRAND.colors.orange)
      .text(businessName, { width: contentWidth });
    doc.font(BRAND.fonts.body).fontSize(12).fillColor(BRAND.colors.bodyText)
      .text(periodLabel, { width: contentWidth });
    doc.moveDown(1.5);

    drawSectionTitle(doc, "Executive Summary");
    resetBodyStyle(doc);
    doc.text(narrative.executive_summary, { width: contentWidth });
    doc.moveDown(1.5);

    const cardW = (contentWidth - 30) / 4;
    const cardH = 68;
    const cardY = doc.y;
    const prevLeads = previousMonth?.new_leads ?? 0;
    const leadDiff = currentMonth.new_leads - prevLeads;
    const leadSub = isFirstMonth ? "baseline" : (leadDiff >= 0 ? `+${leadDiff}` : `${leadDiff}`) + " vs last month";

    drawStatCard(doc, leftX, cardY, cardW, cardH, "New Leads", String(currentMonth.new_leads), leadSub, BRAND.colors.orange);
    drawStatCard(doc, leftX + cardW + 10, cardY, cardW, cardH, "Appointments", String(currentMonth.appointments_booked), `${currentMonth.appointments_completed} completed`, BRAND.colors.navy);
    drawStatCard(doc, leftX + (cardW + 10) * 2, cardY, cardW, cardH, "Deals Won", String(currentMonth.pipeline_won), `${currentMonth.pipeline_open} still open`, BRAND.colors.green);
    drawStatCard(doc, leftX + (cardW + 10) * 3, cardY, cardW, cardH, "Avg Response", `${currentMonth.conversations_avg_response_hours}h`, `${currentMonth.conversations_total} conversations`, BRAND.colors.magenta);

    // PAGE 2: Performance Details
    doc.addPage();
    drawSectionTitle(doc, narrative.sections.leads.headline);
    resetBodyStyle(doc);
    doc.text(narrative.sections.leads.narrative, { width: contentWidth });
    doc.moveDown(0.5);

    if (!isFirstMonth && previousMonth) {
      const weekLabels = ["Week 1", "Week 2", "Week 3", "Week 4"];
      const curPerWeek = splitIntoWeeks(currentMonth.new_leads, 4);
      const prevPerWeek = splitIntoWeeks(previousMonth.new_leads, 4);
      const barData = weekLabels.map((label, i) => ({ label, current: curPerWeek[i], previous: prevPerWeek[i] }));
      drawBarChart(doc, leftX, doc.y, contentWidth, 120, barData);
      doc.y += 130;
    }
    doc.moveDown(1);

    if (doc.y > 500) doc.addPage();
    drawSectionTitle(doc, narrative.sections.appointments.headline);
    resetBodyStyle(doc);
    doc.text(narrative.sections.appointments.narrative, { width: contentWidth });
    doc.moveDown(0.5);

    drawDoughnutChart(doc, leftX + contentWidth / 2, doc.y + 50, 45, [
      { value: currentMonth.appointments_completed, color: BRAND.colors.green, label: "Completed" },
      { value: currentMonth.appointments_no_show, color: BRAND.colors.red, label: "No-show" },
    ]);
    doc.y += 140;
    doc.moveDown(1);

    if (doc.y > 500) doc.addPage();
    drawSectionTitle(doc, narrative.sections.pipeline.headline);
    resetBodyStyle(doc);
    doc.text(narrative.sections.pipeline.narrative, { width: contentWidth });
    doc.moveDown(0.5);

    drawHorizontalBarChart(doc, leftX, doc.y, contentWidth, [
      { label: "Won", value: currentMonth.pipeline_won, color: BRAND.colors.green },
      { label: "Lost", value: currentMonth.pipeline_lost, color: BRAND.colors.red },
      { label: "Open", value: currentMonth.pipeline_open, color: BRAND.colors.orange },
    ]);
    doc.y += 100;

    // PAGE 3: Engagement + Reviews + Comparison Table
    doc.addPage();
    drawSectionTitle(doc, narrative.sections.conversations.headline);
    resetBodyStyle(doc);
    doc.text(narrative.sections.conversations.narrative, { width: contentWidth });
    doc.moveDown(1);

    drawSectionTitle(doc, narrative.sections.reviews.headline);
    resetBodyStyle(doc);
    doc.text(narrative.sections.reviews.narrative, { width: contentWidth });
    doc.moveDown(0.3);

    const stars = Math.round(currentMonth.avg_review_rating);
    const starStr = "\u2605".repeat(stars) + "\u2606".repeat(5 - stars);
    doc.font(BRAND.fonts.heading).fontSize(16).fillColor(BRAND.colors.orange)
      .text(`${starStr}  ${currentMonth.avg_review_rating}/5.0`, { width: contentWidth });
    doc.moveDown(1.5);

    if (!isFirstMonth && previousMonth) {
      drawSectionTitle(doc, "Month-over-Month Summary");
      const rows = [
        ["New Leads", currentMonth.new_leads, previousMonth.new_leads],
        ["Appointments Booked", currentMonth.appointments_booked, previousMonth.appointments_booked],
        ["Deals Won", currentMonth.pipeline_won, previousMonth.pipeline_won],
        ["Avg Response (hrs)", currentMonth.conversations_avg_response_hours, previousMonth.conversations_avg_response_hours],
        ["Review Requests Sent", currentMonth.review_requests_sent, previousMonth.review_requests_sent],
        ["New Reviews", currentMonth.new_reviews, previousMonth.new_reviews],
      ];
      const colWidths = [contentWidth * 0.4, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.2];
      const rowH = 24;

      const headerY = doc.y;
      doc.rect(leftX, headerY, contentWidth, rowH).fill(BRAND.colors.navy);
      doc.font(BRAND.fonts.heading).fontSize(9).fillColor(BRAND.colors.white);
      doc.text("Metric", leftX + 8, headerY + 7, { width: colWidths[0] });
      doc.text("This Month", leftX + colWidths[0], headerY + 7, { width: colWidths[1], align: "center" });
      doc.text("Last Month", leftX + colWidths[0] + colWidths[1], headerY + 7, { width: colWidths[2], align: "center" });
      doc.text("Change", leftX + colWidths[0] + colWidths[1] + colWidths[2], headerY + 7, { width: colWidths[3], align: "center" });
      doc.y = headerY + rowH;

      for (let i = 0; i < rows.length; i++) {
        const rowY = doc.y;
        if (i % 2 === 0) { doc.rect(leftX, rowY, contentWidth, rowH).fill("#F0F0F0"); }
        const [label, cur, prev] = rows[i];
        const diff = Number(cur) - Number(prev);
        const changeStr = diff >= 0 ? `+${diff}` : `${diff}`;
        const changeColor = diff >= 0 ? BRAND.colors.green : BRAND.colors.red;
        doc.font(BRAND.fonts.body).fontSize(9).fillColor(BRAND.colors.bodyText);
        doc.text(String(label), leftX + 8, rowY + 7, { width: colWidths[0] });
        doc.text(String(cur), leftX + colWidths[0], rowY + 7, { width: colWidths[1], align: "center" });
        doc.text(String(prev), leftX + colWidths[0] + colWidths[1], rowY + 7, { width: colWidths[2], align: "center" });
        doc.font(BRAND.fonts.heading).fontSize(9).fillColor(changeColor);
        doc.text(changeStr, leftX + colWidths[0] + colWidths[1] + colWidths[2], rowY + 7, { width: colWidths[3], align: "center" });
        doc.y = rowY + rowH;
      }
    }

    // PAGE 4: Recommendations + Close
    doc.addPage();
    drawSectionTitle(doc, "Recommendations");
    resetBodyStyle(doc);

    for (let i = 0; i < narrative.recommendations.length; i++) {
      doc.font(BRAND.fonts.heading).fontSize(11).fillColor(BRAND.colors.orange)
        .text(`${i + 1}.`, leftX, doc.y, { continued: true, width: contentWidth });
      resetBodyStyle(doc);
      doc.text(`  ${narrative.recommendations[i]}`, { width: contentWidth });
      doc.moveDown(0.6);
    }

    doc.moveDown(2);
    drawSectionTitle(doc, "Looking Ahead");
    resetBodyStyle(doc);
    doc.fontSize(11);
    doc.text(narrative.closing_message, { width: contentWidth });

    doc.end();
  });
}

function splitIntoWeeks(total: number, weeks: number): number[] {
  const base = Math.floor(total / weeks);
  const remainder = total % weeks;
  return Array.from({ length: weeks }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function buildReportFilename(businessName: string, periodLabel: string): string {
  const name = sanitizeFilename(businessName);
  const period = sanitizeFilename(periodLabel);
  return `${name}_${period}_Report.pdf`;
}
