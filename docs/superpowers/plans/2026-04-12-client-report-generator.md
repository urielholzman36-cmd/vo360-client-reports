# Client Report Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 16 app that generates AI-narrated monthly PDF reports for GHL clients, with an editable narrative step before PDF generation.

**Architecture:** Next.js 16 App Router with Turso DB, Vercel Blob for PDF storage, Anthropic SDK for AI narrative generation, PDFKit for branded PDF output, Nodemailer for email delivery. Three UI views: generate, edit/preview, history. Code shared from Health Dashboard (ghl-data-puller, mock data) and Proposal Generator (brand.ts, PDF utils).

**Tech Stack:** Next.js 16, TypeScript, Turso (libsql), Vercel Blob, Anthropic SDK, PDFKit, Nodemailer, Tailwind CSS 4, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-12-client-report-generator-design.md`

---

## File Structure

```
vo360-client-reports/
  src/
    app/
      layout.tsx                          # Root layout: Inter font, dark mode, Nav
      globals.css                         # Tailwind + shadcn + VO360 theme + glass-card
      page.tsx                            # Generate page: client selector + month picker
      report/[id]/page.tsx                # Edit narrative + PDF preview page
      history/page.tsx                    # Report history table
      api/
        clients/route.ts                  # GET: list mock/real clients
        reports/
          generate/route.ts               # POST: pull GHL data + run AI narrative
          build-pdf/route.ts              # POST: finalized narrative → PDF → Blob
          history/route.ts                # GET: list all reports
          [id]/
            route.ts                      # GET: report metadata
            preview/route.ts              # GET: redirect to blob URL
            download/route.ts             # GET: stream PDF as attachment
            send/route.ts                 # POST: email report to client
            regenerate/route.ts           # POST: re-run AI on stored raw data
    lib/
      ghl-data-puller/
        types.ts                          # GHL data types (from Health Dashboard)
        index.ts                          # createPuller() factory
        mock-puller.ts                    # Mock implementation using fixtures
        monthly-aggregate.ts              # Converts raw GHL data → ReportMonthData
        fixtures/
          acme-plumbing.json              # Copy from Health Dashboard
          bright-electric.json
          clean-sweep.json
          delta-hvac.json
          eagle-roofing.json
      narrative-writer/
        types.ts                          # NarrativeInput, NarrativeOutput types
        prompts.ts                        # System prompt + tone guide
        index.ts                          # generateNarrative() using Anthropic SDK
      pdf-builder/
        brand.ts                          # Colors, fonts, logo (from Proposal Generator)
        utils.ts                          # Header bar, section title, footer, body style
        charts.ts                         # SVG chart generators for PDFKit
        index.ts                          # buildReportPdf() orchestrator
      email-sender/
        index.ts                          # sendReportEmail() via Nodemailer
      db/
        client.ts                         # Turso client singleton
        schema.ts                         # Reports table creation
        queries.ts                        # Insert, get, list, update report records
      clients.ts                          # Mock client list + getClients()
    components/
      nav.tsx                             # VO360 header with navigation links
      client-selector.tsx                 # Dropdown of active clients
      month-picker.tsx                    # Month/year selector
      narrative-editor.tsx                # Editable narrative sections
      pdf-preview.tsx                     # iframe PDF embed
      send-modal.tsx                      # Email confirmation modal
      history-table.tsx                   # Past reports table with filters
      ui/                                 # shadcn components (installed via CLI)
  public/
    logo.png                              # VO360 logo (copy from Proposal Generator)
  package.json
  next.config.ts
  tsconfig.json
  components.json                         # shadcn config
  .env.local                              # Environment variables
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `.env.local`, `components.json`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/components/nav.tsx`
- Copy: `public/logo.png` from Proposal Generator

- [ ] **Step 1: Initialize Next.js 16 project**

```bash
cd ~/vo360-client-reports
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --turbopack
```

Accept defaults. This creates the base Next.js 16 project with App Router and Tailwind CSS 4.

- [ ] **Step 2: Install all dependencies**

```bash
cd ~/vo360-client-reports
npm install @libsql/client @vercel/blob @anthropic-ai/sdk pdfkit nodemailer uuid
npm install -D @types/pdfkit @types/nodemailer @types/uuid
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
cd ~/vo360-client-reports
npx shadcn@latest init -d
```

Then install needed components:

```bash
npx shadcn@latest add button card input label select textarea dialog badge table dropdown-menu
```

- [ ] **Step 4: Copy logo from Proposal Generator**

```bash
cp ~/vo360-proposal-generator/public/logo.png ~/vo360-client-reports/public/logo.png
```

- [ ] **Step 5: Set up next.config.ts**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
```

PDFKit uses native Node.js `fs` and `stream` — `serverExternalPackages` prevents bundler from trying to bundle it client-side.

- [ ] **Step 6: Create .env.local**

```bash
# .env.local
ANTHROPIC_API_KEY=
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=
BLOB_READ_WRITE_TOKEN=
GHL_API_KEY=
GHL_MOCK_MODE=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SENDER_NAME=VO360
SENDER_EMAIL=hello@vo360.net
```

- [ ] **Step 7: Set up globals.css with VO360 dark theme**

Replace the generated `src/app/globals.css` with the VO360 theme. Copy the full CSS from the Proposal Generator (`~/vo360-proposal-generator/src/app/globals.css`) which includes:
- shadcn base variables (light + dark)
- `--color-vo360-navy`, `--color-vo360-orange`, `--color-vo360-magenta` custom colors
- `.glass-card` component class (glassmorphic navy background + blur)
- `.text-gradient` component class (orange → magenta gradient text)

- [ ] **Step 8: Create root layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VO360 Report Generator",
  description: "AI-narrated monthly growth reports for VO360 clients",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <Nav />
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Create Nav component**

