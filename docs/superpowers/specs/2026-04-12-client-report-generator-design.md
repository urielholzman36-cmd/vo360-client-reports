# VO360 Client Report Generator — Design Spec

**Date:** 2026-04-12
**Status:** Approved
**Track:** 1, Project 5

---

## 1. Project Overview

Monthly PDF reports per client that highlight wins and growth. Each report pulls the client's GHL activity data for the past month, passes it through an AI narrative engine that writes in a positive motivating tone, and outputs a branded PDF with charts, comparisons, and recommendations. The operator reviews and edits the narrative before the PDF is built, then sends it to the client.

### V1 Scope

- Monthly data pull from GHL via adapted ghl-data-puller (from Health Dashboard)
- AI narrative engine (Anthropic SDK / Claude Sonnet) that transforms raw data into positive, client-friendly summaries
- Editable narrative step — operator reviews and edits AI output before PDF generation
- Branded PDF generation with charts and month-over-month comparisons
- React UI for selecting a client, generating narrative, editing, building PDF, previewing, downloading, and emailing
- Report history log in Turso — track every report generated with download links
- Mock data mode for testing before real clients exist

### NOT in V1

- Automated monthly scheduling (cron-based auto-generation and auto-send)
- Client-facing portal for viewing reports online
- Silver/Gold/Platinum competitive scoring (depends on Manus AI)
- Multi-month trend reports (quarterly/annual)
- White-labeled reports (client's own branding)

---

## 2. Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Components) |
| Language | TypeScript |
| AI Engine | Anthropic SDK (Claude Sonnet) |
| CRM API | GoHighLevel REST API v2 (via ghl-data-puller) |
| PDF Generation | PDFKit (server-side) |
| Charts | SVG-based charts in PDFKit (fallback from chartjs-node-canvas if deployment issues) |
| Database | Turso (libsql) |
| PDF Storage | Vercel Blob |
| Email | Nodemailer (SMTP / Gmail App Password) |
| Styling | Tailwind CSS 4 + shadcn/ui |

### Key Design Decisions

- **Next.js 16 + TypeScript** — consistent with Health Dashboard and Proposal Generator. Enables real code sharing.
- **Turso** instead of plain SQLite — consistent with other VO360 projects, works on Vercel.
- **Vercel Blob** for PDF storage — no local `/output/` directory, works in serverless.
- **Editable narrative** — operator can edit AI output before PDF is built. Regenerate gets a fresh AI pass.
- **SVG charts in PDFKit** — avoids native canvas dependency issues on Vercel. Falls back to chartjs-node-canvas locally if needed.
- **brand.ts + PDF utils copied from Proposal Generator** — same framework now, direct reuse.
- **ghl-data-puller adapted from Health Dashboard** — types and mock fixtures reused, extended with monthly aggregate method.
- **Email-sender built fresh** — Proposal Generator has no email module. This becomes the canonical implementation for future projects.

### Shared Code from Existing Projects

| Source | What | Adaptation |
|--------|------|-----------|
| Health Dashboard | ghl-data-puller types, mock fixtures (5 JSON files) | Add `getMonthlyAggregate()` that sums daily fixture data into monthly totals |
| Health Dashboard | Client profiles (5 mock clients) | Same IDs and metadata |
| Proposal Generator | `brand.ts` (colors, fonts, logo) | Direct copy, no changes |
| Proposal Generator | `utils.ts` (drawHeaderBar, drawSectionTitle, drawFooter, resetBodyStyle) | Direct copy, extended for report-specific sections |

---

## 3. Updated Workflow (3-Step Generation)

### Step 1: Select Client + Month
- Operator picks a client from dropdown and selects a month
- Backend pulls GHL data for that month (current + previous for comparison)

### Step 2: AI Generates Narrative → Operator Edits
- AI returns structured narrative JSON (executive summary, section headlines/narratives, recommendations, closing)
- UI shows an **editable text view** with all sections
- Operator can:
  - Edit any text inline (headlines, narratives, recommendations, closing)
  - Hit **Regenerate** to get a fresh AI pass (discards edits)
- Operator clicks **Build PDF** when satisfied

### Step 3: PDF Preview → Download/Send
- PDF is generated with the finalized narrative + charts
- Stored in Vercel Blob
- UI shows PDF preview with Download and Send controls
- Send opens modal with pre-filled email, editable subject/body
- After send: success state, sent timestamp recorded

---

## 4. report-narrative-writer (Core Skill)

### Narrative Tone Rules

- Lead with wins. Always open with the best metric.
- Frame declines as opportunities. Never say "leads dropped." Say "There's room to grow lead volume — here's how."
- Use specific numbers. "You received 34 new leads this month, 12 more than last month."
- Celebrate milestones. First month? "Great foundation set." Hit a record? "Best month yet."
- End with actionable recommendations. 2-3 specific next steps.
- Keep it concise. Executive summary: 3-4 sentences. Section narratives: 2-3 sentences each. Total under 500 words.
- No jargon. "Pipeline movement" becomes "deals progressing toward close."

### AI Input

```json
{
  "client": {
    "business_name": "Smith Plumbing",
    "niche": "plumbing",
    "contact_name": "John Smith"
  },
  "period": {
    "month": "March",
    "year": 2026,
    "label": "March 2026"
  },
  "current_month": {
    "new_leads": 34,
    "total_contacts": 156,
    "appointments_booked": 12,
    "appointments_completed": 9,
    "appointments_no_show": 3,
    "pipeline_opportunities": 28,
    "pipeline_won": 8,
    "pipeline_lost": 3,
    "pipeline_open": 17,
    "conversations_total": 89,
    "conversations_avg_response_hours": 2.4,
    "review_requests_sent": 15,
    "new_reviews": 6,
    "avg_review_rating": 4.8
  },
  "previous_month": null
}
```

### AI Output

```json
{
  "executive_summary": "March was a strong month for Smith Plumbing...",
  "sections": {
    "leads": {
      "headline": "34 New Leads — Up 55% from February",
      "narrative": "Your lead pipeline is growing steadily...",
      "highlight_metric": "+12 leads vs last month"
    },
    "appointments": {
      "headline": "12 Appointments Booked, 9 Completed",
      "narrative": "Booking rate remains strong...",
      "highlight_metric": "75% show rate"
    },
    "pipeline": {
      "headline": "8 Deals Won This Month",
      "narrative": "Your sales pipeline is converting...",
      "highlight_metric": "$X in closed revenue"
    },
    "conversations": {
      "headline": "2.4-Hour Average Response Time",
      "narrative": "Fast responses build trust...",
      "highlight_metric": "89 total conversations"
    },
    "reviews": {
      "headline": "6 New Reviews at 4.8 Stars",
      "narrative": "Your reputation continues to grow...",
      "highlight_metric": "15 review requests sent"
    }
  },
  "recommendations": [
    "Consider increasing your review request cadence...",
    "Your no-show rate of 25% suggests...",
    "With 17 open opportunities, a focused follow-up push..."
  ],
  "closing_message": "Great progress this month, John! ..."
}
```

### System Prompt

Instructs Claude to:
- Write as a business growth consultant delivering a monthly update to the business owner
- Use the client's first name and business name naturally
- Always reference specific numbers — never vague qualifiers
- When comparing to previous month: use percentage change AND absolute numbers
- When it's the first month: frame as "baseline established"
- Return ONLY valid JSON
- Recommendations must be specific and actionable

---

## 5. report-pdf-builder

### Brand Spec (Copied from Proposal Generator)

| Element | Value |
|---------|-------|
| Primary Navy | #1B2B6B |
| Accent Orange | #F47B20 |
| Accent Magenta | #C2185B |
| Accent Green | #27AE60 |
| Background Light | #F5F5F5 |
| Body Text | #555555 |
| Headings Font | Helvetica-Bold |
| Body Font | Helvetica |
| Logo | Embedded from `/public/logo.png` |
| Page Size | US Letter (8.5 x 11 in) |
| Margins | 0.75 inch (54pt) all sides |

### PDF Layout (3-4 Pages)

**Page 1: Cover + Executive Summary**
- Navy header bar with VO360 logo left, report date right (reuses `drawHeaderBar` from Proposal Generator)
- Title: "Monthly Growth Report" (navy, large). Client business name below (orange). Period below.
- Executive summary text (3-4 sentences)
- Highlight cards row: New Leads, Appointments, Deals Won, Avg Response Time (colored stat boxes with arrows for comparison)

**Page 2: Performance Details**
- Lead Generation: headline, narrative, bar chart (current vs previous month)
- Appointments: headline, narrative, donut chart (completed/no-show/cancelled)
- Pipeline: headline, narrative, horizontal bar chart (won/lost/open)

**Page 3: Engagement + Reviews**
- Conversations: headline, narrative, response time stat with trend arrow
- Reviews: headline, narrative, star rating display, review count
- Month-over-Month Summary Table: Metric | This Month | Last Month | Change

**Page 4: Recommendations + Close**
- Numbered recommendations (2-3 items)
- Closing message (warm, uses client's first name)
- Footer: vo360.net | hello@vo360.net | Your Intelligent Execution Partner

### Charts (SVG in PDFKit)

| Chart | Type | Colors |
|-------|------|--------|
| Leads by Week | Grouped Bar | Orange (current), Light gray (previous) |
| Appointments | Doughnut | Green / Red / Gray |
| Pipeline Status | Horizontal Bar | Green / Red / Orange |
| Response Time | Line | Navy line, Orange dots |

Charts rendered as SVG paths directly in PDFKit. If `chartjs-node-canvas` works cleanly on Vercel, use that instead for richer visuals.

### File Naming & Storage

```
Pattern: {BusinessName}_{MonthYear}_Report.pdf
Example: Smith_Plumbing_March_2026_Report.pdf
Storage: Vercel Blob (public URL returned for preview/download)
```

---

## 6. Database Schema (Turso)

```sql
CREATE TABLE reports (
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

CREATE INDEX idx_reports_client ON reports(client_id, report_month);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
```

- `blob_url` replaces `report_path` — stores Vercel Blob URL instead of local path
- `narrative_json` stored so reports can be regenerated with layout changes without re-running AI
- `raw_data_json` stored for auditing and debugging

---

## 7. API Routes (Next.js App Router)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/clients` | List active clients (from config or mock) |
| POST | `/api/reports/generate` | Pull GHL data + run AI narrative. Returns narrative JSON for editing. |
| POST | `/api/reports/build-pdf` | Takes finalized narrative + data, builds PDF, stores in Blob. Returns report ID + blob URL. |
| GET | `/api/reports/[id]/preview` | Redirect to Blob URL for PDF preview |
| GET | `/api/reports/[id]/download` | Stream PDF with Content-Disposition attachment header |
| POST | `/api/reports/[id]/send` | Email report PDF to client |
| GET | `/api/reports/history` | List all past reports with sent status |
| GET | `/api/reports/[id]` | Get report metadata |
| POST | `/api/reports/[id]/regenerate` | Re-run AI narrative for existing report data |

### Key Change from Original Spec

The original spec had a single `POST /generate` that did everything. Now it's split:
- `POST /generate` — pulls data + runs AI, returns editable narrative
- `POST /build-pdf` — takes the edited narrative, builds PDF, stores it

This supports the edit-before-build workflow.

---

## 8. Frontend UI

Three views. VO360 dark navy + glassmorphic design (consistent with Health Dashboard).

### Generate Page (`/`)
- VO360 logo header
- Client selector dropdown (business name + niche)
- Month picker
- Client summary card (when selected): business name, niche, past report count
- Generate button → spinner (~10-15s)
- On success → navigates to Edit & Preview page

### Edit & Preview Page (`/report/[id]`)
- **Left panel: Editable Narrative**
  - Executive summary (textarea)
  - Each section: editable headline + narrative + highlight metric
  - Recommendations (editable list)
  - Closing message (textarea)
  - **Regenerate** button (fresh AI pass, replaces all edits)
  - **Build PDF** button (locks narrative, generates PDF)
- **Right panel: PDF Preview** (appears after Build PDF)
  - Full PDF in iframe/embed
  - Download button
  - Send button → modal with email, subject, message fields
  - Sent badge + timestamp after successful send

### History Page (`/history`)
- Table: Business Name, Month, Generated Date, Sent Status (badge), Download link
- Filterable by client and sent status
- Sorted by date descending

---

## 9. Mock Data

### 5 Client Profiles (Same as Health Dashboard)

| Client | Niche | Months Active | Scenario |
|--------|-------|--------------|----------|
| Acme Plumbing | plumbing | 3 | Healthy, steady growth |
| Bright Electric | electrical | 2 | Declining, tests negative-framing tone |
| Clean Sweep Services | cleaning | 1 | First month, no comparison data |
| Delta HVAC | hvac | 4 | Inconsistent, varied comparisons |
| Eagle Roofing | roofing | 2 | Record month, milestone celebration |

### Mock Data Adapter

The Health Dashboard fixtures use `daysAgo` arrays. The report generator needs monthly aggregates. A `getMonthlyAggregate(clientId, month)` function converts:
- `contactsDaysAgo` array length → `new_leads`
- `appointmentStartDaysAgo` length → `appointments_booked`
- `opportunityStageMovesDaysAgo` → `pipeline_won/lost/open`
- `avgResponseMinutes` → `conversations_avg_response_hours`
- `reviewRequestsSent` → direct mapping

Additional mock fields not in fixtures (appointments_completed, appointments_no_show, pipeline values, conversations_total, new_reviews, avg_review_rating) are generated with realistic random values within the ranges defined in the spec.

---

## 10. Email Sender

New Nodemailer module built for this project:
- SMTP connection (Gmail App Password)
- Attaches PDF from Vercel Blob URL (downloaded to buffer, attached)
- Configurable subject and message body
- Records sent status + timestamp in database

### Environment Variables

```
ANTHROPIC_API_KEY=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
BLOB_READ_WRITE_TOKEN=
GHL_API_KEY=                    # Only when GHL_MOCK_MODE=false
GHL_MOCK_MODE=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SENDER_NAME=VO360
SENDER_EMAIL=hello@vo360.net
```

---

## 11. Testing Scenarios

| Test | Input | Expected |
|------|-------|----------|
| Growth month | Acme Plumbing, March 2026 | Narrative leads with growth. Comparison charts show improvement. |
| Declining month | Bright Electric, March 2026 | Decline framed as opportunity. No negative language. |
| First month | Clean Sweep, March 2026 | Baseline language. No comparison charts. |
| Record month | Eagle Roofing, March 2026 | Milestone celebration. "Best month yet" language. |
| Inconsistent | Delta HVAC, March 2026 | Highlights wins first, frames weak areas constructively. |
| Narrative edit | Any client, edit text before PDF | Edited text appears in final PDF, not AI original. |
| Regenerate | Any client, hit Regenerate | Fresh AI output replaces previous. |
| PDF branding | Any client | VO360 logo, navy header, orange accents, correct fonts. |
| Email send | Any client with valid email | Email received with PDF attachment. |
| History | After generating 5 reports | All listed, correct badges, working downloads. |

---

## 12. Port Assignment

Dev server runs on port 3005 to avoid conflicts with:
- 3000: reserved
- 3001: Health Dashboard
- 3002: Knowledge Base
- 3003: GHL Builder
- 3004: Proposal Generator

---

## 13. V2 Enhancements (After V1 Stable)

- Automated monthly scheduling — cron generates reports on the 1st, queues for review before sending
- Client-facing portal — read-only URL per report
- Silver/Gold/Platinum competitive scoring (requires Manus AI)
- Quarterly summary reports — 3-month rollup with trend analysis
- White-labeled reports — client's own branding option
- Report open tracking — know when client views the PDF
- Batch generation — all clients in one click
- Health Dashboard integration — link from health card to latest report
- Narrative tone customization per client
