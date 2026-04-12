import { NextRequest, NextResponse } from "next/server";
import { getReportById } from "@/lib/db/queries";
import { getClientById } from "@/lib/clients";
import { generateNarrative } from "@/lib/narrative-writer";
import type { NarrativeInput } from "@/lib/narrative-writer/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await getReportById(id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const client = getClientById(report.client_id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const rawData = JSON.parse(report.raw_data_json!);
  const [yearStr, monthStr] = report.report_month.split("-");
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx];

  const narrativeInput: NarrativeInput = {
    client: {
      business_name: client.business_name,
      niche: client.niche,
      contact_name: client.contact_name,
    },
    period: { month: monthName, year, label: `${monthName} ${year}` },
    current_month: rawData.current_month,
    previous_month: rawData.previous_month,
    is_first_month: rawData.is_first_month,
  };

  const narrative = await generateNarrative(narrativeInput);
  return NextResponse.json({ narrative });
}
