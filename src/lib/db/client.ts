import { createClient, type Client } from "@libsql/client";

let cached: Client | null = null;
let cachedUrl: string | null = null;

export function getDb(): Client {
  const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (cached && cachedUrl === url) return cached;
  cached = createClient({ url, authToken });
  cachedUrl = url;
  return cached;
}
