# APP_DIRECTORY.md

## Genesis Software Ecosystem — App Directory

**Last updated:** February 2026  
**Purpose:** Quick reference for every app in the ecosystem. Identifiers, URLs, hosting, and current status.

---

## Apps

| ID | Full Name | URL | Hosting | Status |
|----|-----------|-----|---------|--------|
| `pipeline` | Genesis HVAC Estimate Pipeline | `https://app.genesishvacr.com` | Vercel | 🟢 Live |
| `inspect` | Genesis Maintenance Inspection Report App | `https://genesis-inspect.vercel.app` | Vercel | 🟢 Live |
| `inventory` | Genesis HVAC Inventory Tracker | `https://inventory-tracker-genesis.netlify.app` | Netlify | 🟢 Live |
| `os` | Genesis OS Business Operating System | TBD | TBD | 🔴 Not built |
| `guru` | HVAC Guru Diagnostic Assistant | TBD | TBD | 🔴 Not built |
| `intel` | Genesis Intel Agent | TBD | TBD | 🔴 Not built |
| `dashboard` | Genesis Dashboard | `https://dashboard.genesishvacr.com` | Vercel | 🔴 Not built |
| `agent` | Genesis AI Command Layer | Mac Mini (local) | PM2 on Mac Mini | 🔴 Not built |

---

## Shared Tech Stack

All Next.js apps follow this stack unless noted otherwise:

- **Framework:** Next.js (App Router)
- **Database:** Supabase (PostgreSQL) — each app has its own project
- **Auth:** Supabase Auth — per-app, email is the cross-app identifier
- **Hosting:** Vercel (primary) or Netlify
- **Styling:** Tailwind CSS
- **Language:** TypeScript

**Command Layer exception:** Python (Claude Agent SDK), SQLite (local state), PM2 (process manager)

---

## Supabase Projects

Each app has its own Supabase project. UUIDs are internal and meaningless across apps (Conventions Section 1).

| App | Supabase Project | Notes |
|-----|-----------------|-------|
| Pipeline | Per-app project | Primary data: estimates, leads, sequences, commissions |
| Inspection | Per-app project | Primary data: inspections, findings, checklists |
| Inventory | Per-app project | Primary data: items, vehicles, stock levels |
| Dashboard | TBD | Will share QBO OAuth client with Command Layer |
| Genesis OS | TBD | Processes, procedures, SOPs |
| HVAC Guru | TBD | Equipment data, diagnostic patterns |
| Intel | TBD | Market data, competitive intelligence |

---

## Domain Map

| Domain | Points To |
|--------|-----------|
| `app.genesishvacr.com` | Pipeline (Vercel) |
| `genesis-inspect.vercel.app` | Inspection (Vercel) |
| `inventory-tracker-genesis.netlify.app` | Inventory (Netlify) |
| `dashboard.genesishvacr.com` | Dashboard (Vercel) — reserved |
| `genesishvacr.com` | Company website / future Genesis OS |

---

## Cross-App Communication

All app-to-app communication uses:
- **Auth:** `Authorization: Bearer {GENESIS_INTERNAL_API_KEY}`
- **Envelope:** Standard `data`/`error`/`meta` response format
- **Endpoints:** `/api/v1/` prefix for all cross-app routes
- **Field names:** Shared types from `SHARED_TYPES.ts` / Conventions Section 4

See `ENDPOINT_REGISTRY.md` for the full list of callable endpoints.  
See `WEBHOOK_CONTRACTS.md` for event payload formats.
