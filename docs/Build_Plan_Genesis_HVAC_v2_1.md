# GENESIS PIPELINE — Build Plan

**Estimate Pipeline, Proposal Engine & Sales Automation**

**Version 4.0 — February 2026**

Step-by-step build plan from setup to complete vision. Each phase should be fully working before starting the next.

**IMPORTANT:** Complete Phase 4 E2E testing and Phase 5 team launch before starting any v4.0 feature work (Phase 6+).

---

## PHASE 0: Pre-Build Setup ✅ COMPLETE

Accounts created, API keys gathered, development environment configured.

- Supabase project created (free tier). Project URL, anon key, service role key recorded.
- Vercel account created via GitHub. Now on Pro plan.
- Resend account created. Domain `genesishvacr.com` authenticated (SPF/DKIM/DMARC).
- Twilio account created. Number 425-261-9095 hosted for SMS. Voice stays on Comcast VoiceEdge.
- Housecall Pro API key obtained. Bearer token auth.
- GitHub repo created: `https://github.com/WLCoyote/genesis-pipeline`. Auto-deploys to Vercel on push.
- Next.js project initialized. TypeScript, Tailwind CSS v4, App Router.
- `.env.local` configured with all keys. `.gitignore` verified — no secrets committed.

---

## PHASE 1: Database & Auth ✅ COMPLETE

Database schema, RLS policies, authentication, and default follow-up sequence.

**SQL migrations run (001–011):**
- 001–007: Core tables — users, customers, estimates, estimate_options, follow_up_sequences, follow_up_events, notifications, messages, campaigns, campaign_events, settings
- 008: `user_invites` table for invite-based team provisioning
- 009: `messages` table — added `phone_number` and `dismissed` columns for SMS inbox
- 010: `archived` status added to leads check constraint
- 011: `is_active` boolean added to `follow_up_sequences` for sequence pause/resume

**Auth:**
- Supabase Auth with Google Workspace SSO configured
- Invite-based provisioning: admin creates invite → user signs in with Google → auto-provisioned with correct role
- RLS enabled on every table. Admin full access, comfort pro scoped to assigned records, CSR scoped to leads/estimates

**Default follow-up sequence created** with 8-step cadence (Day 0 through Day 60).

---

## PHASE 2: Backend API Routes & Cron Jobs ✅ COMPLETE

All server-side logic — API routes, cron jobs, webhooks, integrations.

**API routes built:**
- Estimate CRUD: GET/DELETE `/api/estimates/[id]`, POST `/api/estimates/create`
- Estimate actions: `/api/estimates/[id]/status`, `/reassign`, `/snooze`, `/send-next`, `/skip-step`, `/execute-step`
- Lead CRUD: GET/POST `/api/leads`, PATCH/DELETE `/api/leads/[id]`, POST `/api/leads/[id]/move-to-hcp`
- Messaging: POST `/api/send-sms`, POST `/api/send-email`, GET/POST/PATCH `/api/inbox`
- Follow-up events: PATCH `/api/follow-up-events/[id]`
- Admin: POST `/api/admin/update-estimates`, GET/PUT `/api/admin/sequences`, GET/PATCH `/api/admin/settings`, GET/PATCH `/api/admin/users`, GET/POST/DELETE `/api/admin/invites`, GET `/api/admin/hcp-lead-sources`
- Import: POST `/api/import/csv`
- Inbound webhook: POST `/api/leads/inbound` (secured with `LEADS_WEBHOOK_SECRET`)

**Cron jobs configured in `vercel.json`:**
- `/api/cron/execute-sequences` — 7x daily (every 2 hours)
- `/api/cron/poll-hcp-status` — 3x daily
- `/api/cron/auto-decline` — 1x daily

**Webhooks:**
- Twilio inbound SMS: POST `/api/webhooks/twilio` with signature validation
- Resend email events: POST `/api/webhooks/resend` with signature validation

