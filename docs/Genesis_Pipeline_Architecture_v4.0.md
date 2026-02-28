# GENESIS PIPELINE

**Estimate Pipeline, Proposal Engine & Sales Automation**

**System Architecture**

**Version 4.0 — February 2026**

Scoped for Claude Code. Covers full database schema, API routes, data flows, proposal engine, pricebook, commission, and Command Layer endpoints. Read before making any architectural decisions.

Prepared for Wylee — Genesis Refrigeration & HVAC  •  Monroe, WA  •  February 2026

---

## Section 1 — Technology Stack

*What Pipeline is built with*

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 16 (React 19) — App Router | Dashboard UI, proposal pages, quote builder. Dark mode for internal. Light mode for customer-facing proposals. |
| Language | TypeScript — strict mode | No `any` types. No unhandled promise rejections. Enforced across all components, routes, and lib functions. |
| Styling | Tailwind CSS v4 + shadcn/ui | `@theme inline` tokens. Dark mode via class toggle (internal). Proposal pages use light theme independently. |
| Database | Supabase (PostgreSQL) | All data. RLS on every table. Realtime subscriptions for live notifications and SMS threads. |
| Auth | Supabase Auth + Google SSO | Google Workspace only. No public signup. Invite-based provisioning. |
| Cron jobs | Vercel Cron (`vercel.json`) | Sequence execution 7x daily, HCP polling 3x daily, auto-decline 1x daily, commission confirmation 1x daily. |
| Email | Resend | Transactional follow-up and proposal notifications from `marketing@genesishvacr.com`. Webhooks for open/click tracking. |
| SMS | Twilio Messaging Service | Two-way SMS via 425-261-9095 hosted on Twilio. Outbound via Messaging Service SID `MGd102dd6d19268d0e867c30f9457caf2f`. A2P 10DLC registered. |
| HCP integration | Housecall Pro REST API | GET estimates (polling), POST customers, POST estimates, POST options/decline, POST options/approve. Bearer token auth. |
| QBO integration | QuickBooks Online API | Read invoice paid status for commission confirmation. OAuth 2.0 with refresh token. Tokens stored encrypted in settings table. |
| Tax lookup | WA DOR Address API | `https://webgis.dor.wa.gov/webapi/addressrates.aspx` — free, no auth. Rate fetched at proposal generation. Cached on estimate record. |
| Signatures | react-signature-canvas | Click-to-type or draw on mobile. Signature image + IP + timestamp stored. PDF generated via react-pdf. |
| PDF generation | react-pdf / @react-pdf/renderer | Signed proposal PDF. Emailed to customer on approval. Stored in Supabase Storage. |
| Hosting | Vercel | `genesis-pipeline.vercel.app`. Custom domains: `app.genesishvacr.com` (dashboard), `proposals.genesishvacr.com` (customer proposals). |

---

## Section 2 — Database Schema

*Every table, every column*

All tables have RLS enabled. All include `created_at` and `updated_at`. Supabase handles TIMESTAMPTZ automatically. API responses use ISO 8601 UTC per `GENESIS_CONVENTIONS.md`.

### 2.1 Core Tables

#### users

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Supabase Auth user ID. |
| email | TEXT UNIQUE | Universal identifier per GENESIS_CONVENTIONS.md. Used for cross-app identity. |
| name | TEXT | Full display name. |
| phone | TEXT | E.164 format (+1XXXXXXXXXX). Shown on proposal page footer. |
| role | ENUM | `admin` \| `comfort_pro` \| `csr` \| `senior_cp` (V2) |
| google_id | TEXT | Google OAuth subject ID. |
| is_active | BOOLEAN | Deactivated users cannot sign in. Historical data preserved. |
| avatar_url | TEXT | Professional headshot URL. Shown on proposal page. Stored in Supabase Storage. |
| manager_id | UUID FK → users | Senior CP manager. NULL until V2 role is active. Used for manager commission calculation. |
| manager_commission_pct | DECIMAL(5,2) | Default 0. Set to 1.00 when senior_cp role assigned. Admin-only field. |

