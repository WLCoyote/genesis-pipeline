# GENESIS PIPELINE

**Estimate Pipeline, Proposal Engine & Sales Automation**

**Product Requirements Document**

**Version 4.0 — February 2026**

Scoped for Claude Code. Primary reader: AI coding assistant building this app. Includes proposal flow, pricebook, commission tracking, and Command Layer API surface.

Prepared for Wylee — Genesis Refrigeration & HVAC  •  Monroe, WA  •  February 2026

---

## Section 1 — Product Overview

*What Genesis Pipeline is and what it does*

### 1.1 Product Identity

Genesis Pipeline is the sales engine for Genesis Refrigeration & HVAC. It is three things in one: an estimate pipeline that tracks every estimate from sent to closed, a proposal engine that delivers branded interactive proposals to customers, and a sales automation platform that follows up on every estimate automatically using a multi-channel sequence. It also handles inbound leads from all external sources and tracks comfort pro commission from close to payment.

Pipeline is the system of record for sales. Housecall Pro remains the system of record for job execution. QuickBooks remains the system of record for financials. Pipeline connects them at the sales layer — from estimate to signed proposal to job creation.

### 1.2 Core Problems Solved

| Problem | How Pipeline Solves It |
|---------|----------------------|
| Inconsistent estimate follow-up | Every estimate enters an automated multi-channel sequence the moment it is sent. No follow-up is ever missed. |
| Generic HCP estimate emails | Pipeline generates a branded interactive proposal page with financing calculator, add-ons, and digital signature. |
| No pipeline visibility | Dashboard shows every estimate by status, engagement data, and sequence position across the entire team. |
| Pricing miscalculation on proposals | Estimates built in Pipeline pricebook. Clean totals. Financing math is always correct. Synced to HCP via API. |
| No commission tracking | Commission calculated at signing (estimated) and at job completion + payment (confirmed). Tier-based, pre-tax. |
| Leads from ads falling through cracks | All external leads (web, Facebook, Google, phone AI) hit a single inbound webhook and enter the CSR queue. |

### 1.3 What Is Explicitly Out of Scope

- Full CRM — jobs, invoicing, scheduling remain in Housecall Pro
- Payment processing — deposit collection handled in HCP
- Payroll — commission is tracked here, payroll processing is in QuickBooks
- Native mobile app — responsive web only
- Public user signups — internal team access only via Google SSO

---

## Section 2 — Users & Roles

*Who uses Pipeline and what they can do*

| Role | Who | Access |
|------|-----|--------|
| Admin | Wylee | Full access. Configures sequences, pricebook, financing plans, add-on catalog, commission tiers, team settings. Views all data across all comfort pros. |
| Comfort Pro | Sales staff | Sees only their assigned estimates and leads. Builds quotes in pricebook. Manages their follow-up queue. Views their own commission dashboard. |
| CSR | Office staff | Creates and manages inbound leads. Assigns comfort pros. Moves qualified leads to HCP. Views inbox and unmatched SMS threads. |
| Senior CP (V2) | Future role | Manager commission earned on their comfort pros' closed jobs. Schema supports this from day one. UI in V2. |

---

## Section 3 — The Pricebook

*How estimates are built in Pipeline*

### 3.1 Why the Pricebook Exists

Estimates were previously built in Housecall Pro and imported into Pipeline. This created a data handoff problem — HCP estimates contain line items (labor, parts, refrigerant, disposal) that do not cleanly map to a single proposal price. The financing calculator, cash discount, and proposal page all require a clean, accurate total that Pipeline owns. The pricebook solves this by making Pipeline the quoting tool and HCP the record-keeper.

Comfort pros build estimates in Pipeline using the pricebook. Pipeline calculates the clean total, generates the proposal, and syncs the line items back to HCP via API. HCP is never the source of truth for proposal pricing.

### 3.2 Pricebook Structure

| Category | Examples | Notes |
|----------|----------|-------|
| Equipment | Heat pumps, furnaces, AC units, mini-splits | Manufacturer, model number, tonnage, SEER rating, display name, install price. Gensco price feed integration in Phase 2. |
| Labor | Standard install, complex install, new construction | Flat rates by job type. Admin-configurable. |
| Materials | Refrigerant, lineset, disconnect, pad | Unit cost items. Quantity set per estimate. |
| Add-Ons | Smart thermostat, air quality monitor, CO detector | Shown on proposal as optional checkbox items. Commission-eligible. |
| Service Plans | Genesis PM Plan (annual) | Always shown on proposal. Pre-checked. Recurring revenue. Commission-eligible. |