```typescript
// src/components/nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const links = [
  { href: "/", label: "Generate" },
  { href: "/history", label: "History" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-white/10 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="VO360" width={36} height={36} />
        <span className="text-lg font-bold text-white">
          Report Generator
        </span>
      </div>
      <div className="flex gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm transition-colors ${
              pathname === link.href
                ? "text-vo360-orange font-medium"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 10: Create placeholder home page**

```typescript
// src/app/page.tsx
export default function GeneratePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Generate Client Report</h1>
      <p className="text-muted-foreground">Coming soon...</p>
    </div>
  );
}
```

- [ ] **Step 11: Set dev port to 3005 in package.json**

In `package.json`, change the `dev` script:

```json
"scripts": {
  "dev": "next dev --turbopack -p 3005",
```

- [ ] **Step 12: Verify the app runs**

```bash
cd ~/vo360-client-reports
npm run dev
```

Open `http://localhost:3005` in a browser. Verify: dark background, VO360 logo + nav bar visible, "Generate Client Report" heading.

- [ ] **Step 13: Commit**

```bash
cd ~/vo360-client-reports
git add -A
git commit -m "feat: scaffold Next.js 16 project with VO360 dark theme and shadcn/ui"
```

---

## Task 2: Database Layer

**Files:**
- Create: `src/lib/db/client.ts`, `src/lib/db/schema.ts`, `src/lib/db/queries.ts`

- [ ] **Step 1: Create Turso client singleton**

```typescript
// src/lib/db/client.ts
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
```

- [ ] **Step 2: Create schema with ensureDb**

```typescript
// src/lib/db/schema.ts
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
```

- [ ] **Step 3: Create query functions**

```typescript
// src/lib/db/queries.ts
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
      report.id,
      report.client_id,
      report.client_name,
      report.business_name,
      report.niche ?? null,
      report.report_month,
      report.narrative_json ?? null,
      report.raw_data_json ?? null,
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
  await db.execute({
    sql: "UPDATE reports SET blob_url = ? WHERE id = ?",
    args: [blobUrl, id],
  });
}

export async function updateReportNarrative(id: string, narrativeJson: string): Promise<void> {
  await ensureDb();
  const db = getDb();
  await db.execute({
    sql: "UPDATE reports SET narrative_json = ? WHERE id = ?",
    args: [narrativeJson, id],
  });
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
```

- [ ] **Step 4: Verify DB creates locally**

```bash
cd ~/vo360-client-reports
node -e "
const { getDb } = require('./src/lib/db/client');
const { ensureDb } = require('./src/lib/db/schema');
ensureDb().then(() => console.log('DB OK')).catch(e => console.error(e));
"
```

This may not work directly due to TypeScript. Instead, verify by importing in the next task when the API routes are created. The pattern is proven from both existing projects.

- [ ] **Step 5: Commit**

```bash
cd ~/vo360-client-reports
git add src/lib/db/
git commit -m "feat: add Turso database layer with reports schema and query functions"
```

---

## Task 3: GHL Data Puller + Mock Data

**Files:**
- Create: `src/lib/ghl-data-puller/types.ts`, `src/lib/ghl-data-puller/index.ts`, `src/lib/ghl-data-puller/mock-puller.ts`, `src/lib/ghl-data-puller/monthly-aggregate.ts`
- Create: `src/lib/ghl-data-puller/fixtures/acme-plumbing.json`, `bright-electric.json`, `clean-sweep.json`, `delta-hvac.json`, `eagle-roofing.json`
- Create: `src/lib/clients.ts`

- [ ] **Step 1: Copy types from Health Dashboard**

```typescript
// src/lib/ghl-data-puller/types.ts
// Copied from ~/client-health-dashboard/src/lib/ghl-data-puller/types.ts
export interface DateRange {
  from: string;
  to: string;
}

export interface Contact {
  id: string;
  dateAdded: string;
  tags: string[];
  source?: string;
}

export interface Opportunity {
  id: string;
  pipelineId: string;
  stageId: string;
  stageChangedAt: string;
  status: "open" | "won" | "lost" | "abandoned";
  monetaryValue: number;
  dateAdded: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  avgResponseMinutes: number | null;
}

export interface Appointment {
  id: string;
  startTime: string;
  status: "booked" | "showed" | "no-show" | "cancelled";
  contactId: string;
}

export interface GHLRawData {
  contacts: Contact[];
  opportunities: Opportunity[];
  conversations: Conversation[];
  appointments: Appointment[];
  reviewRequestsSent: number;
  metadata: {
    locationId: string;
    pulledAt: string;
    dateRange: DateRange;
  };
}

export interface GHLPuller {
  pullAll(locationId: string, dateRange: DateRange): Promise<GHLRawData>;
}
```

- [ ] **Step 2: Copy all 5 fixture JSON files**

```bash
mkdir -p ~/vo360-client-reports/src/lib/ghl-data-puller/fixtures
cp ~/client-health-dashboard/src/lib/ghl-data-puller/fixtures/*.json ~/vo360-client-reports/src/lib/ghl-data-puller/fixtures/
```

- [ ] **Step 3: Copy mock-puller from Health Dashboard**

```typescript
// src/lib/ghl-data-puller/mock-puller.ts
// Copied from ~/client-health-dashboard/src/lib/ghl-data-puller/mock-puller.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  GHLPuller,
  GHLRawData,
  DateRange,
  Contact,
  Opportunity,
  Conversation,
  Appointment,
} from "./types";

interface FixtureJson {
  niche: string;
  contactsDaysAgo: number[];
  opportunityStageMovesDaysAgo: number[];
  conversationLastInboundDaysAgo: number[];
  conversationLastOutboundDaysAgo: number[];
  avgResponseMinutes: number;
  appointmentStartDaysAgo: number[];
  reviewRequestsSent: number;
}

const daysAgoIso = (days: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
};

const FIXTURE_MAP: Record<string, string> = {
  client_acme: "acme-plumbing.json",
  client_bright: "bright-electric.json",
  client_clean: "clean-sweep.json",
  client_delta: "delta-hvac.json",
  client_eagle: "eagle-roofing.json",
};

function loadFixture(locationId: string): FixtureJson {
  const filename = FIXTURE_MAP[locationId];
  if (!filename) throw new Error(`No fixture for locationId ${locationId}`);
  const path = join(
    process.cwd(),
    "src/lib/ghl-data-puller/fixtures",
    filename
  );
  return JSON.parse(readFileSync(path, "utf8")) as FixtureJson;
}

export class MockPuller implements GHLPuller {
  async pullAll(
    locationId: string,
    dateRange: DateRange
  ): Promise<GHLRawData> {
    const fx = loadFixture(locationId);

    const contacts: Contact[] = fx.contactsDaysAgo.map((d, i) => ({
      id: `contact_${locationId}_${i}`,
      dateAdded: daysAgoIso(d),
      tags: [],
    }));

    const opportunities: Opportunity[] =
      fx.opportunityStageMovesDaysAgo.map((d, i) => ({
        id: `opp_${locationId}_${i}`,
        pipelineId: "pipe_default",
        stageId: `stage_${(i % 4) + 1}`,
        stageChangedAt: daysAgoIso(d),
        status: "open" as const,
        monetaryValue: 500,
        dateAdded: daysAgoIso(d + 5),
      }));

    const convoCount = Math.max(
      fx.conversationLastInboundDaysAgo.length,
      fx.conversationLastOutboundDaysAgo.length
    );
    const conversations: Conversation[] = Array.from(
      { length: convoCount },
      (_, i) => ({
        id: `conv_${locationId}_${i}`,
        contactId:
          contacts[i % Math.max(contacts.length, 1)]?.id ?? "c_unknown",
        lastInboundAt:
          fx.conversationLastInboundDaysAgo[i] != null
            ? daysAgoIso(fx.conversationLastInboundDaysAgo[i])
            : null,
        lastOutboundAt:
          fx.conversationLastOutboundDaysAgo[i] != null
            ? daysAgoIso(fx.conversationLastOutboundDaysAgo[i])
            : null,
        avgResponseMinutes: fx.avgResponseMinutes,
      })
    );

    const appointments: Appointment[] = fx.appointmentStartDaysAgo.map(
      (d, i) => ({
        id: `appt_${locationId}_${i}`,
        startTime: daysAgoIso(d),
        status: "booked" as const,
        contactId:
          contacts[i % Math.max(contacts.length, 1)]?.id ?? "c_unknown",
      })
    );

    return {
      contacts,
      opportunities,
      conversations,
      appointments,
      reviewRequestsSent: fx.reviewRequestsSent,
      metadata: {
        locationId,
        pulledAt: new Date().toISOString(),
        dateRange,
      },
    };
  }
}
```

- [ ] **Step 4: Create puller factory**

```typescript
// src/lib/ghl-data-puller/index.ts
import type { GHLPuller } from "./types";
import { MockPuller } from "./mock-puller";

export function createPuller(): GHLPuller {
  // Real puller will be added when GHL API is integrated
  return new MockPuller();
}

export type { GHLPuller, GHLRawData, DateRange } from "./types";
```

For V1 with mock mode only, always returns MockPuller. The `GHL_MOCK_MODE` env var check will be added when real GHL integration is built.

- [ ] **Step 5: Create monthly aggregate converter**

This is the key new piece — converts raw GHL data into the `ReportMonthData` format the narrative writer expects.

```typescript
// src/lib/ghl-data-puller/monthly-aggregate.ts
import type { GHLRawData } from "./types";

export interface ReportMonthData {
  new_leads: number;
  total_contacts: number;
  appointments_booked: number;
  appointments_completed: number;
  appointments_no_show: number;
  pipeline_opportunities: number;
  pipeline_won: number;
  pipeline_lost: number;
  pipeline_open: number;
  conversations_total: number;
  conversations_avg_response_hours: number;
  review_requests_sent: number;
  new_reviews: number;
  avg_review_rating: number;
}

/**
 * Seeded random number generator for deterministic mock data.
 * Given the same seed, always produces the same sequence.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Converts raw GHL pull data into monthly aggregate numbers for reports.
 * Fields not available in raw data are filled with deterministic mock values
 * so the same client+month always produces the same report.
 */
export function toMonthlyAggregate(
  raw: GHLRawData,
  clientId: string,
  month: string
): ReportMonthData {
  // Seed based on clientId + month for deterministic generation
  const seedStr = `${clientId}:${month}`;
  let seedNum = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seedNum = ((seedNum << 5) - seedNum + seedStr.charCodeAt(i)) | 0;
  }
  const rand = seededRandom(Math.abs(seedNum));

  const newLeads = raw.contacts.length;
  const appointmentsBooked = raw.appointments.length;

  // Derive completed/no-show from booked (60-85% show rate)
  const showRate = 0.6 + rand() * 0.25;
  const completed = Math.round(appointmentsBooked * showRate);
  const noShow = appointmentsBooked - completed;

  // Pipeline: opportunities = stage moves, split into won/lost/open
  const totalOpp = raw.opportunities.length;
  const wonRate = 0.3 + rand() * 0.2;
  const lostRate = 0.1 + rand() * 0.1;
  const won = Math.round(totalOpp * wonRate);
  const lost = Math.round(totalOpp * lostRate);
  const open = Math.max(0, totalOpp - won - lost);

  // Conversations
  const conversationsTotal = raw.conversations.length + Math.round(rand() * 40 + 20);

  // Response time from fixture avgResponseMinutes
  const avgResponseMinutes =
    raw.conversations.length > 0 && raw.conversations[0].avgResponseMinutes != null
      ? raw.conversations[0].avgResponseMinutes
      : 120;
  const avgResponseHours = Math.round((avgResponseMinutes / 60) * 10) / 10;

  // Reviews: derive from reviewRequestsSent
  const reviewRequests = raw.reviewRequestsSent;
  const conversionRate = 0.3 + rand() * 0.2;
  const newReviews = Math.max(0, Math.round(reviewRequests * conversionRate));
  const avgRating = Math.round((4.0 + rand() * 1.0) * 10) / 10;

  return {
    new_leads: newLeads,
    total_contacts: newLeads + Math.round(rand() * 100 + 50),
    appointments_booked: appointmentsBooked,
    appointments_completed: completed,
    appointments_no_show: noShow,
    pipeline_opportunities: totalOpp,
    pipeline_won: won,
    pipeline_lost: lost,
    pipeline_open: open,
    conversations_total: conversationsTotal,
    conversations_avg_response_hours: avgResponseHours,
    review_requests_sent: reviewRequests,
    new_reviews: newReviews,
    avg_review_rating: avgRating,
  };
}
```

- [ ] **Step 6: Create client list**

```typescript
// src/lib/clients.ts

export interface ClientProfile {
  id: string;
  business_name: string;
  location_id: string;
  niche: string;
  contact_name: string;
  contact_email: string;
  months_active: number;
  start_month: string; // YYYY-MM
}

export const MOCK_CLIENTS: ClientProfile[] = [
  {
    id: "client_acme",
    business_name: "Acme Plumbing",
    location_id: "client_acme",
    niche: "plumbing",
    contact_name: "John Smith",
    contact_email: "john@acmeplumbing.com",
    months_active: 3,
    start_month: "2026-01",
  },
  {
    id: "client_bright",
    business_name: "Bright Electric",
    location_id: "client_bright",
    niche: "electrical",
    contact_name: "Sarah Chen",
    contact_email: "sarah@brightelectric.com",
    months_active: 2,
    start_month: "2026-02",
  },
  {
    id: "client_clean",
    business_name: "Clean Sweep Services",
    location_id: "client_clean",
    niche: "cleaning",
    contact_name: "Maria Garcia",
    contact_email: "maria@cleansweep.com",
    months_active: 1,
    start_month: "2026-03",
  },
  {
    id: "client_delta",
    business_name: "Delta HVAC",
    location_id: "client_delta",
    niche: "hvac",
    contact_name: "Mike Johnson",
    contact_email: "mike@deltahvac.com",
    months_active: 4,
    start_month: "2025-12",
  },
  {
    id: "client_eagle",
    business_name: "Eagle Roofing",
    location_id: "client_eagle",
    niche: "roofing",
    contact_name: "Tom Williams",
    contact_email: "tom@eagleroofing.com",
    months_active: 2,
    start_month: "2026-02",
  },
];

export function getClients(): ClientProfile[] {
  return MOCK_CLIENTS;
}

export function getClientById(id: string): ClientProfile | undefined {
  return MOCK_CLIENTS.find((c) => c.id === id);
}
```

- [ ] **Step 7: Commit**

```bash
cd ~/vo360-client-reports
git add src/lib/ghl-data-puller/ src/lib/clients.ts
git commit -m "feat: add GHL data puller with mock fixtures and monthly aggregate converter"
```

---

## Task 4: Narrative Writer (AI Engine)

**Files:**
- Create: `src/lib/narrative-writer/types.ts`, `src/lib/narrative-writer/prompts.ts`, `src/lib/narrative-writer/index.ts`

- [ ] **Step 1: Define narrative types**

```typescript
// src/lib/narrative-writer/types.ts
import type { ReportMonthData } from "../ghl-data-puller/monthly-aggregate";

export interface NarrativeInput {
  client: {
    business_name: string;
    niche: string;
    contact_name: string;
  };
  period: {
    month: string; // "March"
    year: number;
    label: string; // "March 2026"
  };
  current_month: ReportMonthData;
  previous_month: ReportMonthData | null;
  is_first_month: boolean;
}

export interface NarrativeSection {
  headline: string;
  narrative: string;
  highlight_metric: string;
}

export interface NarrativeOutput {
  executive_summary: string;
  sections: {
    leads: NarrativeSection;
    appointments: NarrativeSection;
    pipeline: NarrativeSection;
    conversations: NarrativeSection;
    reviews: NarrativeSection;
  };
  recommendations: string[];
  closing_message: string;
}
```

- [ ] **Step 2: Create system prompt**

```typescript
// src/lib/narrative-writer/prompts.ts
import type { NarrativeInput } from "./types";

export const SYSTEM_PROMPT = `You are a business growth consultant writing a monthly performance report for a small business owner. Your job is to make the client feel good about their progress while providing honest, actionable insights.

TONE RULES:
- Lead with wins. Always open with the best metric — highest lead count, fastest response time, most appointments booked.
- Frame declines as opportunities. NEVER say "leads dropped" or "performance declined." Say "There's room to grow lead volume" or "This is an area with strong upside potential."
- Use specific numbers. "You received 34 new leads this month, 12 more than last month" — never "several" or "many."
- Celebrate milestones. First month? "Great foundation set." Hit a record? "Best month yet."
- End with actionable recommendations. 2-3 specific next steps the client can take.
- Keep it concise. Executive summary: 3-4 sentences. Section narratives: 2-3 sentences each. Total narrative text: under 500 words.
- No jargon. Write for a business owner, not a marketer. "Pipeline movement" becomes "deals progressing toward close."
- Use the client's first name and business name naturally in the narrative.

COMPARISON RULES:
- When comparing to previous month: always include BOTH percentage change AND absolute numbers.
- When it's the first month (no comparison data): frame everything as "baseline established" and set positive expectations. Do NOT reference a previous month.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure. No markdown, no code fences, no preamble.

{
  "executive_summary": "3-4 sentences summarizing the month's highlights",
  "sections": {
    "leads": { "headline": "...", "narrative": "...", "highlight_metric": "..." },
    "appointments": { "headline": "...", "narrative": "...", "highlight_metric": "..." },
    "pipeline": { "headline": "...", "narrative": "...", "highlight_metric": "..." },
    "conversations": { "headline": "...", "narrative": "...", "highlight_metric": "..." },
    "reviews": { "headline": "...", "narrative": "...", "highlight_metric": "..." }
  },
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"],
  "closing_message": "Warm closing using client's first name"
}`;

export function buildUserPrompt(input: NarrativeInput): string {
  return JSON.stringify(input, null, 2);
}
```

- [ ] **Step 3: Create narrative generator**

```typescript
// src/lib/narrative-writer/index.ts
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import type { NarrativeInput, NarrativeOutput } from "./types";

const anthropic = new Anthropic();

export async function generateNarrative(
  input: NarrativeInput
): Promise<NarrativeOutput> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(input),
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Strip markdown code fences if the model wraps output
  const cleaned = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");

  const parsed: NarrativeOutput = JSON.parse(cleaned);
  return parsed;
}

export type { NarrativeInput, NarrativeOutput, NarrativeSection } from "./types";
```

- [ ] **Step 4: Commit**

```bash
cd ~/vo360-client-reports
git add src/lib/narrative-writer/
git commit -m "feat: add AI narrative writer with Anthropic SDK and tone-guided system prompt"
```

---

## Task 5: PDF Builder — Brand + Utils

**Files:**
- Create: `src/lib/pdf-builder/brand.ts`, `src/lib/pdf-builder/utils.ts`

- [ ] **Step 1: Copy brand.ts from Proposal Generator**

```typescript
// src/lib/pdf-builder/brand.ts
// Copied from ~/vo360-proposal-generator/src/lib/pdf/brand.ts
// Added green color for charts
import fs from "fs";
import path from "path";

export const BRAND = {
  colors: {
    navy: "#1B2B6B",
    orange: "#F47B20",
    magenta: "#C2185B",
    green: "#27AE60",
    backgroundLight: "#F5F5F5",
    bodyText: "#555555",
    white: "#FFFFFF",
    black: "#000000",
    lightGray: "#D0D0D0",
    red: "#E74C3C",
  },
  fonts: {
    heading: "Helvetica-Bold",
    body: "Helvetica",
  },
  page: {
    size: "LETTER" as const,
    margins: {
      top: 54,
      bottom: 54,
      left: 54,
      right: 54,
    },
  },
};

let logoBuffer: Buffer | null = null;

export function getLogoBuffer(): Buffer {
  if (logoBuffer) return logoBuffer;
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  logoBuffer = fs.readFileSync(logoPath);
  return logoBuffer;
}
```

- [ ] **Step 2: Copy and extend utils.ts**

```typescript
// src/lib/pdf-builder/utils.ts
// Based on ~/vo360-proposal-generator/src/lib/pdf/utils.ts
// Extended with report-specific helpers
import PDFDocument from "pdfkit";
import { BRAND, getLogoBuffer } from "./brand";

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

export function drawHeaderBar(
  doc: InstanceType<typeof PDFDocument>,
  dateStr: string
) {
  const pageWidth = doc.page.width;
  const logo = getLogoBuffer();
  const savedX = doc.x;
  const savedY = doc.y;

  doc.rect(0, 0, pageWidth, 80).fill(BRAND.colors.navy);
  doc.image(logo, 30, 15, { height: 50 });
  doc
    .font(BRAND.fonts.body)
    .fontSize(10)
    .fillColor(BRAND.colors.white)
    .text(dateStr, pageWidth - 180, 35, {
      width: 150,
      align: "right",
      lineBreak: false,
    });

  doc.x = savedX;
  doc.y = savedY;
}

export function drawFooter(doc: InstanceType<typeof PDFDocument>) {
  const pageWidth = doc.page.width;
  const y = doc.page.height - 30;
  const savedY = doc.y;

  doc
    .font(BRAND.fonts.body)
    .fontSize(8)
    .fillColor(BRAND.colors.bodyText)
    .text(
      "vo360.net  |  hello@vo360.net  |  Your Intelligent Execution Partner",
      54,
      y,
      { width: pageWidth - 108, align: "center", lineBreak: false }
    );

  doc.y = savedY;
}

export function drawSectionTitle(
  doc: InstanceType<typeof PDFDocument>,
  title: string
) {
  doc
    .font(BRAND.fonts.heading)
    .fontSize(14)
    .fillColor(BRAND.colors.navy)
    .text(title)
    .moveDown(0.5);
}

export function resetBodyStyle(doc: InstanceType<typeof PDFDocument>) {
  doc.font(BRAND.fonts.body).fontSize(10).fillColor(BRAND.colors.bodyText);
}

/**
 * Draw a colored stat card. Used for highlight metrics on page 1.
 */
export function drawStatCard(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  subtext: string,
  color: string
) {
  // Card background
  doc.roundedRect(x, y, width, height, 6).fill(color);

  // Value (large, white)
  doc
    .font(BRAND.fonts.heading)
    .fontSize(22)
    .fillColor(BRAND.colors.white)
    .text(value, x + 10, y + 12, { width: width - 20, align: "center" });

  // Label (small, white)
  doc
    .font(BRAND.fonts.body)
    .fontSize(9)
    .fillColor("rgba(255,255,255,0.85)")
    .text(label, x + 10, y + 38, { width: width - 20, align: "center" });

  // Subtext (tiny, white, below label)
  if (subtext) {
    doc
      .font(BRAND.fonts.body)
      .fontSize(7)
      .fillColor("rgba(255,255,255,0.7)")
      .text(subtext, x + 10, y + 52, { width: width - 20, align: "center" });
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/vo360-client-reports
git add src/lib/pdf-builder/brand.ts src/lib/pdf-builder/utils.ts
git commit -m "feat: add PDF brand spec and utility functions from Proposal Generator"
```

---

## Task 6: PDF Builder — Charts

**Files:**
- Create: `src/lib/pdf-builder/charts.ts`

SVG-style charts drawn directly using PDFKit drawing primitives (rect, circle, line, moveTo, lineTo). No external chart library needed.

- [ ] **Step 1: Create chart drawing functions**

```typescript
// src/lib/pdf-builder/charts.ts
import PDFDocument from "pdfkit";
import { BRAND } from "./brand";

type Doc = InstanceType<typeof PDFDocument>;

/**
 * Grouped bar chart — current month vs previous month.
 * Used for: leads by category or weekly comparison.
 */
export function drawBarChart(
  doc: Doc,
  x: number,
  y: number,
  width: number,
  height: number,
  data: { label: string; current: number; previous: number }[]
) {
  if (data.length === 0) return;

  const maxVal = Math.max(...data.flatMap((d) => [d.current, d.previous]), 1);
  const barAreaHeight = height - 30; // leave room for labels
  const groupWidth = width / data.length;
  const barWidth = groupWidth * 0.3;
  const gap = groupWidth * 0.1;

  // Y-axis baseline
  const baseline = y + barAreaHeight;

  for (let i = 0; i < data.length; i++) {
    const gx = x + i * groupWidth + gap;

    // Previous month bar (gray)
    const prevH = (data[i].previous / maxVal) * barAreaHeight;
    if (data[i].previous > 0) {
      doc
        .roundedRect(gx, baseline - prevH, barWidth, prevH, 2)
        .fill(BRAND.colors.lightGray);
    }

    // Current month bar (orange)
    const curH = (data[i].current / maxVal) * barAreaHeight;
    if (data[i].current > 0) {
      doc
        .roundedRect(gx + barWidth + 2, baseline - curH, barWidth, curH, 2)
        .fill(BRAND.colors.orange);
    }

    // Label below
    doc
      .font(BRAND.fonts.body)
      .fontSize(7)
      .fillColor(BRAND.colors.bodyText)
      .text(data[i].label, gx, baseline + 4, {
        width: groupWidth - gap * 2,
        align: "center",
      });
  }
}

/**
 * Doughnut/pie chart.
 * Used for: appointment breakdown (completed/no-show/cancelled).
 */
export function drawDoughnutChart(
  doc: Doc,
  cx: number,
  cy: number,
  radius: number,
  segments: { value: number; color: string; label: string }[]
) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2; // start from top

  for (const seg of segments) {
    const sliceAngle = (seg.value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    // Draw arc segment using PDFKit path
    const innerRadius = radius * 0.55;

    // Outer arc
    doc.save();
    doc.path(
      arcPath(cx, cy, radius, innerRadius, startAngle, endAngle)
    );
    doc.fill(seg.color);
    doc.restore();

    startAngle = endAngle;
  }

  // Legend below
  let legendY = cy + radius + 10;
  for (const seg of segments) {
    doc.circle(cx - radius + 5, legendY + 4, 3).fill(seg.color);
    doc
      .font(BRAND.fonts.body)
      .fontSize(7)
      .fillColor(BRAND.colors.bodyText)
      .text(`${seg.label}: ${seg.value}`, cx - radius + 12, legendY, {
        width: radius * 2,
      });
    legendY += 12;
  }
}

/**
 * Build SVG-style path string for a doughnut arc segment.
 */
function arcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angle: number
): { x: number; y: number } {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

/**
 * Horizontal bar chart.
 * Used for: pipeline status (won/lost/open).
 */
export function drawHorizontalBarChart(
  doc: Doc,
  x: number,
  y: number,
  width: number,
  bars: { label: string; value: number; color: string }[]
) {
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const barHeight = 18;
  const rowHeight = 30;

  for (let i = 0; i < bars.length; i++) {
    const rowY = y + i * rowHeight;
    const barW = Math.max(4, (bars[i].value / maxVal) * (width - 100));

    // Label
    doc
      .font(BRAND.fonts.body)
      .fontSize(9)
      .fillColor(BRAND.colors.bodyText)
      .text(bars[i].label, x, rowY + 3, { width: 60 });

    // Bar
    doc
      .roundedRect(x + 65, rowY, barW, barHeight, 3)
      .fill(bars[i].color);

    // Value on bar
    doc
      .font(BRAND.fonts.heading)
      .fontSize(9)
      .fillColor(BRAND.colors.white)
      .text(String(bars[i].value), x + 65 + 6, rowY + 4);
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/vo360-client-reports
git add src/lib/pdf-builder/charts.ts
git commit -m "feat: add SVG-based chart drawing functions for PDFKit (bar, doughnut, horizontal bar)"
```

---

## Task 7: PDF Builder — Report Assembly

**Files:**
- Create: `src/lib/pdf-builder/index.ts`

This is the main orchestrator that assembles the 3-4 page branded PDF from narrative output + raw data.

- [ ] **Step 1: Create the PDF builder**

```typescript
// src/lib/pdf-builder/index.ts
import PDFDocument from "pdfkit";
import { BRAND, getLogoBuffer } from "./brand";
import {
  drawHeaderBar,
  drawFooter,
  drawSectionTitle,
  resetBodyStyle,
  drawStatCard,
  sanitizeFilename,
} from "./utils";
import {
  drawBarChart,
  drawDoughnutChart,
  drawHorizontalBarChart,
} from "./charts";
import type { NarrativeOutput } from "../narrative-writer/types";
import type { ReportMonthData } from "../ghl-data-puller/monthly-aggregate";

export interface BuildPdfInput {
  narrative: NarrativeOutput;
  currentMonth: ReportMonthData;
  previousMonth: ReportMonthData | null;
  businessName: string;
  periodLabel: string; // "March 2026"
  isFirstMonth: boolean;
}

export async function buildReportPdf(input: BuildPdfInput): Promise<Buffer> {
  const { narrative, currentMonth, previousMonth, businessName, periodLabel, isFirstMonth } = input;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: BRAND.page.size,
      margins: BRAND.page.margins,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = 612;
    const contentWidth = pageWidth - BRAND.page.margins.left - BRAND.page.margins.right;
    const leftX = BRAND.page.margins.left;
    const dateStr = new Date().toISOString().split("T")[0];

    // Header + footer on every new page
    doc.on("pageAdded", () => {
      drawHeaderBar(doc, dateStr);
      drawFooter(doc);
      doc.x = leftX;
      doc.y = 100;
    });

    // ═══════════════════════════════════════════
    // PAGE 1: Cover + Executive Summary
    // ═══════════════════════════════════════════
    drawHeaderBar(doc, dateStr);
    drawFooter(doc);

    // Title block
    doc.moveDown(4);
    doc
      .font(BRAND.fonts.heading)
      .fontSize(26)
      .fillColor(BRAND.colors.navy)
      .text("Monthly Growth Report", leftX, doc.y, { width: contentWidth });
    doc
      .font(BRAND.fonts.heading)
      .fontSize(18)
      .fillColor(BRAND.colors.orange)
      .text(businessName, { width: contentWidth });
    doc
      .font(BRAND.fonts.body)
      .fontSize(12)
      .fillColor(BRAND.colors.bodyText)
      .text(periodLabel, { width: contentWidth });
    doc.moveDown(1.5);

    // Executive summary
    drawSectionTitle(doc, "Executive Summary");
    resetBodyStyle(doc);
    doc.text(narrative.executive_summary, { width: contentWidth });
    doc.moveDown(1.5);

    // Highlight stat cards (4 across)
    const cardW = (contentWidth - 30) / 4;
    const cardH = 68;
    const cardY = doc.y;

    const prevLeads = previousMonth?.new_leads ?? 0;
    const leadDiff = currentMonth.new_leads - prevLeads;
    const leadSub = isFirstMonth ? "baseline" : (leadDiff >= 0 ? `+${leadDiff}` : `${leadDiff}`) + " vs last month";

    drawStatCard(doc, leftX, cardY, cardW, cardH,
      "New Leads", String(currentMonth.new_leads), leadSub, BRAND.colors.orange);

    drawStatCard(doc, leftX + cardW + 10, cardY, cardW, cardH,
      "Appointments", String(currentMonth.appointments_booked),
      `${currentMonth.appointments_completed} completed`,
      BRAND.colors.navy);

    drawStatCard(doc, leftX + (cardW + 10) * 2, cardY, cardW, cardH,
      "Deals Won", String(currentMonth.pipeline_won),
      `${currentMonth.pipeline_open} still open`,
      BRAND.colors.green);

    drawStatCard(doc, leftX + (cardW + 10) * 3, cardY, cardW, cardH,
      "Avg Response", `${currentMonth.conversations_avg_response_hours}h`,
      `${currentMonth.conversations_total} conversations`,
      BRAND.colors.magenta);

    // ═══════════════════════════════════════════
    // PAGE 2: Performance Details
    // ═══════════════════════════════════════════
    doc.addPage();

    // Lead Generation section
    drawSectionTitle(doc, narrative.sections.leads.headline);
    resetBodyStyle(doc);
    doc.text(narrative.sections.leads.narrative, { width: contentWidth });
    doc.moveDown(0.5);

    // Bar chart: current vs previous leads (split into 4 weekly buckets)
    if (!isFirstMonth && previousMonth) {
      const weekLabels = ["Week 1", "Week 2", "Week 3", "Week 4"];
      const curPerWeek = splitIntoWeeks(currentMonth.new_leads, 4);
      const prevPerWeek = splitIntoWeeks(previousMonth.new_leads, 4);
      const barData = weekLabels.map((label, i) => ({
        label,
        current: curPerWeek[i],
        previous: prevPerWeek[i],
      }));
      drawBarChart(doc, leftX, doc.y, contentWidth, 120, barData);
      doc.y += 130;
    }
    doc.moveDown(1);

    // Appointments section
    if (doc.y > 500) doc.addPage();
    drawSectionTitle(doc, narrative.sections.appointments.headline);
    resetBodyStyle(doc);
    doc.text(narrative.sections.appointments.narrative, { width: contentWidth });
    doc.moveDown(0.5);

    // Doughnut chart: completed / no-show
    drawDoughnutChart(doc, leftX + contentWidth / 2, doc.y + 50, 45, [
      { value: currentMonth.appointments_completed, color: BRAND.colors.green, label: "Completed" },
      { value: currentMonth.appointments_no_show, color: BRAND.colors.red, label: "No-show" },
    ]);
    doc.y += 140;
    doc.moveDown(1);

    // Pipeline section
    if (doc.y > 500) doc.addPage();
    drawSectionTitle(doc, narrative.sections.pipeline.headline);
    resetBodyStyle(doc);
    doc.text(narrative.sections.pipeline.narrative, { width: contentWidth });
    doc.moveDown(0.5);

    drawHorizontalBarChart(doc, leftX, doc.y, contentWidth, [
      { label: "Won", value: currentMonth.pipeline_won, color: BRAND.colors.green },
      { label: "Lost", value: currentMonth.pipeline_lost, color: BRAND.colors.red },
      { label: "Open", value: currentMonth.pipeline_open, color: BRAND.colors.orange },
    ]);
    doc.y += 100;

    // ═══════════════════════════════════════════
    // PAGE 3: Engagement + Reviews + Comparison Table
    // ═══════════════════════════════════════════
    doc.addPage();

    // Conversations section
    drawSectionTitle(doc, narrative.sections.conversations.headline);
    resetBodyStyle(doc);
    doc.text(narrative.sections.conversations.narrative, { width: contentWidth });
    doc.moveDown(1);

    // Reviews section
    drawSectionTitle(doc, narrative.sections.reviews.headline);
    resetBodyStyle(doc);
    doc.text(narrative.sections.reviews.narrative, { width: contentWidth });
    doc.moveDown(0.3);

    // Star rating display
    const stars = Math.round(currentMonth.avg_review_rating);
    const starStr = "★".repeat(stars) + "☆".repeat(5 - stars);
    doc
      .font(BRAND.fonts.heading)
      .fontSize(16)
      .fillColor(BRAND.colors.orange)
      .text(`${starStr}  ${currentMonth.avg_review_rating}/5.0`, { width: contentWidth });
    doc.moveDown(1.5);

    // Month-over-Month Comparison Table
    if (!isFirstMonth && previousMonth) {
      drawSectionTitle(doc, "Month-over-Month Summary");

      const rows = [
        ["New Leads", currentMonth.new_leads, previousMonth.new_leads],
        ["Appointments Booked", currentMonth.appointments_booked, previousMonth.appointments_booked],
        ["Deals Won", currentMonth.pipeline_won, previousMonth.pipeline_won],
        ["Avg Response (hrs)", currentMonth.conversations_avg_response_hours, previousMonth.conversations_avg_response_hours],
        ["Review Requests Sent", currentMonth.review_requests_sent, previousMonth.review_requests_sent],
        ["New Reviews", currentMonth.new_reviews, previousMonth.new_reviews],
      ];

      const colWidths = [contentWidth * 0.4, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.2];
      const rowH = 24;

      // Header row
      const headerY = doc.y;
      doc.rect(leftX, headerY, contentWidth, rowH).fill(BRAND.colors.navy);
      doc.font(BRAND.fonts.heading).fontSize(9).fillColor(BRAND.colors.white);
      doc.text("Metric", leftX + 8, headerY + 7, { width: colWidths[0] });
      doc.text("This Month", leftX + colWidths[0], headerY + 7, { width: colWidths[1], align: "center" });
      doc.text("Last Month", leftX + colWidths[0] + colWidths[1], headerY + 7, { width: colWidths[2], align: "center" });
      doc.text("Change", leftX + colWidths[0] + colWidths[1] + colWidths[2], headerY + 7, { width: colWidths[3], align: "center" });

      doc.y = headerY + rowH;

      for (let i = 0; i < rows.length; i++) {
        const rowY = doc.y;
        if (i % 2 === 0) {
          doc.rect(leftX, rowY, contentWidth, rowH).fill("#F0F0F0");
        }

        const [label, cur, prev] = rows[i];
        const diff = Number(cur) - Number(prev);
        const changeStr = diff >= 0 ? `+${diff}` : `${diff}`;
        const changeColor = diff >= 0 ? BRAND.colors.green : BRAND.colors.red;

        doc.font(BRAND.fonts.body).fontSize(9).fillColor(BRAND.colors.bodyText);
        doc.text(String(label), leftX + 8, rowY + 7, { width: colWidths[0] });
        doc.text(String(cur), leftX + colWidths[0], rowY + 7, { width: colWidths[1], align: "center" });
        doc.text(String(prev), leftX + colWidths[0] + colWidths[1], rowY + 7, { width: colWidths[2], align: "center" });
        doc.font(BRAND.fonts.heading).fontSize(9).fillColor(changeColor);
        doc.text(changeStr, leftX + colWidths[0] + colWidths[1] + colWidths[2], rowY + 7, { width: colWidths[3], align: "center" });

        doc.y = rowY + rowH;
      }
    }

    // ═══════════════════════════════════════════
    // PAGE 4: Recommendations + Close
    // ═══════════════════════════════════════════
    doc.addPage();

    drawSectionTitle(doc, "Recommendations");
    resetBodyStyle(doc);

    for (let i = 0; i < narrative.recommendations.length; i++) {
      doc
        .font(BRAND.fonts.heading)
        .fontSize(11)
        .fillColor(BRAND.colors.orange)
        .text(`${i + 1}.`, leftX, doc.y, { continued: true, width: contentWidth });
      resetBodyStyle(doc);
      doc.text(`  ${narrative.recommendations[i]}`, { width: contentWidth });
      doc.moveDown(0.6);
    }

    doc.moveDown(2);

    // Closing message
    drawSectionTitle(doc, "Looking Ahead");
    resetBodyStyle(doc);
    doc.fontSize(11);
    doc.text(narrative.closing_message, { width: contentWidth });

    doc.end();
  });
}

/**
 * Split a total count into N roughly-equal buckets.
 * Used to simulate weekly breakdowns from monthly totals.
 */
function splitIntoWeeks(total: number, weeks: number): number[] {
  const base = Math.floor(total / weeks);
  const remainder = total % weeks;
  return Array.from({ length: weeks }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function buildReportFilename(businessName: string, periodLabel: string): string {
  const name = sanitizeFilename(businessName);
  const period = sanitizeFilename(periodLabel);
  return `${name}_${period}_Report.pdf`;
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/vo360-client-reports
git add src/lib/pdf-builder/index.ts
git commit -m "feat: add report PDF assembly with 4-page branded layout and charts"
```

---

## Task 8: Email Sender

**Files:**
- Create: `src/lib/email-sender/index.ts`

- [ ] **Step 1: Create email sender module**

```typescript
// src/lib/email-sender/index.ts
import nodemailer from "nodemailer";

interface SendReportEmailInput {
  to: string;
  subject: string;
  message: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendReportEmail(input: SendReportEmailInput): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"${process.env.SENDER_NAME ?? "VO360"}" <${process.env.SENDER_EMAIL ?? "hello@vo360.net"}>`,
    to: input.to,
    subject: input.subject,
    text: input.message,
    html: `<div style="font-family: Arial, sans-serif; color: #555;">
      <p>${input.message.replace(/\n/g, "<br>")}</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="font-size: 12px; color: #999;">
        Sent by VO360 — Your Intelligent Execution Partner<br>
        <a href="https://vo360.net" style="color: #F47B20;">vo360.net</a>
      </p>
    </div>`,
    attachments: [
      {
        filename: input.pdfFilename,
        content: input.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/vo360-client-reports
git add src/lib/email-sender/
git commit -m "feat: add email sender module with Nodemailer for report delivery"
```

---

## Task 9: API Routes — Clients + Generate + Build PDF

**Files:**
- Create: `src/app/api/clients/route.ts`
- Create: `src/app/api/reports/generate/route.ts`
- Create: `src/app/api/reports/build-pdf/route.ts`

- [ ] **Step 1: Create clients API route**

```typescript
// src/app/api/clients/route.ts
import { NextResponse } from "next/server";
import { getClients } from "@/lib/clients";

export async function GET() {
  const clients = getClients();
  return NextResponse.json(clients);
}
```

- [ ] **Step 2: Create generate API route**

This route pulls GHL data for current + previous month, runs the AI narrative, saves the report record, and returns the narrative for editing.

```typescript
// src/app/api/reports/generate/route.ts
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

  // Parse month string "YYYY-MM"
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1; // 0-based
  const monthName = MONTH_NAMES[monthIdx];

  // Determine previous month
  const prevDate = new Date(year, monthIdx - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  // Check if this is the client's first month
  const isFirstMonth = month <= client.start_month;

  // Pull GHL data for current month
  const puller = createPuller();
  const currentRange = {
    from: new Date(year, monthIdx, 1).toISOString(),
    to: new Date(year, monthIdx + 1, 0).toISOString(),
  };
  const currentRaw = await puller.pullAll(client.location_id, currentRange);
  const currentData = toMonthlyAggregate(currentRaw, client.id, month);

  // Pull previous month data if not first month
  let previousData: ReportMonthData | null = null;
  if (!isFirstMonth) {
    const prevRange = {
      from: new Date(prevDate.getFullYear(), prevDate.getMonth(), 1).toISOString(),
      to: new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).toISOString(),
    };
    const prevRaw = await puller.pullAll(client.location_id, prevRange);
    previousData = toMonthlyAggregate(prevRaw, client.id, prevMonth);
  }

  // Build narrative input
  const narrativeInput: NarrativeInput = {
    client: {
      business_name: client.business_name,
      niche: client.niche,
      contact_name: client.contact_name,
    },
    period: {
      month: monthName,
      year,
      label: `${monthName} ${year}`,
    },
    current_month: currentData,
    previous_month: previousData,
    is_first_month: isFirstMonth,
  };

  // Generate AI narrative
  const narrative = await generateNarrative(narrativeInput);

  // Save report record (no PDF yet — operator edits first)
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
```

- [ ] **Step 3: Create build-pdf API route**

```typescript
// src/app/api/reports/build-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { buildReportPdf, buildReportFilename } from "@/lib/pdf-builder";
import { getReportById, updateReportBlob, updateReportNarrative } from "@/lib/db/queries";
import type { NarrativeOutput } from "@/lib/narrative-writer/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { report_id, narrative } = body as {
    report_id: string;
    narrative: NarrativeOutput;
  };

  if (!report_id || !narrative) {
    return NextResponse.json({ error: "report_id and narrative required" }, { status: 400 });
  }

  const report = await getReportById(report_id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const rawData = JSON.parse(report.raw_data_json!);

  // Build PDF
  const pdfBuffer = await buildReportPdf({
    narrative,
    currentMonth: rawData.current_month,
    previousMonth: rawData.previous_month,
    businessName: report.business_name,
    periodLabel: rawData.period_label,
    isFirstMonth: rawData.is_first_month,
  });

  const filename = buildReportFilename(report.business_name, rawData.period_label);

  // Upload to Vercel Blob
  const blob = await put(filename, pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
  });

  // Update DB
  await updateReportBlob(report_id, blob.url);
  await updateReportNarrative(report_id, JSON.stringify(narrative));

  return NextResponse.json({
    id: report_id,
    blob_url: blob.url,
    filename,
  });
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/vo360-client-reports
git add src/app/api/
git commit -m "feat: add API routes for clients, report generation, and PDF building"
```

---

## Task 10: API Routes — Report Details, Preview, Download, Send, History, Regenerate

**Files:**
- Create: `src/app/api/reports/[id]/route.ts`
- Create: `src/app/api/reports/[id]/preview/route.ts`
- Create: `src/app/api/reports/[id]/download/route.ts`
- Create: `src/app/api/reports/[id]/send/route.ts`
- Create: `src/app/api/reports/[id]/regenerate/route.ts`
- Create: `src/app/api/reports/history/route.ts`

- [ ] **Step 1: Report metadata route**

```typescript
// src/app/api/reports/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getReportById } from "@/lib/db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await getReportById(id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json(report);
}
```

- [ ] **Step 2: Preview route (redirect to blob)**

```typescript
// src/app/api/reports/[id]/preview/route.ts
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
```

- [ ] **Step 3: Download route**

```typescript
// src/app/api/reports/[id]/download/route.ts
import { NextRequest, NextResponse } from "next/server";
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

  // Fetch PDF from blob and stream as download
  const pdfRes = await fetch(report.blob_url);
  const pdfBuffer = await pdfRes.arrayBuffer();

  const rawData = report.raw_data_json ? JSON.parse(report.raw_data_json) : {};
  const filename = buildReportFilename(report.business_name, rawData.period_label ?? report.report_month);

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 4: Send route**

```typescript
// src/app/api/reports/[id]/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getReportById, updateReportSent } from "@/lib/db/queries";
import { sendReportEmail } from "@/lib/email-sender";
import { buildReportFilename } from "@/lib/pdf-builder";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { email, subject, message } = body as {
    email: string;
    subject: string;
    message: string;
  };

  if (!email || !subject || !message) {
    return NextResponse.json({ error: "email, subject, and message required" }, { status: 400 });
  }

  const report = await getReportById(id);
  if (!report?.blob_url) {
    return NextResponse.json({ error: "PDF not built yet" }, { status: 404 });
  }

  // Download PDF from blob
  const pdfRes = await fetch(report.blob_url);
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

  const rawData = report.raw_data_json ? JSON.parse(report.raw_data_json) : {};
  const filename = buildReportFilename(report.business_name, rawData.period_label ?? report.report_month);

  // Send email
  await sendReportEmail({
    to: email,
    subject,
    message,
    pdfBuffer,
    pdfFilename: filename,
  });

  // Update sent status
  await updateReportSent(id, email);

  return NextResponse.json({ sent: true });
}
```

- [ ] **Step 5: Regenerate route**

```typescript
// src/app/api/reports/[id]/regenerate/route.ts
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
    period: {
      month: monthName,
      year,
      label: `${monthName} ${year}`,
    },
    current_month: rawData.current_month,
    previous_month: rawData.previous_month,
    is_first_month: rawData.is_first_month,
  };

  const narrative = await generateNarrative(narrativeInput);

  return NextResponse.json({ narrative });
}
```

- [ ] **Step 6: History route**

```typescript
// src/app/api/reports/history/route.ts
import { NextResponse } from "next/server";
import { listReports } from "@/lib/db/queries";

export async function GET() {
  const reports = await listReports();
  return NextResponse.json(reports);
}
```

- [ ] **Step 7: Commit**

```bash
cd ~/vo360-client-reports
git add src/app/api/reports/
git commit -m "feat: add API routes for report details, preview, download, send, regenerate, and history"
```

---

## Task 11: Frontend — Generate Page

**Files:**
- Create: `src/components/client-selector.tsx`
- Create: `src/components/month-picker.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create ClientSelector component**

```typescript
// src/components/client-selector.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Client {
  id: string;
  business_name: string;
  niche: string;
  contact_name: string;
  months_active: number;
  start_month: string;
}

