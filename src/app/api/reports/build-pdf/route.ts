import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { buildReportPdf, buildReportFilename } from "@/lib/pdf-builder";
import { getReportById, updateReportBlob, updateReportNarrative } from "@/lib/db/queries";
import type { NarrativeOutput } from "@/lib/narrative-writer/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { report_id, narrative } = body as { report_id: string; narrative: NarrativeOutput };

  if (!report_id || !narrative) {
    return NextResponse.json({ error: "report_id and narrative required" }, { status: 400 });
  }

  const report = await getReportById(report_id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const rawData = JSON.parse(report.raw_data_json!);

  const pdfBuffer = await buildReportPdf({
    narrative,
    currentMonth: rawData.current_month,
    previousMonth: rawData.previous_month,
    businessName: report.business_name,
    periodLabel: rawData.period_label,
    isFirstMonth: rawData.is_first_month,
  });

  const filename = buildReportFilename(report.business_name, rawData.period_label);

  let blobUrl: string;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Production: upload to Vercel Blob
    const { put } = await import("@vercel/blob");
    const blob = await put(filename, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
    });
    blobUrl = blob.url;
  } else {
    // Local dev: save to public/output/ and serve via Next.js static
    const outputDir = join(process.cwd(), "public", "output");
    mkdirSync(outputDir, { recursive: true });
    const filePath = join(outputDir, filename);
    writeFileSync(filePath, pdfBuffer);
    blobUrl = `/output/${filename}`;
  }

  await updateReportBlob(report_id, blobUrl);
  await updateReportNarrative(report_id, JSON.stringify(narrative));

  return NextResponse.json({ id: report_id, blob_url: blobUrl, filename });
}
