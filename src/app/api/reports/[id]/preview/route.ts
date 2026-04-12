import { NextRequest, NextResponse } from "next/server";
import { getReportById } from "@/lib/db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await getReportById(id);
  if (!report?.blob_url) {
    return NextResponse.json({ error: "PDF not built yet" }, { status: 404 });
  }
  return NextResponse.redirect(report.blob_url);
}