#### pricebook_items

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| category | ENUM | `equipment` \| `labor` \| `material` \| `addon` \| `service_plan` |
| display_name | TEXT | Customer-facing name. e.g., "Mitsubishi Hyper Heat — Premium System" |
| spec_line | TEXT | Technical detail. e.g., "3 Ton SVZ \| Hyper Heat \| -13°F Rated" |
| description | TEXT | 2-sentence value statement. Default on proposal. Comfort pro can override per estimate. |
| unit_price | DECIMAL(10,2) | Installed price in USD. For equipment: full install price including labor unless separate. |
| manufacturer | TEXT | e.g., "Mitsubishi", "Carrier", "RunTru by Trane" |
| model_number | TEXT | Manufacturer model number. For HCP line item sync. |
| gensco_sku | TEXT | Gensco supplier SKU. NULL until Phase 2 price feed integration. |
| last_price_sync | TIMESTAMPTZ | When Gensco last updated this price. NULL until Phase 2. |
| is_addon | BOOLEAN | True = shown as checkbox on proposal. False = line item only. |
| addon_default_checked | BOOLEAN | PM Plan = true (pre-checked). All others = false. |
| applicable_system_types | TEXT[] | Which system types show this add-on. e.g., `["heat_pump","ac","furnace"]`. NULL = all. |
| is_commissionable | BOOLEAN | Default true. All items commissionable including add-ons and PM plan. |
| rebate_amount | DECIMAL(10,2) | Manufacturer rebate if applicable. NULL = no rebate. Shown as badge on proposal card. |
| is_active | BOOLEAN | Inactive items hidden from quote builder. Historical estimates unaffected. |
| hcp_service_id | TEXT | HCP pricebook service ID for line item sync. Set on first HCP sync. |

#### estimates

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| estimate_number | TEXT UNIQUE | HCP estimate number. Dedup key. |
| hcp_estimate_id | TEXT | HCP internal estimate ID. |
| customer_id | UUID FK → customers | |
| assigned_to | UUID FK → users | Comfort pro responsible for this estimate. |
| status | ENUM | `sent` \| `active` \| `snoozed` \| `won` \| `lost` \| `dormant` |
| total_amount | DECIMAL(10,2) | Pre-tax total. Always from Pipeline pricebook — never derived from HCP import. |
| tax_rate | DECIMAL(5,4) | Fetched from WA DOR API at proposal generation. Cached here. e.g., 0.092 for 9.2%. |
| tax_amount | DECIMAL(10,2) | Calculated: `total_amount * tax_rate`. Displayed on proposal page. |
| show_tax_on_proposal | BOOLEAN | Admin/comfort pro toggle. When false, proposal shows "plus applicable tax" disclaimer instead of tax line. |
| sent_date | DATE | Date estimate sent to customer. From HCP `schedule.scheduled_start` or `created_at` fallback. |
| sequence_id | UUID FK → follow_up_sequences | Active follow-up sequence. |
| sequence_step_index | INTEGER | Current position in sequence. Increments on step completion. |
| snooze_until | TIMESTAMPTZ | NULL unless snoozed. Cron skips sequence steps while snoozed. |
| snooze_note | TEXT | Required when snoozing. Reason for pause. |
| auto_decline_date | DATE | Calculated from `sent_date + auto_decline_days` setting. |
| proposal_token | TEXT UNIQUE | Secure random token for proposal URL. `proposals.genesishvacr.com/[token]` |
| proposal_signed_at | TIMESTAMPTZ | When customer signed the proposal. NULL until signed. |
| proposal_signed_ip | TEXT | IP address of signing device. Legal record. |
| proposal_pdf_url | TEXT | Supabase Storage URL of signed proposal PDF. |
| selected_financing_plan | TEXT | Which Synchrony plan customer selected at signing. e.g., "930" |
| payment_schedule_type | ENUM | `standard` \| `large_job`. Determined by HCP tags at estimate creation. |
| online_estimate_url | TEXT | HCP customer-facing URL if manually set. Not auto-populated (HCP API does not expose it). |

#### estimate_line_items