**HCP polling logic** in shared `lib/hcp-polling.ts`:
- Fetches newest-first (`sort_direction=desc`, `page_size=200`), filters by `created_at` in code
- Pre-fetches local estimate IDs for O(1) dedup. Max 5 pages. 30s timeouts.
- Sent detection: `option.status = "submitted for signoff"`
- Customer name: `customer.company` > `first_name + last_name` > "Unknown"
- Amounts in cents → divided by 100
- Sent date: `schedule.scheduled_start` → `created_at` fallback
- Full refresh on existing estimates every poll

**CSV import** with dedup on `estimate_number` using `ON CONFLICT`.

---

## PHASE 3: Frontend Dashboard ✅ COMPLETE

Complete dashboard UI with dark mode, all user-facing features.

**Built:**
- Pipeline dashboard — estimate list with counters, sortable/filterable, newest-to-oldest default
- Estimate detail — full sequence timeline (Sent/Skipped/Current/Upcoming/Paused/Not Reached), SMS conversation thread, engagement data, action buttons
- Send Now, Skip Step, Execute Skipped Step buttons
- Mark Won/Lost with option selection modal (checkboxes per option, HCP API sync)
- Snooze with required note and custom duration
- Sequence pause/resume toggle (yellow "follow-ups on hold" banner when paused)
- Leads tab — create, edit, archive/unarchive, Move to HCP, collapsible archived section
- SMS Inbox — unmatched threads by phone number, reply, convert to lead, dismiss
- Team management — invite by email/name/phone/role, edit roles, activate/deactivate
- Settings page — sequence editor, auto-decline days, HCP lead source sync
- Admin delete for estimates and leads with cascading cleanup
- Manual "Update Estimates" button for on-demand HCP polling
- Dark mode with system preference detection and localStorage persistence
- Notification bell with real-time Supabase Realtime subscriptions
- Privacy policy at `/privacy` and Terms & Conditions at `/terms` (Twilio A2P compliance)
- HCP pro link — estimate number clickable → `https://pro.housecallpro.com/app/estimates/{option_id}`
- Error display on SMS send components (ConversationThread, InboxThreads)

---

## PHASE 4: Deployment & E2E Testing — IN PROGRESS