interface Props {
  onSelect: (client: Client | null) => void;
}

export function ClientSelector({ onSelect }: Props) {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients);
  }, []);

  return (
    <Select
      onValueChange={(val) => {
        const client = clients.find((c) => c.id === val) ?? null;
        onSelect(client);
      }}
    >
      <SelectTrigger className="w-full glass-card border-white/10 text-white">
        <SelectValue placeholder="Select a client..." />
      </SelectTrigger>
      <SelectContent>
        {clients.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.business_name} — {c.niche}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Create MonthPicker component**

```typescript
// src/components/month-picker.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  startMonth: string; // "YYYY-MM"
  onSelect: (month: string) => void; // returns "YYYY-MM"
}

export function MonthPicker({ startMonth, onSelect }: Props) {
  // Generate months from start_month to current month
  const now = new Date();
  const [startY, startM] = startMonth.split("-").map(Number);
  const months: { value: string; label: string }[] = [];

  let y = startY;
  let m = startM;
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    const val = `${y}-${String(m).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[m - 1]} ${y}`;
    months.push({ value: val, label });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return (
    <Select onValueChange={onSelect}>
      <SelectTrigger className="w-full glass-card border-white/10 text-white">
        <SelectValue placeholder="Select month..." />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 3: Build the Generate page**

```typescript
// src/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientSelector } from "@/components/client-selector";
import { MonthPicker } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Client {
  id: string;
  business_name: string;
  niche: string;
  contact_name: string;
  months_active: number;
  start_month: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [month, setMonth] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleGenerate = async () => {
    if (!client || !month) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id, month }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      router.push(`/report/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Generate Client Report</h1>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Select Client</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientSelector onSelect={setClient} />
        </CardContent>
      </Card>

      {client && (
        <>
          <Card className="glass-card border-white/10">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Business</span>
                  <p className="text-white font-medium">{client.business_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Niche</span>
                  <p className="text-white font-medium capitalize">{client.niche}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Contact</span>
                  <p className="text-white font-medium">{client.contact_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Select Month</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthPicker startMonth={client.start_month} onSelect={setMonth} />
            </CardContent>
          </Card>
        </>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <Button
        onClick={handleGenerate}
        disabled={!client || !month || loading}
        className="w-full bg-vo360-orange hover:bg-vo360-orange/90 text-white font-bold py-6 text-lg"
      >
        {loading ? "Generating Report..." : "Generate Report"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Verify the generate page loads**

```bash
cd ~/vo360-client-reports
npm run dev
```

Open `http://localhost:3005`. Verify: client dropdown populates with 5 mock clients, selecting a client shows info card and month picker. Do NOT click Generate yet (needs ANTHROPIC_API_KEY).

- [ ] **Step 5: Commit**

```bash
cd ~/vo360-client-reports
git add src/app/page.tsx src/components/client-selector.tsx src/components/month-picker.tsx
git commit -m "feat: add Generate page with client selector and month picker"
```

---

## Task 12: Frontend — Edit & Preview Page

**Files:**
- Create: `src/components/narrative-editor.tsx`
- Create: `src/components/pdf-preview.tsx`
- Create: `src/components/send-modal.tsx`
- Create: `src/app/report/[id]/page.tsx`

- [ ] **Step 1: Create NarrativeEditor component**

```typescript
// src/components/narrative-editor.tsx
"use client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { NarrativeOutput } from "@/lib/narrative-writer/types";

const SECTION_LABELS: Record<string, string> = {
  leads: "Lead Generation",
  appointments: "Appointments",
  pipeline: "Sales Pipeline",
  conversations: "Conversations",
  reviews: "Reviews & Reputation",
};

interface Props {
  narrative: NarrativeOutput;
  onChange: (updated: NarrativeOutput) => void;
  onRegenerate: () => void;
  onBuildPdf: () => void;
  regenerating: boolean;
  building: boolean;
}

export function NarrativeEditor({
  narrative,
  onChange,
  onRegenerate,
  onBuildPdf,
  regenerating,
  building,
}: Props) {
  const updateSection = (
    key: keyof NarrativeOutput["sections"],
    field: "headline" | "narrative" | "highlight_metric",
    value: string
  ) => {
    onChange({
      ...narrative,
      sections: {
        ...narrative.sections,
        [key]: { ...narrative.sections[key], [field]: value },
      },
    });
  };

  const updateRecommendation = (index: number, value: string) => {
    const recs = [...narrative.recommendations];
    recs[index] = value;
    onChange({ ...narrative, recommendations: recs });
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div>
        <Label className="text-white text-sm font-medium">Executive Summary</Label>
        <Textarea
          value={narrative.executive_summary}
          onChange={(e) => onChange({ ...narrative, executive_summary: e.target.value })}
          className="mt-1 glass-card border-white/10 text-white min-h-[100px]"
        />
      </div>

      {/* Sections */}
      {(Object.keys(SECTION_LABELS) as Array<keyof NarrativeOutput["sections"]>).map((key) => (
        <div key={key} className="space-y-2 border-t border-white/10 pt-4">
          <Label className="text-vo360-orange text-sm font-medium">
            {SECTION_LABELS[key]}
          </Label>
          <Input
            value={narrative.sections[key].headline}
            onChange={(e) => updateSection(key, "headline", e.target.value)}
            placeholder="Headline"
            className="glass-card border-white/10 text-white"
          />
          <Textarea
            value={narrative.sections[key].narrative}
            onChange={(e) => updateSection(key, "narrative", e.target.value)}
            placeholder="Narrative"
            className="glass-card border-white/10 text-white min-h-[80px]"
          />
          <Input
            value={narrative.sections[key].highlight_metric}
            onChange={(e) => updateSection(key, "highlight_metric", e.target.value)}
            placeholder="Highlight metric"
            className="glass-card border-white/10 text-white"
          />
        </div>
      ))}

      {/* Recommendations */}
      <div className="border-t border-white/10 pt-4">
        <Label className="text-white text-sm font-medium">Recommendations</Label>
        {narrative.recommendations.map((rec, i) => (
          <Textarea
            key={i}
            value={rec}
            onChange={(e) => updateRecommendation(i, e.target.value)}
            className="mt-2 glass-card border-white/10 text-white min-h-[60px]"
          />
        ))}
      </div>

      {/* Closing */}
      <div className="border-t border-white/10 pt-4">
        <Label className="text-white text-sm font-medium">Closing Message</Label>
        <Textarea
          value={narrative.closing_message}
          onChange={(e) => onChange({ ...narrative, closing_message: e.target.value })}
          className="mt-1 glass-card border-white/10 text-white min-h-[80px]"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={onRegenerate}
          disabled={regenerating || building}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
        >
          {regenerating ? "Regenerating..." : "Regenerate"}
        </Button>
        <Button
          onClick={onBuildPdf}
          disabled={regenerating || building}
          className="bg-vo360-orange hover:bg-vo360-orange/90 text-white font-bold flex-1"
        >
          {building ? "Building PDF..." : "Build PDF"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PdfPreview component**

```typescript
// src/components/pdf-preview.tsx
"use client";

interface Props {
  blobUrl: string | null;
}

export function PdfPreview({ blobUrl }: Props) {
  if (!blobUrl) {
    return (
      <div className="glass-card border-white/10 rounded-lg h-[600px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Edit the narrative, then click Build PDF to preview
        </p>
      </div>
    );
  }

  return (
    <iframe
      src={blobUrl}
      className="w-full h-[600px] rounded-lg border border-white/10"
      title="Report PDF Preview"
    />
  );
}
```

- [ ] **Step 3: Create SendModal component**

```typescript
// src/components/send-modal.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  reportId: string;
  defaultEmail: string;
  defaultSubject: string;
  defaultMessage: string;
  onSent: () => void;
}

export function SendModal({
  open,
  onClose,
  reportId,
  defaultEmail,
  defaultSubject,
  defaultMessage,
  onSent,
}: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/${reportId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Send failed");
      }
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Send Report via Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-card border-white/10 text-white"
            />
          </div>
          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="glass-card border-white/10 text-white"
            />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="glass-card border-white/10 text-white min-h-[100px]"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-vo360-orange hover:bg-vo360-orange/90 text-white font-bold"
          >
            {sending ? "Sending..." : "Send Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Build the Edit & Preview page**

```typescript
// src/app/report/[id]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { NarrativeEditor } from "@/components/narrative-editor";
import { PdfPreview } from "@/components/pdf-preview";
import { SendModal } from "@/components/send-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NarrativeOutput } from "@/lib/narrative-writer/types";

interface ReportData {
  id: string;
  business_name: string;
  client_name: string;
  report_month: string;
  blob_url: string | null;
  narrative_json: string | null;
  raw_data_json: string | null;
  sent: number;
  sent_at: string | null;
  sent_to: string | null;
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [narrative, setNarrative] = useState<NarrativeOutput | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then((data: ReportData) => {
        setReport(data);
        setBlobUrl(data.blob_url);
        setSent(data.sent === 1);
        if (data.narrative_json) {
          setNarrative(JSON.parse(data.narrative_json));
        }
      });
  }, [id]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/reports/${id}/regenerate`, { method: "POST" });
      const data = await res.json();
      setNarrative(data.narrative);
      setBlobUrl(null); // clear old PDF since narrative changed
    } finally {
      setRegenerating(false);
    }
  };

  const handleBuildPdf = async () => {
    if (!narrative) return;
    setBuilding(true);
    try {
      const res = await fetch("/api/reports/build-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: id, narrative }),
      });
      const data = await res.json();
      setBlobUrl(data.blob_url);
    } finally {
      setBuilding(false);
    }
  };

  if (!report || !narrative) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading report...</p>
      </div>
    );
  }

  const rawData = report.raw_data_json ? JSON.parse(report.raw_data_json) : {};

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{report.business_name}</h1>
          <p className="text-muted-foreground">
            {rawData.period_label ?? report.report_month}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sent ? (
            <Badge className="bg-green-600 text-white">
              Sent {report.sent_at ? new Date(report.sent_at).toLocaleDateString() : ""}
            </Badge>
          ) : blobUrl ? (
            <>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                asChild
              >
                <a href={`/api/reports/${id}/download`}>Download PDF</a>
              </Button>
              <Button
                onClick={() => setShowSend(true)}
                className="bg-vo360-orange hover:bg-vo360-orange/90 text-white"
              >
                Send via Email
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <NarrativeEditor
            narrative={narrative}
            onChange={setNarrative}
            onRegenerate={handleRegenerate}
            onBuildPdf={handleBuildPdf}
            regenerating={regenerating}
            building={building}
          />
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <PdfPreview blobUrl={blobUrl} />
        </div>
      </div>

      {/* Send Modal */}
      <SendModal
        open={showSend}
        onClose={() => setShowSend(false)}
        reportId={id}
        defaultEmail={""} 
        defaultSubject={`Your ${rawData.period_label ?? report.report_month} Growth Report — ${report.business_name}`}
        defaultMessage={`Hi ${report.client_name},\n\nHere's your monthly growth report for ${rawData.period_label ?? report.report_month}. Great progress!\n\nBest,\nVO360 Team`}
        onSent={() => setSent(true)}
      />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd ~/vo360-client-reports
git add src/components/narrative-editor.tsx src/components/pdf-preview.tsx src/components/send-modal.tsx src/app/report/
git commit -m "feat: add Edit & Preview page with narrative editor, PDF preview, and send modal"
```

---

## Task 13: Frontend — History Page

**Files:**
- Create: `src/components/history-table.tsx`
- Create: `src/app/history/page.tsx`

- [ ] **Step 1: Create HistoryTable component**

```typescript
// src/components/history-table.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Report {
  id: string;
  business_name: string;
  report_month: string;
  blob_url: string | null;
  sent: number;
  sent_at: string | null;
  created_at: string;
}