Replaces the old `estimate_options` table for estimates built in Pipeline pricebook. Stores each line item selected by the comfort pro during quoting.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| estimate_id | UUID FK → estimates | ON DELETE CASCADE |
| pricebook_item_id | UUID FK → pricebook_items | Source item. NULL for manual line items. |
| option_group | INTEGER | Which proposal option card this belongs to. 1, 2, or 3. Allows multiple options per proposal. |
| display_name | TEXT | Copied from pricebook at time of quoting. Comfort pro can override. |
| spec_line | TEXT | Copied from pricebook. Comfort pro can override. |
| description | TEXT | Copied from pricebook. Comfort pro can override per estimate. |
| quantity | DECIMAL(10,2) | Default 1 for equipment. Variable for materials. |
| unit_price | DECIMAL(10,2) | Locked at time of quoting. Pricebook price changes do not affect existing estimates. |
| line_total | DECIMAL(10,2) | `quantity * unit_price`. Computed column. |
| is_addon | BOOLEAN | True = shown as optional checkbox on proposal. Customer can add/remove. |
| is_selected | BOOLEAN | For addons: whether customer checked it on the proposal. Updated at signing. |
| hcp_option_id | TEXT | HCP option ID after sync. Used for approve/decline API calls. |

#### commission_tiers

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| period | ENUM | `monthly` \| `quarterly` \| `annual`. Admin-configurable. |
| min_revenue | DECIMAL(10,2) | Minimum cumulative revenue in period to qualify for this tier. |
| max_revenue | DECIMAL(10,2) | NULL = no ceiling (top tier). |
| rate_pct | DECIMAL(5,2) | Commission percentage. e.g., 5.00, 6.00, 7.00, 8.00 |
| is_active | BOOLEAN | Inactive tiers ignored in calculations. Allows transitioning tier structures without deleting history. |

#### commission_records

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| estimate_id | UUID FK → estimates | |
| user_id | UUID FK → users | Comfort pro who earned the commission. |
| manager_id | UUID FK → users | NULL if no manager. Set from `users.manager_id` at time of calculation. |
| pre_tax_revenue | DECIMAL(10,2) | Revenue base for commission calculation. Pre-tax invoice total from QBO at confirmation. |
| tier_rate_pct | DECIMAL(5,2) | Rate applied. Locked at calculation time. Rate changes do not retroactively affect this record. |
| estimated_amount | DECIMAL(10,2) | Calculated at proposal signing. Based on proposal total. |
| confirmed_amount | DECIMAL(10,2) | Calculated at job complete + invoice paid. NULL until confirmed. |
| manager_commission_amount | DECIMAL(10,2) | Manager's 1% of pre_tax_revenue. NULL if no manager. |
| status | ENUM | `estimated` \| `confirmed` \| `paid` |
| confirmed_at | TIMESTAMPTZ | When job complete + invoice paid conditions were both met. |
| period_revenue_at_confirmation | DECIMAL(10,2) | Comfort pro's cumulative confirmed revenue in the period at time of confirmation. Used to verify tier rate. |

#### proposal_engagement

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| estimate_id | UUID FK → estimates | ON DELETE CASCADE |
| event_type | ENUM | `page_open` \| `option_view` \| `calculator_open` \| `plan_selected` \| `addon_checked` \| `addon_unchecked` \| `signature_started` \| `signed` |
| option_group | INTEGER | Which option card was viewed/interacted with. NULL for non-option events. |
| financing_plan | TEXT | e.g., "930", "980", "943", "cash". For plan_selected events. |
| session_seconds | INTEGER | Time on page for page_open events. |
| device_type | TEXT | `mobile` \| `desktop` \| `tablet`. From user agent. |
| occurred_at | TIMESTAMPTZ | |

#### financing_plans

Admin-managed. Controls what appears in the proposal financing calculator.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| plan_code | TEXT UNIQUE | Synchrony plan code. e.g., "930", "980", "943" |
| label | TEXT | Display label. e.g., "25 Months, 0% APR" |
| fee_pct | DECIMAL(5,4) | Dealer fee as decimal. e.g., 0.1160 for 11.60% |
| months | INTEGER | Term length in months. |
| apr | DECIMAL(5,4) | Annual percentage rate. 0.0000 for same-as-cash plans. |
| is_default | BOOLEAN | Only one plan can be default. Plan 930 is default. |
| is_active | BOOLEAN | Inactive plans hidden from proposal calculator. |
| synchrony_url | TEXT | Application link. `https://www.mysynchrony.com/mmc/HY223500700` |
| display_order | INTEGER | Order in calculator dropdown. Lower = first. |

