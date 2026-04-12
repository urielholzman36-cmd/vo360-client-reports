import { getDb } from "./client";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS reports (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL,
  client_name     TEXT NOT NULL,
  business_name   TEXT NOT NULL,
  niche           TEXT,
  report_month    TEXT NOT NULL,
  blob_url        TEXT,
  narrative_json  TEXT,
  raw_data_json   TEXT,
  sent            INTEGER DEFAULT 0,
  sent_at         TEXT,
  sent_to         TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reports_client ON reports(client_id, report_month);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
`;

let initialized = false;

export async function ensureDb() {
  if (initialized) return;
  const db = getDb();
  const statements = SCHEMA.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await db.execute(stmt);
  }
  initialized = true;
}