### 3.3 Option Naming Convention

Every equipment item in the pricebook has three fields that appear on the proposal page:

| Field | Example | Purpose |
|-------|---------|---------|
| Display Name | Mitsubishi Hyper Heat — Premium System | Large text on proposal card. Human-readable. Customer-facing. |
| Spec Line | 3 Ton SVZ \| Hyper Heat \| -13°F Rated | Small text below display name. Technical detail for informed customers. |
| Description | Industry-leading cold weather performance. Heats and cools with one system, no gas line required. | 2-sentence value statement. Comfort pro can customize per proposal. |

### 3.4 Gensco Integration (Phase 2)

Gensco is Genesis's primary equipment supplier. In Phase 2, Pipeline connects to Gensco's price feed to auto-update equipment costs when supplier pricing changes. The pricebook schema is designed for this from day one — each equipment item has a `gensco_sku` field and a `last_price_sync` timestamp. Admin can trigger a manual sync or configure automatic nightly updates.

---

## Section 4 — The Proposal Flow

*From estimate built to customer signature*

### 4.1 Flow Overview

| # | Step | What Happens |
|---|------|-------------|
| 1 | Quote built | Comfort pro builds estimate in Pipeline using the pricebook. Selects equipment options, labor, materials, add-ons. Clean total calculated. |
| 2 | HCP sync | Pipeline POSTs estimate to HCP API with line items. HCP estimate created as system of record. Pipeline estimate linked via `hcp_estimate_id`. |
| 3 | Proposal built | Pipeline generates branded proposal page at `proposals.genesishvacr.com/[token]`. Tax calculated via WA DOR API using job address. |
| 4 | Customer notified | SMS sent immediately: "Hi [name], [comfort pro] just sent your estimate. View and approve here: [link]." Branded email also sent with "View Your Proposal" button. |
| 5 | Tracking starts | Pipeline records every proposal open, time on page, option viewed, calculator interaction, financing plan selected. All visible to comfort pro in Pipeline. |
| 6 | Follow-up runs | Automated multi-channel sequence fires per cadence (see Section 5). Every estimate, every time, without anyone having to remember. |
| 7 | Customer signs | Customer selects option, selects financing plan, checks add-ons, signs on proposal page. Signature captured, PDF generated, confirmation email sent. |
| 8 | Systems updated | Pipeline updates HCP (option approved, others declined, named link posted). Sequence stops. Comfort pro notified. Command Layer event fired. |
| 9 | Commission estimated | Estimated commission calculated at signing based on pre-tax proposal total and current tier rate. Visible to comfort pro immediately. |
| 10 | Job handoff | Office sees approved status in HCP. Converts to job, sends 50% deposit request, schedules installation. Human judgment retained for scheduling. |

### 4.2 Proposal Page Layout

URL: `proposals.genesishvacr.com/[secure-token]`. Light theme (white/gray background, navy and red accents). Genesis V2 logo. Responsive — works on any device.

| # | Section | Content |
|---|---------|---------|
| 1 | Header | Genesis logo, "Your Custom Proposal", comfort pro name and avatar, proposal date. |
| 2 | Hero | "Hi [First Name], here's your custom proposal." Comfort pro intro. Service address. |
| 3 | Price toggle | Three buttons: Monthly (default) \| Full Price \| Cash Price. Controls how all prices display across the page. |
| 4 | Equipment options | One card per option. Display name, spec line, description, price per toggle selection, rebate badge if applicable, "Most Popular" or "Best Value" badge if set by comfort pro. "Select This Option" button. |
| 5 | Financing calculator | Shows when Monthly toggle active. Dropdown: Plan 930 (default), Plan 980, Plan 943, Pay in Full. Monthly payment updates in real time. Shows financed total, dealer fee, and cash savings. "Apply for Financing" opens Synchrony link. |
| 6 | Add-ons | "Recommended for Your System" section. Checkbox cards. PM Plan pre-checked. Others unchecked. Adding/removing updates calculator total in real time. |
| 7 | Payment schedule | Standard: 50% to schedule, 50% on completion. Large job (Remodel/New Con tag): 50% / 25% rough-in / 25% install complete / $1,000 pending inspection. Shown as visual timeline. |
| 8 | Why Genesis | 3-4 Google reviews (manually entered in Pipeline settings). Company story (editable text block). Team/install photo if available. |
| 9 | Signature block | Summary of selections (option, add-ons, financing plan, total, payment schedule). Customer name field. Signature (click-to-sign or draw). Authorization text. "Approve Proposal" button. |
| 10 | Footer | Genesis logo, phone, website, license number, comfort pro direct contact. |