export function HistoryTable() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterSent, setFilterSent] = useState<string>("all");

  useEffect(() => {
    fetch("/api/reports/history")
      .then((r) => r.json())
      .then(setReports);
  }, []);

  const uniqueClients = [...new Set(reports.map((r) => r.business_name))];

  const filtered = reports.filter((r) => {
    if (filterClient !== "all" && r.business_name !== filterClient) return false;
    if (filterSent === "sent" && r.sent !== 1) return false;
    if (filterSent === "unsent" && r.sent !== 0) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[200px] glass-card border-white/10 text-white">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {uniqueClients.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterSent} onValueChange={setFilterSent}>
          <SelectTrigger className="w-[150px] glass-card border-white/10 text-white">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="unsent">Not sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card border-white/10 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-white">Business</TableHead>
              <TableHead className="text-white">Month</TableHead>
              <TableHead className="text-white">Generated</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No reports yet
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="border-white/10">
                  <TableCell className="text-white font-medium">
                    {r.business_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.report_month}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {r.sent ? (
                      <Badge className="bg-green-600 text-white">Sent</Badge>
                    ) : r.blob_url ? (
                      <Badge variant="outline" className="border-vo360-orange text-vo360-orange">
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-white/20 text-muted-foreground">
                        Draft
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link
                        href={`/report/${r.id}`}
                        className="text-vo360-orange hover:underline text-sm"
                      >
                        View
                      </Link>
                      {r.blob_url && (
                        <a
                          href={`/api/reports/${r.id}/download`}
                          className="text-muted-foreground hover:text-white text-sm"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create History page**

```typescript
// src/app/history/page.tsx
import { HistoryTable } from "@/components/history-table";

export default function HistoryPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Report History</h1>
      <HistoryTable />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/vo360-client-reports
git add src/components/history-table.tsx src/app/history/
git commit -m "feat: add History page with filterable report table"
```

---

## Task 14: End-to-End Verification

- [ ] **Step 1: Ensure ANTHROPIC_API_KEY is set in .env.local**

The user needs to add their Anthropic API key to `.env.local`.

- [ ] **Step 2: Start dev server and test full flow**

```bash
cd ~/vo360-client-reports
npm run dev
```

Test the following in browser at `http://localhost:3005`:

1. **Generate page** — select Acme Plumbing, select March 2026, click Generate. Wait ~10-15s for AI.
2. **Edit page** — verify narrative loads with all sections. Edit one headline. Click Build PDF. Verify PDF preview appears.
3. **Download** — click Download, verify PDF opens with correct branding.
4. **Regenerate** — click Regenerate, verify new narrative loads and PDF preview clears.
5. **History** — navigate to History, verify the report appears with correct status.
6. **Repeat** for Clean Sweep Services (first month — no comparison data) and Bright Electric (declining metrics).

- [ ] **Step 3: Fix any issues found during testing**

Address any layout, API, or data issues discovered during the E2E test.

- [ ] **Step 4: Final commit**

```bash
cd ~/vo360-client-reports
git add -A
git commit -m "fix: address issues found during end-to-end testing"
```

---

## Task 15: Deploy to Vercel

- [ ] **Step 1: Create Turso database**

```bash
turso db create vo360-client-reports
turso db tokens create vo360-client-reports
```

Save the URL and token.

- [ ] **Step 2: Link and deploy to Vercel**

```bash
cd ~/vo360-client-reports
vercel link
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add ANTHROPIC_API_KEY
vercel env add BLOB_READ_WRITE_TOKEN
vercel env add GHL_MOCK_MODE
vercel env add SMTP_HOST
vercel env add SMTP_PORT
vercel env add SMTP_USER
vercel env add SMTP_PASS
vercel env add SENDER_NAME
vercel env add SENDER_EMAIL
```

- [ ] **Step 3: Push to GitHub and deploy**

```bash
cd ~/vo360-client-reports
gh repo create vo360-client-reports --public --source=. --push
vercel --prod
```

- [ ] **Step 4: Verify production deployment**

Open the Vercel URL. Test generate → edit → build PDF → download flow with one mock client.