#### large_job_tags

Admin-configurable. Tags that trigger the 4-payment schedule on proposals.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tag_name | TEXT UNIQUE | Exact match to HCP estimate tag. e.g., "Remodel", "New Con" |
| is_active | BOOLEAN | Inactive tags ignored during payment schedule determination. |

---

## Section 3 — API Routes

*Complete route map*

### 3.1 Externally Callable (webhooks)

| Route | Method | Auth & Purpose |
|-------|--------|---------------|
| `/api/webhooks/twilio` | POST | Twilio signature validation. Inbound SMS from customers. |
| `/api/webhooks/resend` | POST | Resend signature validation. Email open/click/bounce events. |
| `/api/leads/inbound` | POST | Bearer `LEADS_WEBHOOK_SECRET`. Accepts leads from Retell AI, Webflow, Zapier, Facebook, Google. |
| `/proposals/[token]` | GET | Public — no auth. Customer-facing proposal page. Token-gated. |
| `/api/proposals/[token]/sign` | POST | Public — no auth. Customer submits signature. Validates token, records signature, fires approval flow. |
| `/api/proposals/[token]/engage` | POST | Public — no auth. Records `proposal_engagement` events (opens, calculator use, etc.). |
| `/api/auth/qbo` | GET | QBO OAuth callback. Exchanges code for tokens. Stores encrypted in settings. |

### 3.2 Command Layer API (app-to-app)

All `/api/v1/` routes: Bearer `GENESIS_INTERNAL_API_KEY`. Standard response envelope `{data, error, meta}`. No Supabase Auth session required. These are the only routes the Genesis AI Command Layer calls.

| Route | Method | Returns |
|-------|--------|---------|
| `/api/v1/estimates/stats` | GET | Pipeline value, count by status, close rate MTD, avg days to close, total commission estimated MTD, `total_count`. |
| `/api/v1/estimates/stale` | GET | Estimates with no engagement in 5+ days. Includes `customer_name`, `hcp_job_number`, last open, sequence step, `user_email`. |
| `/api/v1/estimates/[id]` | GET | Full detail: options, sequence state, engagement summary, customer contact, comfort pro email/name. |
| `/api/v1/estimates/[id]/snooze` | POST | Body: `{ days: number, note: string }`. Snoozes follow-up sequence. |
| `/api/v1/estimates/[id]/send-next` | POST | Sends next due sequence step immediately. |
| `/api/v1/estimates/[id]/status` | POST | Body: `{ action: "won"\|"lost", selected_option_ids: [] }` |
| `/api/v1/leads` | GET | Open leads. `status`, `source`, `customer_name`, assigned `user_email`, `days_since_created`, `total_count`. |
| `/api/v1/leads/[id]/move-to-hcp` | POST | Qualifies lead, creates customer + estimate in HCP. |
| `/api/v1/commission/summary` | GET | Commission by comfort pro. `estimated_total`, `confirmed_total`, `current_tier_rate`, `revenue_to_next_tier`. Query param: `?period=current` |

### 3.3 Cron Jobs

| Route | Schedule (UTC) | Purpose |
|-------|---------------|---------|
| `/api/cron/execute-sequences` | 7x daily | Sends due follow-up steps. Validates sequence still active and step still exists before sending. |
| `/api/cron/poll-hcp-status` | 3x daily | Polls HCP API. Detects status changes. Updates estimate records. |
| `/api/cron/auto-decline` | 1x daily | Declines estimates past `auto_decline_date`. POSTs to HCP API. |
| `/api/cron/confirm-commission` | 1x daily | Checks won estimates for job complete + invoice paid. Fires commission confirmation when both true. |

---

## Section 4 — Data Flows

*How the key processes work end to end*

