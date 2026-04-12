import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getReportById } from "@/lib/db/queries";
import { buildReportFilename } from "@/lib/pdf-builder";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await getReportById(id);
  if (!report?.blob_url) {
    return NextResponse.json({ error: "PDF not built yet" }, { status: 404 });
  }

  const rawData = report.raw_data_json ? JSON.parse(report.raw_data_json) : {};
  const filename = buildReportFilename(report.business_name, rawData.period_label ?? report.report_month);

  let pdfBuffer: ArrayBuffer;

  if (report.blob_url.startsWith("/output/")) {
    // Local dev: read from public/output/
    const filePath = join(process.cwd(), "public", report.blob_url);
    pdfBuffer = readFileSync(filePath);
  } else {
    // Production: fetch from Vercel Blob URL
    const pdfRes = await fetch(report.blob_url);
    pdfBuffer = await pdfRes.arrayBuffer();
  }

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