### 4.3 Financing Plans

Three standard Synchrony plans displayed on the proposal page. Admin can add, edit, or remove plans in Pipeline settings. Fee formula: `fee = invoice_total / (1 - fee_pct) - invoice_total`

| Plan | Fee % | Terms | APR | Default? | Best For |
|------|-------|-------|-----|----------|----------|
| 930 | 11.60% | 25 months | 0% | Yes | Lead with this. Zero interest, manageable payments. |
| 980 | 8.70% | 37 months | 5.99% | No | Lower monthly payment, longer term. |
| 943 | 8.70% | 132 months | 9.99% | No | Maximum affordability. ~$100/mo on $8k job. |

Cash Price = invoice total with no dealer fee added. Displayed as "Save $[X] vs financing." Customer saves the Plan 930 dealer fee (11.60% of invoice). Cash discount is meaningful and displayed prominently on the Cash Price toggle.

Synchrony application: financing calculator is illustrative. "Apply for Financing" button opens `https://www.mysynchrony.com/mmc/HY223500700` in a new tab. Customer applies, returns to proposal page, selects their approved plan, and signs.

### 4.4 Sales Tax

Tax is calculated at proposal generation time using the Washington State Department of Revenue address-based API: `https://webgis.dor.wa.gov/webapi/addressrates.aspx`. Rate is fetched using the job address, cached on the estimate record. Displayed on the proposal page as a separate tax line below the subtotal.

- Customer sees: Subtotal + Tax line + Total (full-total display)
- Monthly view shows: "Est. $[X]/mo + $[tax]/mo" with tax shown separately
- Commission is always calculated on pre-tax revenue — tax line is stripped before commission math
- Fallback: if WA DOR API is unavailable, use 9.2% with "Estimated tax rate" disclaimer

### 4.5 Payment Schedule Trigger

Payment schedule displayed on the proposal page is determined by HCP estimate tags. Admin configures which tags trigger the large-job schedule in Pipeline Settings.

| Trigger | Payment Schedule |
|---------|-----------------|
| No special tag (standard) | 50% to schedule installation date. 50% upon completion. |
| Tag: Remodel or New Con | 50% to schedule. 25% after rough-in complete. 25% after installation complete. $1,000 held pending final inspection. |

---

## Section 5 — Follow-Up Sequence

*Automated cadence from Day 0 to Day 60*

### 5.1 Default Sequence

This is Wylee's personal sales cadence, automated. Every estimate, every time, without exception.

| Day | Channel | Action |
|-----|---------|--------|
| 0 | SMS + Email | Proposal sent notification. SMS: "Hi [name], [comfort pro] just sent your estimate. View and approve here: [link]." Branded email with "View Your Proposal" button. |
| 1 | SMS | "Hi [name], just checking in — did you get a chance to look over the proposal? Happy to walk through any of the options." |
| 3 | Call Task | Pipeline flags for comfort pro call. Shows full engagement history: opens, time on page, which option viewed most, calculator use, financing plan selected. Comfort pro calls informed. |
| 7 | Email | Value-add email. Mentions financing options, manufacturer rebates, why now is a good time. "View Your Proposal" button links back to the same proposal page. |
| 14 | Call Task + SMS | Second call prompt with full engagement context. Same-day SMS: "Hi [name], [comfort pro] here — wanted to personally reach out. Still happy to answer any questions." |
| 21 | Email | "We'd love to earn your business" email. Proposal link. Any rebate deadline approaching called out here. |
| 30 | SMS + Call Task | Final active SMS touch with proposal link. Lead moves to dormant after this step. |
| 60 | Email + Auto-Decline | Last "we're still here" email. Then auto-decline: Pipeline POSTs to HCP API to decline all options. Estimate marked lost. |

### 5.2 Sequence Controls

- Auto-sends fire without approval unless comfort pro intervenes during the 30-minute edit window
- **Send Now** button: bypasses edit window, sends immediately. Designed for Day 0 — build estimate, sync to HCP, pull into Pipeline, Send Now on Day 0 SMS.
- **Skip Step**: advances past current step without sending. Step marked Skipped in timeline.
- **Execute**: sends a previously skipped step after the fact.
- **Snooze**: pauses entire sequence for customer for a comfort-pro-selected duration. Requires a note.
- **Pause/Resume**: admin can pause all follow-ups for the sequence without losing step configuration. Yellow "follow-ups on hold" banner appears on estimate detail.
- Sequence stops immediately when any option is approved or all options are declined.

