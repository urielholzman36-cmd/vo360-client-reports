import { getDb } from "./client";
import { ensureDb } from "./schema";

export interface ReportRecord {
  id: string;
  client_id: string;
  client_name: string;
  business_name: string;
  niche: string | null;
  report_month: string;
  blob_url: string | null;
  narrative_json: string | null;
  raw_data_json: string | null;
  sent: number;
  sent_at: string | null;
  sent_to: string | null;
  created_at: string;
}

export async function insertReport(report: {
  id: string;
  client_id: string;
  client_name: string;
  business_name: string;
  niche?: string;
  report_month: string;
  narrative_json?: string;
  raw_data_json?: string;
}): Promise<void> {
  await ensureDb();
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO reports (id, client_id, client_name, business_name, niche, report_month, narrative_json, raw_data_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      report.id, report.client_id, report.client_name, report.business_name,
      report.niche ?? null, report.report_month,
      report.narrative_json ?? null, report.raw_data_json ?? null,
    ],
  });
}

export async function getReportById(id: string): Promise<ReportRecord | null> {
  await ensureDb();
  const db = getDb();
  const result = await db.execute({ sql: "SELECT * FROM reports WHERE id = ?", args: [id] });
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as ReportRecord;
}

export async function listReports(): Promise<ReportRecord[]> {
  await ensureDb();
  const db = getDb();
  const result = await db.execute("SELECT * FROM reports ORDER BY created_at DESC");
  return result.rows as unknown as ReportRecord[];
}

export async function updateReportBlob(id: string, blobUrl: string): Promise<void> {
  await ensureDb();
  const db = getDb();
  await db.execute({ sql: "UPDATE reports SET blob_url = ? WHERE id = ?", args: [blobUrl, id] });
}

export async function updateReportNarrative(id: string, narrativeJson: string): Promise<void> {
  await ensureDb();
  const db = getDb();
  await db.execute({ sql: "UPDATE reports SET narrative_json = ? WHERE id = ?", args: [narrativeJson, id] });
}

export async function updateReportSent(id: string, email: string): Promise<void> {
  await ensureDb();
  const db = getDb();
  await db.execute({
    sql: "UPDATE reports SET sent = 1, sent_at = datetime('now'), sent_to = ? WHERE id = ?",
    args: [email, id],
  });
}

export async function countReportsByClient(clientId: string): Promise<number> {
  await ensureDb();
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT COUNT(*) as count FROM reports WHERE client_id = ?",
    args: [clientId],
  });
  return Number(result.rows[0].count);
}