### 4.1 Quote → Proposal → Signature

| # | Actor | Action |
|---|-------|--------|
| 1 | Comfort Pro | Opens quote builder in Pipeline. Selects customer or creates new. Selects equipment, labor, materials from pricebook. Sets option groups (1, 2, or 3 options). Adds commission-eligible add-ons. |
| 2 | Pipeline | Calculates total per option group. Calls WA DOR API with job address → gets tax rate. Calculates `tax_amount`. If `show_tax_on_proposal = true`, both shown. Generates secure `proposal_token`. |
| 3 | Pipeline → HCP | POSTs to HCP API: creates estimate with line items from pricebook. Stores `hcp_estimate_id` and `hcp_option_id` per option group. HCP is now the record. |
| 4 | Pipeline → Customer | SMS sent: "Hi [name], [comfort pro] just sent your estimate. View and approve here: `proposals.genesishvacr.com/[token]`". Branded email sent with "View Your Proposal" button. |
| 5 | Customer | Opens proposal URL. All engagement events POSTed to `/api/proposals/[token]/engage`. Page open, option views, calculator interactions, plan selections all recorded to `proposal_engagement`. |
| 6 | Customer | Selects option, selects financing plan (or cash), checks/unchecks add-ons, enters name, signs. POSTs to `/api/proposals/[token]/sign`. |
| 7 | Pipeline | Records signature, IP, timestamp. Generates signed PDF via react-pdf. Stores in Supabase Storage. Updates estimate: `proposal_signed_at`, `proposal_signed_ip`, `proposal_pdf_url`, `selected_financing_plan`, status → won. |
| 8 | Pipeline → HCP | POSTs approval to HCP: selected `hcp_option_id` approved, others declined. POSTs named link to HCP estimate: "Signed Proposal — [date]" with proposal URL. |
| 9 | Pipeline → Customer | Confirmation email with signed PDF attached. Subject: "You're on the Genesis schedule." |
| 10 | Pipeline | Calculates `estimated_commission`. Creates `commission_record` with status "estimated". Notifies comfort pro and admin. Fires Command Layer event. |

### 4.2 Commission Confirmation Flow

| # | Actor | Action |
|---|-------|--------|
| 1 | Cron (daily) | `/api/cron/confirm-commission` runs. Queries all `commission_records` with status "estimated". |
| 2 | Cron → HCP | Checks each estimate's HCP job status via polling. Is the job marked complete? |
| 3 | Cron → QBO | Checks QBO invoice for the job. Is it paid in full? Uses QBO OAuth client to query invoice by `hcp_estimate_id` reference. |
| 4 | Cron | Both conditions met: pulls pre-tax invoice total from QBO (strips tax line). Calculates cumulative period revenue for comfort pro. Determines tier rate. Calculates `confirmed_amount`. |
| 5 | Cron | If `manager_id` set on user: calculates `manager_commission_amount` at `manager_commission_pct`. Updates `commission_record`: `confirmed_amount`, `manager_commission_amount`, status → confirmed, `confirmed_at`, `period_revenue_at_confirmation`. |
| 6 | Pipeline | Admin notification: "[comfort pro] commission confirmed — $[amount] on [customer] job." Comfort pro notification: "Commission confirmed — $[amount]." |

### 4.3 Tax Display Logic

| Tax Display State | Proposal Page Behavior |
|------------------|----------------------|
| Hidden (Genesis default) | Proposal shows pre-tax total only. Disclaimer shown: "Plus applicable sales tax." This is the Genesis default for all estimates. |
| Shown | Customer clicked "Show tax-inclusive total" toggle on the proposal page. Proposal shows: Subtotal + Tax line ($X at X.X%) + Total. Toggle is customer-facing only — no action required from comfort pro. |

Tax is always calculated at proposal generation via WA DOR API and cached on the estimate record regardless of display setting. Commission calculation always uses the pre-tax amount. The customer toggle is a read-only view helper — it does not affect pricing, commission, or the signed proposal total.

---

## Section 5 — File Structure

*Codebase organization*