---

## Section 6 — Commission Tracking

*From close to confirmed payout*

### 6.1 Commission Structure

| Element | Detail |
|---------|--------|
| Base rate | 5-8% depending on threshold achievement. Tier table is admin-configurable — thresholds and rates can be changed without a code deployment. |
| Threshold period | Admin-configurable: monthly, quarterly, or annual. Period resets the cumulative revenue tracker. |
| Calculated on | Pre-tax invoice total. Sales tax stripped before commission math. Pulled from QBO invoice at job completion. |
| Commissionable items | Equipment options + add-ons + PM Plan. Everything on the signed proposal. |
| Payment trigger | Job marked complete in HCP AND invoice paid in full in QBO. Both conditions must be true. Commission is not released on signing alone. |
| Manager rate (V2) | +1% on deals closed by comfort pros they manage. Additive — does not reduce comfort pro rate. Paid separately. Schema supports this from day one, UI built in V2. |

### 6.2 Two-Stage Tracking

| Stage | Detail |
|-------|--------|
| Estimated | Calculated at proposal signing. Based on pre-tax proposal total and current tier rate. Labeled "Estimated — subject to final invoice." Comfort pro sees this immediately. Motivates closing. |
| Confirmed | Calculated when job complete + invoice paid. Uses actual pre-tax invoice total from QBO. Recalculates tier rate with updated YTD revenue. Replaces estimated amount. Admin notification fired. |

### 6.3 Commission Dashboard

- Comfort pro view: their own commission history — estimated and confirmed, by job, by period
- YTD total confirmed commission, current tier rate, revenue to next tier threshold
- Admin view: all comfort pros, sortable by commission earned, close rate, pipeline value
- Export: admin can export commission report for a given period (feeds into payroll in QBO)

---

## Section 7 — Inbound Leads

*All external entry points into Pipeline*

### 7.1 Lead Entry Points

| Source | Method | Notes |
|--------|--------|-------|
| Website contact form | Webflow → Pipeline webhook | POST to `/api/leads/inbound` with `LEADS_WEBHOOK_SECRET`. Fix immediately — currently not wired. |
| Facebook Lead Ads | Zapier → Pipeline webhook | Wire when ads go live. Same endpoint. |
| Google Ads | Zapier → Pipeline webhook | Wire when ads go live. Same endpoint. |
| AI Phone (Retell) | Retell webhook → Pipeline webhook | Unanswered/after-hours calls. Retell captures lead info, POSTs to same `/api/leads/inbound` endpoint. |
| Manual (CSR entry) | CSR creates in Pipeline UI | For walk-ins, referrals, any lead that arrives outside automated channels. |
| Inbound SMS (unmatched) | Twilio webhook → Pipeline Inbox | Unknown number texts the business. Appears in Inbox. CSR can convert to lead. |

### 7.2 Lead Flow

- All leads land in CSR queue with status "new"
- CSR qualifies: updates status, adds notes, assigns comfort pro
- When qualified: CSR clicks "Move to HCP" — Pipeline POSTs to HCP API to create customer + estimate
- Move to HCP does NOT create a local Pipeline estimate — it only updates lead status to "moved_to_hcp"
- Estimate enters Pipeline when HCP polling detects `option.status = "submitted for signoff"`
- Lead is then linked to the resulting estimate via `converted_estimate_id`

---

## Section 8 — Command Layer API Surface

*Endpoints for Genesis AI Command Layer consumption*

All Command Layer endpoints follow `GENESIS_CONVENTIONS.md`: `/api/v1/` prefix, `GENESIS_INTERNAL_API_KEY` Bearer auth, standard response envelope `{data, error, meta}`. These endpoints are separate from the internal dashboard API routes and require no Supabase Auth session.

| Endpoint | Method | Returns |
|----------|--------|---------|
| `GET /api/v1/estimates/stats` | GET | Total pipeline value, count by status, close rate MTD, avg days to close, total commission estimated MTD. |
| `GET /api/v1/estimates/stale` | GET | Estimates with no engagement activity in 5+ days. Includes last open date, sequence step, comfort pro name. |
| `GET /api/v1/estimates/[id]` | GET | Full estimate detail: options, sequence state, engagement tracking, comfort pro, customer contact. |
| `POST /api/v1/estimates/[id]/snooze` | POST | Snooze estimate follow-up. Body: `{ days, note }` |
| `POST /api/v1/estimates/[id]/send-next` | POST | Send next due sequence step immediately. |
| `POST /api/v1/estimates/[id]/status` | POST | Mark won or lost. Body: `{ action: "won"\|"lost", selected_option_ids: [] }` |
| `GET /api/v1/leads` | GET | Open leads list with status, source, assigned comfort pro, days since created. |
| `POST /api/v1/leads/[id]/move-to-hcp` | POST | Qualify lead and create customer + estimate in HCP. |
| `GET /api/v1/commission/summary` | GET | Commission summary by comfort pro. Estimated and confirmed totals, current period. |

