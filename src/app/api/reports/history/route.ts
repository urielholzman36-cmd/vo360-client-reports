import { NextResponse } from "next/server";
import { listReports } from "@/lib/db/queries";

export async function GET() {
  const reports = await listReports();
  return NextResponse.json(reports);
}