| Path | Purpose |
|------|---------|
| `/app/(auth)/login` | Google SSO login page. |
| `/app/(dashboard)/layout.tsx` | Authenticated shell. Dark theme. Nav: Pipeline, Leads, Inbox, Commission, Settings. |
| `/app/(dashboard)/page.tsx` | Comfort pro pipeline dashboard. Estimate list, counters, sequence status. |
| `/app/(dashboard)/quotes/new` | Quote builder. Pricebook item selection, option groups, add-ons, customer lookup. |
| `/app/(dashboard)/estimates/[id]` | Estimate detail. Sequence timeline, engagement data, SMS thread, actions. |
| `/app/(dashboard)/commission` | Commission dashboard. Comfort pro sees own history. Admin sees all. |
| `/app/(dashboard)/leads` | CSR lead management. List, edit, move to HCP, archive. |
| `/app/(dashboard)/inbox` | Unmatched SMS threads. Reply, convert to lead, dismiss. |
| `/app/(dashboard)/settings` | Admin settings: sequences, pricebook, financing plans, large-job tags, commission tiers, team, QBO connection. |
| `/app/proposals/[token]/page.tsx` | Customer-facing proposal page. Light theme. No auth required. Token-gated. |
| `/app/api/v1/` | Command Layer endpoints. `GENESIS_INTERNAL_API_KEY` auth. Standard response envelope. |
| `/app/api/cron/` | All cron job routes. `CRON_SECRET` auth. |
| `/app/api/webhooks/` | Twilio and Resend inbound webhooks. |
| `/app/api/proposals/` | Sign and engage routes. Public — token-gated only. |
| `/lib/hcp.ts` | HCP API client. `getEstimates()`, `createCustomer()`, `createEstimate()`, `declineOptions()`, `approveOption()`, `postNamedLink()`. Reusable by Command Layer. |
| `/lib/qbo.ts` | QBO client. `refreshToken()`, `getInvoiceByReference()`, `getInvoicePaidStatus()`, `getPreTaxTotal()`. Reusable by Command Layer. |
| `/lib/tax.ts` | WA DOR API wrapper. `getTaxRate(address)` → rate. Falls back to 0.092 if API unavailable. |
| `/lib/commission.ts` | Commission calculation logic. `getTierRate(userId, periodRevenue)`, `calculateEstimated()`, `calculateConfirmed()`. |
| `/lib/proposal.ts` | Proposal generation. `generateToken()`, `buildProposalData()`, `generateSignedPdf()`. |
| `/lib/supabase.ts` | Supabase client (anon + service role). Pipeline-specific query helpers. |
| `/types/pipeline.ts` | TypeScript types: Estimate, LineItem, CommissionRecord, ProposalEngagement, FinancingPlan, PricebookItem, Lead. |
| `/privacy`, `/terms` | Twilio A2P compliance pages. Required for carrier approval. |

---

## Section 6 — Environment Variables

*Required for deployment*

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service role — never expose to client |
| `NEXT_PUBLIC_SITE_URL` | Client + Server | `https://app.genesishvacr.com` |
| `GENESIS_INTERNAL_API_KEY` | Server only | 64-char shared secret. Command Layer auth for `/api/v1/` routes. |
| `CRON_SECRET` | Server only | Vercel cron job authentication |
| `LEADS_WEBHOOK_SECRET` | Server only | Bearer token for `/api/leads/inbound` |
| `HCP_API_KEY` | Server only | Housecall Pro Bearer token |
| `TWILIO_ACCOUNT_SID` | Server only | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Server only | Twilio webhook signature validation |
| `TWILIO_MESSAGING_SERVICE_SID` | Server only | `MGd102dd6d19268d0e867c30f9457caf2f` |
| `TWILIO_PHONE_NUMBER` | Server only | `+14252619095` |
| `RESEND_API_KEY` | Server only | Resend transactional email API |
| `QBO_CLIENT_ID` | Server only | QuickBooks OAuth client ID |
| `QBO_CLIENT_SECRET` | Server only | QuickBooks OAuth client secret |

---

*Genesis Refrigeration & HVAC  •  Genesis Pipeline  •  Architecture v4.0  •  February 2026  •  CONFIDENTIAL*
