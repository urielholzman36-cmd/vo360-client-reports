import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getReportById, updateReportSent } from "@/lib/db/queries";
import { sendReportEmail } from "@/lib/email-sender";
import { buildReportFilename } from "@/lib/pdf-builder";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { email, subject, message } = body as { email: string; subject: string; message: string };

  if (!email || !subject || !message) {
    return NextResponse.json({ error: "email, subject, and message required" }, { status: 400 });
  }

  const report = await getReportById(id);
  if (!report?.blob_url) {
    return NextResponse.json({ error: "PDF not built yet" }, { status: 404 });
  }

  let pdfBuffer: Buffer;
  if (report.blob_url.startsWith("/output/")) {
    pdfBuffer = readFileSync(join(process.cwd(), "public", report.blob_url));
  } else {
    const pdfRes = await fetch(report.blob_url);
    pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  }
  const rawData = report.raw_data_json ? JSON.parse(report.raw_data_json) : {};
  const filename = buildReportFilename(report.business_name, rawData.period_label ?? report.report_month);

  await sendReportEmail({ to: email, subject, message, pdfBuffer, pdfFilename: filename });
  await updateReportSent(id, email);

  return NextResponse.json({ sent: true });
}
