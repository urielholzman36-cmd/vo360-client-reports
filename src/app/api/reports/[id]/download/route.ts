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

  if (report.blob_url.startsWith("/output/")) {
    const fileData = readFileSync(join(process.cwd(), "public", report.blob_url));
    return new Response(fileData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const pdfRes = await fetch(report.blob_url);
  return new Response(pdfRes.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