Agent skill examples: "How's the pipeline looking?" → /stats. "Which proposals haven't been opened?" → /stale. "Snooze Martinez two weeks, waiting on financing" → /snooze. "How much commission has [name] earned this month?" → /commission/summary.

---

## Section 9 — Feature Priority Table

*MoSCoW classification*

| Priority | Feature | Notes |
|----------|---------|-------|
| **MUST** | Pricebook | Equipment catalog, labor, materials, add-ons, PM plan. Admin-managed. Foundation of proposal flow. |
| **MUST** | In-Pipeline quoting | Comfort pro builds estimate in Pipeline. Clean total for proposal and financing math. |
| **MUST** | HCP sync on quote | POST to HCP API on quote creation. Line items synced. HCP is record-keeper, Pipeline is quoting tool. |
| **MUST** | Proposal page | Branded interactive page at `proposals.genesishvacr.com`. All sections per Section 4.2. |
| **MUST** | Financing calculator | Three Synchrony plans, cash option, real-time monthly payment updates, Synchrony application link. |
| **MUST** | WA DOR tax lookup | Rate by address. Displayed on proposal. Pre-tax total used for commission. Fallback 9.2%. |
| **MUST** | Proposal tracking | Opens, time on page, option viewed, calculator use, financing plan selected. Visible to comfort pro. |
| **MUST** | Digital signature | Click-to-sign or draw on mobile. IP timestamped. Signed PDF generated and emailed to customer. |
| **MUST** | Commission tracking | Two-stage (estimated at signing, confirmed at job complete + paid). Tier-based, pre-tax. Admin-configurable. |
| **MUST** | Payment schedule tags | HCP tags (Remodel, New Con) trigger 4-payment structure on proposal page. Admin-configurable. |
| **MUST** | Command Layer API | `/api/v1/` endpoints per Section 8. `GENESIS_INTERNAL_API_KEY` auth. Standard response envelope. |
| **MUST** | Follow-up sequences | Full cadence per Section 5. Already built — no regression from v3.2. |
| **MUST** | Inbound lead management | All entry points per Section 7. Website form wiring is immediate priority. |
| **SHOULD** | Add-on catalog admin | Admin manages add-ons: name, description, price, system type applicability, default checked state. |
| **SHOULD** | Comfort pro photo/avatar | Appears on proposal page. Uploaded in team settings. Professional headshot. |
| **SHOULD** | Pipeline analytics | Conversion rate, follow-up completion, per-comfort-pro metrics, avg days to close. |
| **COULD** | Gensco price feed | Auto-update equipment costs from Gensco supplier pricing. Phase 2. |
| **COULD** | Broadcast campaigns | Email blasts to customer segments. Phase 2. |
| **COULD** | Senior CP commission | +1% manager rate. Schema ready, UI in V2 when role is active. |
| **WON'T** | AI content generation | Phase 3. Command Layer handles AI content via its own Claude API access. |
| **WON'T** | Payment processing | Deposit collection handled in HCP. Out of scope permanently. |

---

## Section 10 — Domains & URLs

*Where everything lives*

| Subdomain | Purpose |
|-----------|---------|
| `app.genesishvacr.com` | Pipeline dashboard. Internal team access. CNAME to `genesis-pipeline.vercel.app`. |
| `proposals.genesishvacr.com` | Customer-facing proposal pages. Same Vercel deployment, different route. Critical — customer sees this URL. |
| `dashboard.genesishvacr.com` | Genesis Dashboard (when built). Separate Vercel deployment. |

**Action required before proposal flow goes live:** add CNAME records in Namecheap for `app.genesishvacr.com` and `proposals.genesishvacr.com` pointing to `genesis-pipeline.vercel.app`. Add both custom domains in Vercel project settings. 15-minute setup.

---

*Genesis Refrigeration & HVAC  •  Genesis Pipeline  •  PRD v4.0  •  February 2026  •  CONFIDENTIAL*