**Completed:**
- Deployed to Vercel Pro (Step 4.1) ✅
- Custom domain setup pending (Step 4.2) — will do `app.genesishvacr.com` + `proposals.genesishvacr.com` before proposal flow goes live
- Resend webhook configured and live (Step 4.3) ✅
- Twilio webhook configured and live (Step 4.3b) ✅
- Twilio Messaging Service created (SID: `MGd102dd6d19268d0e867c30f9457caf2f`) ✅
- All 5 SMS routes switched to `messagingServiceSid` ✅
- Inbox POST route rewritten to call Twilio directly (Vercel can't self-fetch) ✅
- A2P 10DLC campaign resubmitted (first rejected for MESSAGE_FLOW — resubmitted Feb 25 with detailed verbal + web form opt-in) ✅

**Blocked:** A2P campaign carrier approval. Outbound SMS returns error 30034 until approved.

### Step 4.4: End-to-End Testing Checklist

Run through each scenario with real data after A2P approval:

1. **CSV Import:** Export 10 estimates from HCP. Import via dashboard. Verify customer and estimate records created correctly with proper assignments.

2. **Sequence Activation:** *(requires outbound SMS)* Confirm imported estimates entered follow-up sequences. Wait for (or manually trigger) the cron job. Verify Day 0 SMS sends to the correct phone number from 425-261-9095.

3. **Notification Flow:** Open a follow-up email on your phone. Check the dashboard — the notification bell should update showing the email was opened.

4. **Snooze:** Snooze an active estimate for 1 day with a note. Verify the sequence pauses. After the snooze expires, verify it resumes.

5. **Edit Before Send:** When a pending_review message appears, edit it before the 30-minute window expires. Verify the edited version sends.

6. **Call Task:** When a call task step is due, verify the comfort pro receives a notification. Mark it complete and verify the event logs.

7. **HCP Status Sync:** Approve an estimate in HCP. Manually trigger the poll cron. Verify the estimate moves to "won" in your system and the sequence stops.

8. **Auto-Decline:** Create a test estimate with `auto_decline_date` in the past. Run the auto-decline cron. Verify HCP receives the decline POST and local status updates.

9. **Inbound SMS:** *(requires outbound SMS working)* Send a text from your personal phone to 425-261-9095. Verify: message appears in the messages table, notification fires for the assigned comfort pro, and the conversation thread updates in real-time on the estimate detail page.

10. **SMS Reply from App:** *(requires outbound SMS)* Open an estimate detail view, type a reply in the conversation thread, and send. Verify: message sends to the customer's phone, appears in the thread, and is logged in the messages table with the correct sent_by user.

11. **Role Access:** Log in as each role (admin, comfort pro, CSR) and confirm they only see/do what they should.

12. **Mobile:** Open the dashboard on your phone. Verify the estimate list and detail views are usable.

**IMPORTANT:** Do not launch to the team until every item above passes.

### Build Notes (deployment bugs discovered and fixed)

**v3.2:** Twilio Messaging Service integrated. All SMS routes use `messagingServiceSid`. Inbox route calls Twilio directly. Error display on SMS components. A2P campaign first submission rejected (MESSAGE_FLOW too vague), resubmitted with detailed opt-in process.

**v3.1:** SQL 011 adds `is_active` to follow_up_sequences. `NEXT_PUBLIC_SITE_URL` env var added.

**v2.9:** Vercel Pro required for multi-daily crons. HCP API ignores `start_date`/`end_date` — filter by `created_at` in code. `option.status = "submitted for signoff"` for sent detection. Customer name from `customer.company`. Amounts in cents. `option.updated_at` removed (wrong dates). React hydration error #418 fixed. maxDuration bumped to 300s. Functions can't serialize from server to client in React 19. When adding Vercel env vars via CLI, use `printf` not `echo` (trailing newline bug).

---

## PHASE 5: Team Launch — NOT STARTED

Depends on Phase 4 E2E checklist passing.

### Step 5.1: Add Team Users

1. Go to the admin Team page (`/dashboard/admin/team`). Click "Invite Member" and enter each team member's name, Google Workspace email, phone, and role.
2. Have each team member sign in with Google. They will be auto-provisioned with the correct role from their invite.
3. Confirm each person sees the correct view for their role.

### Step 5.2: Initial Data Load

1. Export your full active estimate list from HCP (all open estimates, not historical).
2. Import via the CSV upload tool. Review the results in the admin dashboard.
3. Verify assignments match HCP. Correct any mismatches manually.
4. The follow-up sequences will begin based on the original sent_date from HCP. Estimates that are already old will quickly move through early steps — review these and snooze any that need manual attention first.

**IMPORTANT:** For the initial load, you may want to temporarily disable auto-sends (pause the sequence) and review the first batch of pending messages manually. Once you're confident the templates and timing are correct, resume the sequence.

### Step 5.3: Team Training

- Walk each comfort pro through their dashboard: how to check their queue, what the counters mean, how to snooze with a note, how to mark a call complete, how to edit a message before it sends.
- Walk the CSR through creating leads, qualifying, and moving to HCP.
- Show everyone the notification system and how to respond when they see alerts.
- Create a simple 1-page reference guide in Google Docs with screenshots.

### Step 5.4: Monitor First Week

- Check Vercel dashboard daily for cron job failures or API errors.
- Check Resend dashboard for delivery rates and bounces.
- Ask each comfort pro for feedback: Is the timing right? Are messages appropriate?
- Adjust the default sequence template based on real-world feedback.

---

## PHASE 6: Pricebook & Pricing Tools

Pipeline becomes the quoting tool. HCP becomes the record-keeper. See PRD v4.0 Section 3.

### Step 6.1: Database — Pricebook Table ✅ COMPLETE

SQL migration `012_pricebook_items.sql`:
- `pricebook_items` table with full schema, RLS policies (admin write, authenticated read)
- Categories: equipment, labor, material, addon, service_plan
- HCP fields: `hcp_uuid` (unique), `hcp_type`, `hcp_category_uuid`, `hcp_category_name`
- Equipment fields: `manufacturer`, `model_number`, `system_type`, `efficiency_rating` (sql/014)
- Future-proofed: `gensco_sku`, `last_price_sync` for Gensco price feed integration

### Step 6.2: Pricebook Admin UI + HCP Import/Sync ✅ COMPLETE

- Admin page at `/dashboard/admin/pricebook` — full CRUD, category filter, search, active/inactive toggle
- **HCP Import** (`POST /api/admin/pricebook/import`): fetches all materials (recursive 3-level subcategory BFS) + services from HCP API. Import is **additive only** — never overwrites existing Pipeline items.
- **HCP Sync**: edits to materials auto-push to HCP on save. Services are read-only in HCP API.
- **Push to HCP**: Pipeline-only items can be pushed to create new HCP materials.
- **Deactivate/Reactivate**: soft-delete with reactivate option.
- Cross-app endpoint: `GET /api/v1/pricebook` (read-only, omits cost/HCP fields).

### Step 6.3: Markup Tiers & Labor Calculator ✅ COMPLETE

SQL migration `013_markup_tiers.sql`:
- `markup_tiers` table with 11 default cost-based multiplier tiers, RLS
- Admin editor at `/dashboard/admin/pricebook/markup-tiers` — editable table with derived markup % and profit %
- **Auto-suggest** price in create/edit modal when cost is entered (equipment/material/addon only, not labor/service_plan)
- **Labor calculator** at `/dashboard/admin/pricebook/labor-calculator` — inputs saved as JSONB in settings table
- Live calculations: overhead/hr, direct loaded rate, fully loaded labor cost, target $/hr
- Quick reference panel at 20%, 25%, 30% profit

### Step 6.4: Bulk Actions & Cascading Navigation ✅ COMPLETE

- **Bulk select**: checkbox per row + select all. Sticky action bar when items selected.
- **Bulk category change** (`PUT /api/admin/pricebook/bulk`): reassign selected items to a new category.
- **Bulk HCP sync** (`POST /api/admin/pricebook/bulk`): push selected active materials to HCP. Skips services (read-only) and deactivated items.
- **Cascading drill-down navigation**:
  - Equipment: Manufacturer → System Type → Efficiency Rating (cascading dropdowns)
  - Material/Labor/Addon/Service Plan: Subcategory dropdown (from `hcp_category_name`)
- Modal supports subcategory, system_type, and efficiency_rating combo fields (select existing or type new)

### Step 6.5: Dynamic Categories, Suppliers, Bulk Edit & Pricing Tools ✅ COMPLETE

- **Dynamic categories** (`pricebook_categories` table, sql/015): replaces hardcoded CHECK constraint. Admin can add new categories with HCP type (material/service). Seeded: Equipment, Labor, Material, Add-On, Service Plan, Accessory.
- **Supplier tracking** (`pricebook_suppliers` table, sql/016): tracks which distributor/vendor an item comes from. `api_type` field for future API integrations (Gensco, Ferguson, etc.). Supplier dropdown + inline add in create/edit modal.
- **Bulk price adjust**: percentage-based increase/decrease applied to both cost and unit_price for selected items. For supplier price changes.
- **Bulk activate/deactivate**: buttons in action bar for selected items.
- **Bulk edit modal**: select multiple items → full edit form. Only filled fields applied. Covers category, manufacturer, model, system type, efficiency, refrigerant, supplier, subcategory, description, spec line, part number, UOM, rebate, and all boolean toggles (tri-state: no change / yes / no).
- **Brand column**: replaced redundant Category column in table with manufacturer/brand (category pills handle filtering).
- **Refrigerant indicators**: colored dots in dedicated column. R-410A (pink), R-22 (green), R-454B (gray/red ring), R-32 (blue/green ring), R-134A (light blue), R-404A (orange), R-290 (silver/red ring). Dropdown in create/edit modal.
- **Rich HCP descriptions**: sync to HCP now includes description, manufacturer, model, system type, efficiency, refrigerant, and spec line in the description field (HCP API only supports name + description for spec data).
- **Category management modal**: "+" button next to category pills to add new categories.
- API routes: `GET/POST /api/admin/pricebook/categories`, `GET/POST /api/admin/pricebook/suppliers`, bulk PUT extended with `action` routing (category, activate, deactivate, price_adjust, edit).

### Step 6.6: Quote Builder — NOT STARTED

New page: `/dashboard/quotes/new`

- Customer lookup (search existing) or create new customer
- Select items from pricebook by category. Build up to 3 option groups.
- Add add-ons (checkbox items shown separately on proposal)
- PM Plan pre-checked by default
- Real-time total calculation per option group
- "Create Estimate" button: saves to `estimates` + `estimate_line_items`, generates `proposal_token`

Requires new tables: `estimate_line_items`, `financing_plans`, `large_job_tags`. Add columns to `estimates` for proposal/tax/financing fields.

### Step 6.7: HCP Sync on Quote Creation — NOT STARTED

When estimate is created in Pipeline:
1. POST to HCP API to create customer (if new)
2. POST to HCP API to create estimate with line items from pricebook
3. Store `hcp_estimate_id` and `hcp_option_id` on local records

### Step 6.8: WA DOR Tax Lookup — NOT STARTED

Create `lib/tax.ts`:
- `getTaxRate(address)` calls WA DOR API
- Fallback: 9.2% if API unavailable
- Cache rate on estimate record

---

## PHASE 7: Proposal Engine — NOT STARTED

Branded customer-facing proposal pages. See PRD v4.0 Section 4.

### Step 7.1: Custom Domains

1. Add CNAME records in Namecheap: `app.genesishvacr.com` and `proposals.genesishvacr.com` → `genesis-pipeline.vercel.app`
2. Add both custom domains in Vercel project settings
3. Update Supabase auth redirect URLs
4. Update `NEXT_PUBLIC_SITE_URL` env var

**VERIFY:** Both domains resolve. Dashboard loads at `app.genesishvacr.com`. Proposal route accessible at `proposals.genesishvacr.com`.

### Step 7.2: Database — Proposal Tables

Create SQL migration for:
- `proposal_engagement` — estimate_id, event_type (page_open/option_view/calculator_open/plan_selected/addon_checked/addon_unchecked/signature_started/signed), option_group, financing_plan, session_seconds, device_type, occurred_at.

RLS: public insert (no auth — customer interactions), read scoped to estimate owner + admin.

**VERIFY:** Table created. Public insert works without auth.

### Step 7.3: Proposal Page

New page: `/app/proposals/[token]/page.tsx`

Light theme (NOT dark mode). No auth required. Token-gated — invalid token shows 404.

Layout per PRD v4.0 Section 4.2:
1. Header — Genesis logo, comfort pro name/avatar, date
2. Hero — personalized greeting, service address
3. Price toggle — Monthly (default) / Full Price / Cash Price
4. Equipment option cards — display name, spec line, description, price per toggle, rebate badge, "Select This Option"
5. Financing calculator — Synchrony plan dropdown, real-time monthly payment, dealer fee, cash savings, "Apply for Financing" link
6. Add-ons — checkbox cards, PM Plan pre-checked, real-time total update
7. Payment schedule — standard (50/50) or large-job (50/25/25/1000) based on tags
8. Why Genesis — Google reviews, company story
9. Signature block — summary, name field, signature canvas, "Approve Proposal" button
10. Footer — logo, phone, website, license, comfort pro contact

**Dependencies to add:** `react-signature-canvas`, `@react-pdf/renderer`, `shadcn/ui`

**VERIFY:** Proposal page renders with test data. All sections display correctly. Responsive on mobile.

### Step 7.4: Proposal API Routes

- POST `/api/proposals/[token]/engage` — public, no auth. Records engagement events to `proposal_engagement`.
- POST `/api/proposals/[token]/sign` — public, no auth. Records signature, IP, timestamp. Generates signed PDF. Updates estimate status to won. Fires HCP approval. Sends confirmation email with PDF.

**VERIFY:** Engagement events recorded. Signature captured. PDF generated. HCP updated. Confirmation email sent.

### Step 7.5: Proposal Tracking in Dashboard

Estimate detail page shows engagement data:
- Total opens, last open date
- Which option viewed most
- Calculator interactions
- Financing plan selected
- Time on page
- Device type

Comfort pro sees this before making follow-up calls (Day 3 and Day 14 call tasks reference this data).

**VERIFY:** Engagement data visible on estimate detail. Updates in real-time.

---

## PHASE 8: Commission Tracking — NOT STARTED

Two-stage commission from close to confirmed payout. See PRD v4.0 Section 6.

### Step 8.1: Database — Commission Tables

Create SQL migrations for:
- `commission_tiers` — period (monthly/quarterly/annual), min_revenue, max_revenue, rate_pct, is_active.
- `commission_records` — estimate_id, user_id, manager_id, pre_tax_revenue, tier_rate_pct, estimated_amount, confirmed_amount, manager_commission_amount, status (estimated/confirmed/paid), confirmed_at, period_revenue_at_confirmation.
- Add columns to `users`: avatar_url, manager_id, manager_commission_pct.

RLS: comfort pro reads own commission records. Admin reads all.

Seed default tier structure (admin-configurable rates 5-8%).

**VERIFY:** Tables created. Tier structure seeded. RLS working.

### Step 8.2: Commission Calculation Logic

Create `lib/commission.ts`:
- `getTierRate(userId, periodRevenue)` — looks up cumulative revenue against tier table
- `calculateEstimated(estimateId)` — pre-tax proposal total × tier rate. Creates commission_record with status "estimated".
- `calculateConfirmed(estimateId, qboInvoiceTotal)` — pre-tax invoice total × tier rate with updated YTD revenue. Updates commission_record to "confirmed".

Called automatically: estimated at proposal signing (Phase 7), confirmed by cron (Step 8.4).

**VERIFY:** Estimated commission calculates correctly at signing. Tier rate lookup works.

### Step 8.3: QBO Integration

Create `lib/qbo.ts`:
- OAuth 2.0 flow: `/api/auth/qbo` callback for token exchange
- `refreshToken()` — auto-refresh expired tokens. Store encrypted in settings table.
- `getInvoiceByReference(hcpEstimateId)` — query QBO for invoice linked to the job
- `getInvoicePaidStatus(invoiceId)` — check if invoice is paid in full
- `getPreTaxTotal(invoiceId)` — invoice total minus tax line

QBO OAuth connection UI in Settings page (admin only).

**VERIFY:** QBO OAuth connects. Can query invoices. Paid status detected correctly.

### Step 8.4: Commission Confirmation Cron

New cron job: `/api/cron/confirm-commission` — 1x daily.

1. Query `commission_records` with status "estimated"
2. Check HCP: is the job marked complete?
3. Check QBO: is the invoice paid in full?
4. Both true → pull pre-tax total from QBO, recalculate tier rate with updated YTD, update commission_record to "confirmed"
5. If manager_id set: calculate manager commission at manager_commission_pct
6. Fire notifications to comfort pro and admin

Add to `vercel.json` cron schedule.

**VERIFY:** Cron detects job complete + paid. Commission confirmed with correct amount. Notifications fire.

### Step 8.5: Commission Dashboard

New page: `/dashboard/commission`

- **Comfort pro view:** own commission history (estimated and confirmed), by job, by period. YTD confirmed total, current tier rate, revenue to next tier.
- **Admin view:** all comfort pros, sortable by commission earned, close rate, pipeline value. Export to CSV for payroll.

**VERIFY:** Comfort pro sees only their data. Admin sees all. Amounts match calculations.

---

## PHASE 9: Command Layer API — NOT STARTED

`/api/v1/` endpoints for the Genesis AI Command Layer. See PRD v4.0 Section 8 and `GENESIS_CONVENTIONS_v2.1.md`.

### Step 9.1: Auth Middleware

Create shared middleware for `/api/v1/` routes:
- Validates `Authorization: Bearer {GENESIS_INTERNAL_API_KEY}` header
- Returns standard error envelope `{data: null, error: {code, message}, meta: {app, version, timestamp}}` on auth failure
- No Supabase Auth session required — these are app-to-app endpoints

Generate and set `GENESIS_INTERNAL_API_KEY` (64-char random string) in Vercel env vars and on Mac Mini.

**VERIFY:** Requests without valid key get 401. Valid key passes through.

### Step 9.2: Pipeline Endpoints

Build each endpoint per conventions (standard envelope, shared field names, `total_count` on lists, `start_date`/`end_date` query params on time-based endpoints):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/estimates/stats` | GET | Pipeline value, count by status, close rate MTD, avg days to close, total commission estimated MTD |
| `/api/v1/estimates/stale` | GET | Estimates with no engagement in 5+ days |
| `/api/v1/estimates/[id]` | GET | Full estimate detail |
| `/api/v1/estimates/[id]/snooze` | POST | Snooze estimate. Body: `{ days, note }` |
| `/api/v1/estimates/[id]/send-next` | POST | Send next due sequence step |
| `/api/v1/estimates/[id]/status` | POST | Mark won/lost. Body: `{ action, selected_option_ids }` |
| `/api/v1/leads` | GET | Open leads list |
| `/api/v1/leads/[id]/move-to-hcp` | POST | Push lead to HCP |
| `/api/v1/commission/summary` | GET | Commission by comfort pro, current period |

**VERIFY:** Each endpoint returns correct data in standard envelope. Auth works. Update `ENDPOINT_REGISTRY.md` status from 🔴 to 🟢 as each goes live.

### Step 9.3: Webhook Events

Fire events to Command Layer webhook receiver at `/api/command/events`:

- `proposal.signed` — when customer signs proposal
- `proposal.opened` — when customer first opens proposal link
- `proposal.approaching_decline` — 3 days before auto-decline
- `commission.confirmed` — when commission confirmed
- `lead.created` — when new lead enters Pipeline

Payload format per `WEBHOOK_CONTRACTS.md`. Auth with `GENESIS_INTERNAL_API_KEY`.

**VERIFY:** Events fire correctly. Payloads match contracts. Update `WEBHOOK_CONTRACTS.md` with any changes.

---

## FUTURE PHASES

### Version 0.2: Real-Time Sync & Analytics
- HCP webhook for automatic estimate ingestion (no more CSV for new records)
- Pipeline analytics dashboard: conversion rates, avg close time, per-comfort-pro metrics

### Phase 2+: Marketing Campaigns
- Customer segmentation and audience builder
- Broadcast email campaigns with batch controls and warm-up
- Do-not-disturb for active pipeline leads
- Pre-built HVAC templates

### Phase 3+: Intelligence Layer
- Gensco price feed integration (auto-update pricebook from supplier)
- Senior CP commission UI (schema ready from Phase 8)
- AI content generation via Command Layer's Claude API
- Weather-triggered campaigns via OpenWeather API
- A/B testing for subject lines, content, send times

---

*Genesis Refrigeration & HVAC  •  Genesis Pipeline  •  Build Plan v4.0  •  February 2026  •  CONFIDENTIAL*
