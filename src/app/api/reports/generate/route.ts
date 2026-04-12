import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getClientById } from "@/lib/clients";
import { createPuller } from "@/lib/ghl-data-puller";
import { toMonthlyAggregate, type ReportMonthData } from "@/lib/ghl-data-puller/monthly-aggregate";
import { generateNarrative } from "@/lib/narrative-writer";
import type { NarrativeInput } from "@/lib/narrative-writer/types";
import { insertReport } from "@/lib/db/queries";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { client_id, month } = body as { client_id: string; month: string };

  if (!client_id || !month) {
    return NextResponse.json({ error: "client_id and month required" }, { status: 400 });
  }

  const client = getClientById(client_id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx];

  const prevDate = new Date(year, monthIdx - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const isFirstMonth = month <= client.start_month;

  const puller = createPuller();
  const currentRange = {
    from: new Date(year, monthIdx, 1).toISOString(),
    to: new Date(year, monthIdx + 1, 0).toISOString(),
  };
  const currentRaw = await puller.pullAll(client.location_id, currentRange);
  const currentData = toMonthlyAggregate(currentRaw, client.id, month);

  let previousData: ReportMonthData | null = null;
  if (!isFirstMonth) {
    const prevRange = {
      from: new Date(prevDate.getFullYear(), prevDate.getMonth(), 1).toISOString(),
      to: new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).toISOString(),
    };
    const prevRaw = await puller.pullAll(client.location_id, prevRange);
    previousData = toMonthlyAggregate(prevRaw, client.id, prevMonth);
  }

  const narrativeInput: NarrativeInput = {
    client: {
      business_name: client.business_name,
      niche: client.niche,
      contact_name: client.contact_name,
    },
    period: { month: monthName, year, label: `${monthName} ${year}` },
    current_month: currentData,
    previous_month: previousData,
    is_first_month: isFirstMonth,
  };

  const narrative = await generateNarrative(narrativeInput);

  const reportId = uuid();
  await insertReport({
    id: reportId,
    client_id: client.id,
    client_name: client.contact_name,
    business_name: client.business_name,
    niche: client.niche,
    report_month: month,
    narrative_json: JSON.stringify(narrative),
    raw_data_json: JSON.stringify({
      current_month: currentData,
      previous_month: previousData,
      is_first_month: isFirstMonth,
      period_label: `${monthName} ${year}`,
    }),
  });

  return NextResponse.json({
    id: reportId,
    narrative,
    current_month: currentData,
    previous_month: previousData,
    is_first_month: isFirstMonth,
    period_label: `${monthName} ${year}`,
  });
}
