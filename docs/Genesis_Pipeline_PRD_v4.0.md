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

The platform replaces the need for expensive tools like Mailchimp ($45–$350/month) or GoHighLevel ($97–$297/month) by leveraging open-source and low-cost services, while delivering HVAC-specific functionality those platforms lack.

### 1.2 Business Goals

- Recover lost estimate revenue by ensuring every estimate gets a complete, multi-channel follow-up sequence automatically.
- Total platform costs under $50/month base plus $10–50 variable for email/SMS volume and $5–10 for AI with usage caps.
- Give management visibility into the full estimate pipeline: who's following up, who's not, and what's converting.
- Enable broadcast marketing campaigns to the full customer base to drive repeat business and referrals.
- Build a foundation that could eventually replace more expensive platforms as Genesis scales.

### 1.3 Success Metrics

- 90%+ of estimates receive the full follow-up sequence (vs. current ad-hoc approach).
- Measurable improvement in estimate-to-job conversion rate within 90 days of launch.
- Comfort pros actively using the dashboard daily to manage their pipeline.
- First broadcast email campaign sent to segmented customer list within 30 days of pipeline MVP launch.
- First-month total spend under $100.

### 1.4 Core Problems Solved

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
| Admin | Wylee | Full access. Configures sequences, pricebook, financing plans, add-on catalog, commission tiers, team settings, company information (name, phone, email, website, address, license), and proposal terms/policies. Views all data across all comfort pros. Primary person setting up campaigns and automations. |
| Comfort Pro | Sales staff (currently 1, growing) | Primary daily user of the estimate pipeline. Sees only their assigned estimates and leads. Builds quotes in pricebook. Manages their follow-up queue: can snooze sequences per customer with notes, edit messages before auto-send, and mark call tasks as completed. Views their own commission dashboard. Receives real-time notifications when leads engage (open emails, click links, reply to SMS). Needs the system to be as simple as Housecall Pro — productive within 10 minutes of first use. |
| CSR | Office staff | Creates initial records when calls come in, can assign comfort pros to estimates. Creates and manages inbound leads from external sources (Facebook ads, Google ads, website forms) via the Leads tab — can update lead status, add notes, and move qualified leads to HCP with a single button click. Views inbox and unmatched SMS threads. Limited access — no campaign creation or settings management. |
| Senior CP (V2) | Future role | Manager commission (+1%) earned on their comfort pros' closed jobs. Schema supports this from day one. UI in V2. |
| Customers (indirect) | 5,000 residential HVAC clients in Monroe, WA area | Receive follow-up communications after estimates (email, SMS) and eventually broadcast marketing campaigns. Interact with branded proposal pages. Never log into the system. |

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
| Indoor / Outdoor / Cased Coil | Equipment sub-categories for tier-level grouping | Used in quote builder's 3-column tier comparison. |
| Labor | Standard install, complex install, new construction | Flat rates by job type. Admin-configurable. |
| Materials | Refrigerant, lineset, disconnect, pad | Unit cost items. Quantity set per estimate. |
| Add-Ons | Smart thermostat, air quality monitor, CO detector | Shown on proposal as optional checkbox items. Commission-eligible. |
| Service Plans | Genesis PM Plan (annual) | Always shown on proposal. Pre-checked. Recurring revenue. Commission-eligible. |
| Electrical | Panels, circuits, electrical work | Material-type items for electrical components. |
| Controls | Thermostats, zone controls, smart home | Material-type items for system controls. |
| Exclusion | Items explicitly excluded from scope | Service-type items. Shown on proposal to set scope expectations. |
| Equipment/Labor Warranty | Extended warranty options | Shown in tier comparison with warranty terms. |
| Maintenance Plan | PM plans, service agreements | Recurring revenue items. |

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
| 4 | Equipment options | One card per option. Tier name and tagline from `tier_metadata` (saved with estimate). **Feature bullets** shown as green checkmarks (marketing copy, e.g., "Up to 18 SEER2 efficiency"). **Equipment Included** condensed list below features (item names + spec lines, no prices). Price per toggle selection, rebate badge if applicable, "Most Popular" badge on `is_recommended` tier. "Select This Option" button. |
| 5 | Financing calculator | Shows when Monthly toggle active. Dropdown: Plan 930 (default), Plan 980, Plan 943, Pay in Full. Monthly payment updates in real time. Shows financed total, dealer fee, and cash savings. "Apply for Financing" opens Synchrony link. |
| 6 | Add-ons | "Recommended for Your System" section. Checkbox cards. PM Plan pre-checked. Others unchecked. Adding/removing updates calculator total in real time. |
| 7 | Payment schedule | Standard: 50% to schedule, 50% on completion. Large job (Remodel/New Con tag): 50% / 25% rough-in / 25% install complete / $1,000 pending inspection. Shown as visual timeline. |
| 8 | Why Genesis | 3-4 Google reviews (manually entered in Pipeline settings). Company story (editable text block). Team/install photo if available. |
| 9 | Signature block | Summary of selections (option, add-ons, financing plan, total, payment schedule). Customer name field. Signature canvas (draw, solid black pen on white background). Printed name shown under signature on PDF. Three disclosure checkboxes: Terms & Conditions (always), Labor Warranty (always), Financing (only when financing plan selected). All must be checked to enable "Approve Proposal" button. **Sticky bottom bar CTA is also disabled until all disclosures are checked** — clicking disabled CTA scrolls to the signature/terms section. |
| 10 | Footer | Genesis logo, phone, website, license number, comfort pro direct contact. All pulled from Company Settings (admin-configurable). |

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

Tax is **opt-in per estimate** — comfort pro toggles "Include tax" in the quote builder. When enabled, the rate is auto-looked up from the Washington State Department of Revenue address-based API: `https://webgis.dor.wa.gov/webapi/addressrates.aspx` using the customer's address. Rate is cached on the estimate record (`tax_rate`, `tax_amount`). Quote builder summary shows tax per tier. Proposal page displays tax when > 0.

- When tax is included: Customer sees Subtotal + Tax line + Total
- When tax is not included: Only total shown (flat rate)
- Commission is always calculated on pre-tax revenue — tax line is stripped before commission math
- Fallback: if WA DOR API is unavailable, use 9.2% with "Estimated tax rate" disclaimer
- Re-lookup button allows refreshing the rate if the address changes

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
| 0 | SMS + Email | Proposal sent notification. SMS: "Hi [name], this is [comfort pro] from Genesis. I just sent your estimate to [email] — you can view and approve it here: [link]." Branded email with "View Your Proposal" button. |
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
- **Snooze**: pauses entire sequence for customer for a comfort-pro-selected duration. Requires a note explaining the reason (e.g., "Customer waiting on financing approval, check back in 2 weeks").
- **Pause/Resume**: admin can pause all follow-ups for the sequence without losing step configuration. Yellow "follow-ups on hold" banner appears on estimate detail.
- **Auto-decline**: Admin-configurable threshold (default 60 days). A "declining soon" warning fires to the comfort pro 3 days before auto-decline. POSTs to HCP API to decline all options, keeping systems in sync.
- Sequence stops immediately when any option is approved or all options are declined.
- Admin can modify the default sequence template at any time. Changes apply in real-time to all estimates using that sequence — future/uncompleted steps reflect the new configuration, while historical events (sent, skipped, completed) are preserved as-is.

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
| **MUST** | Dark mode | Full dark mode support across all internal dashboard pages. Toggle in header with sun/moon icon. Persists preference to localStorage. Respects system color scheme on first visit. Already built. |
| **MUST** | Notifications | Real-time in-app alerts: email opened, link clicked, call task due, lead assigned, estimate approved/declined, declining soon, SMS received, unmatched SMS. Badge counter on dashboard. Already built. |
| **MUST** | Team management | Admin Team page to invite new users (email, name, phone, role), edit roles, activate/deactivate. Invite-based provisioning. Already built. |
| **MUST** | SMS inbox | Unmatched inbound SMS threads. Staff can reply, convert to lead, or dismiss. Already built. |
| **MUST** | HCP estimate polling | Cron-based polling of HCP API. Detects sent estimates, status changes. Manual "Update Estimates" button. Already built. |
| **MUST** | Admin delete & lead archiving | Admin can delete estimates/leads with cascade cleanup. Leads can be archived/unarchived. Already built. |
| **MUST** | Estimate options tracking | Track individual options with HCP option IDs for two-way approve/decline sync. Mark Won/Lost with option selection modal. Already built. |
| **MUST** | CSV import | Import estimates from HCP CSV export. Dedup on estimate_number. Already built. |
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

## Section 11 — Non-Functional Requirements

*Performance, security, and operational standards*

- **Performance:** Handle 5,000+ customers, sub-2-second page loads, real-time notification delivery via Supabase Realtime.
- **Security:** Google Workspace SSO only (no public access). Row Level Security on all tables. API keys stored in environment variables (Vercel/Supabase). HTTPS everywhere. Supabase service role key is server-only — never in client code.
- **Usability:** Responsive design for mobile use by field staff. Navigation simplicity comparable to Housecall Pro. Comfort pros should be productive within 10 minutes of first use.
- **Compliance:** Opt-out/unsubscribe links on all marketing emails. CAN-SPAM compliance for broadcasts. Follow-up sequences respect customer opt-out preferences. A2P 10DLC registration for business SMS compliance. Privacy policy and Terms pages at `/privacy` and `/terms`.
- **Scalability:** Free tiers initially. Upgrade path: Supabase Pro ($25/mo) for more storage; Vercel Pro ($20/mo) for more cron jobs and function invocations.
- **Reliability:** Sequence steps must execute even if the dashboard is not open. Cron jobs handle all scheduled work server-side. Cron validates sequence is still active and step still exists before sending — prevents sends after sequence is edited or paused.

---

## Section 12 — Risks & Dependencies

*Known risks and external requirements*

### 12.1 Risks

| Risk | Mitigation |
|------|-----------|
| Email deliverability | New sending domain (marketing@genesishvacr.com) needs warm-up period. Start with small batches, authenticate domain early (SPF/DKIM/DMARC), use Resend's deliverability tools. |
| Twilio A2P 10DLC registration | Required for business SMS compliance. First A2P campaign submission rejected (error 30896) — MESSAGE_FLOW opt-in description too vague. Resubmitted Feb 25, 2026 with detailed verbal consent script + web form opt-in path, consent logging, and call recording for audit. Without approval, US carriers silently drop outbound SMS (error 30034). |
| HCP API limitations | API does not expose customer-facing estimate URLs (opaque hash). `scheduled_start_min/max` filters by appointment date, not creation date. Date params `start_date/end_date` silently ignored. Mitigated by filtering in code. |
| Scope creep | Feature requests during build could delay MVP. Strict MoSCoW adherence — nothing outside "MUST" for each phase. |
| AI cost overruns (Phase 3) | Daily token caps tracked in database with manual fallback. |
| QBO OAuth token expiry | Refresh tokens expire if not used within 100 days. Commission confirmation cron runs daily, keeping tokens fresh. Fallback: admin re-authenticates via settings page. |

### 12.2 Dependencies

- **Accounts & API keys required:** Supabase, Vercel, Resend, Twilio, Housecall Pro API, GitHub, QuickBooks Online (for commission). Phase 3: Anthropic API.
- **Domain setup:** SPF, DKIM, DMARC records for genesishvacr.com must be configured before any email sends.
- **Custom domains:** CNAME records for `app.genesishvacr.com` and `proposals.genesishvacr.com` pointing to `genesis-pipeline.vercel.app`. Required before proposal flow goes live.
- **Housecall Pro:** Continued use as system of record for jobs, scheduling, and invoicing.
- **QuickBooks Online:** System of record for financials. Required for commission confirmation (invoice paid status).
- **Synchrony Financial:** Financing application link and plan codes. Not an API integration — link opens in new tab.

---

## Section 13 — Timeline & Milestones

*Build phases and success criteria*

### 13.1 Build Phases

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 0 | Pre-build setup (accounts, env, repo) | Complete |
| Phase 1 | Database schema, auth, RLS | Complete |
| Phase 2 | Backend API routes, cron jobs, webhooks | Complete |
| Phase 3 | Frontend dashboard, dark mode, all UI | Complete |
| Phase 4 | Deployment, E2E testing | In progress — blocked on A2P approval |
| Phase 5 | Team launch (onboard users, training) | Not started |
| Phase 6 | Pricebook & pricing tools | **Complete.** 6.1–6.5 (CRUD, import, markup, bulk), 6.6A–6.6D (schema, templates, quote builder, financing), 6.7 (HCP sync), 6.8 (WA DOR tax lookup). |
| Phase 7 | Proposal engine | **Complete.** 7.1 (proposal page), 7.2 (engagement tracking), 7.3 (signature + PDF + HCP writeback), 7.3b (unsent estimates), 7.4 (dashboard tracking), 7.5 (proposal polish), 7.6 (quote builder overhaul), 7.7 (QA fixes + proposal polish). |
| Phase 8 | Commission tracking (two-stage, QBO) | Not started |
| Phase 9 | Command Layer API (`/api/v1/` endpoints) | Not started |

See `docs/Build_Plan_Genesis_HVAC_v2_1.md` for detailed step-by-step instructions per phase.

### 13.2 Success Criteria

**MVP Launch (Phase 4 complete):** Functional pipeline dashboard. Every new estimate automatically enters the follow-up sequence. Comfort pro can manage their queue, snooze leads, and complete call tasks. SMS two-way working.

**30-Day Check (Phase 5 stable):** 90%+ of estimates receiving full sequence. Comfort pros using dashboard daily. First broadcast campaign sent. Total spend under $100.

**90-Day Check:** Measurable improvement in estimate conversion rate. Pipeline analytics informing sales process improvements. Marketing campaigns driving repeat business.

**v4.0 Milestone (Phases 6-9 complete):** Pricebook-built estimates, branded proposal pages with financing calculator and digital signature, two-stage commission tracking confirmed against QBO invoices, Command Layer API operational for cross-app orchestration.

---

## Section 14 — Version History

| Version | Date | Changes |
|---------|------|---------|
| v4.0 | Feb 2026 | Added pricebook, proposal engine, commission tracking, Command Layer API, financing calculator, WA DOR tax, QBO integration. |
| v3.2 | Feb 20 | Twilio Messaging Service for A2P compliance. Privacy/Terms pages. Inbox error display. |
| v3.1 | Feb 18 | Paused state UI, sent date fix, HCP pro link, execute skipped steps, option selection modal, admin SMS notifications. |
| v3.0 | Feb 18 | Full sequence timeline rewrite, Skip Step, sequence pause/resume. |
| v2.9 | Feb 18 | HCP polling accuracy fixes (sent detection, customer name, cents/100, sent date). |
| v2.8 | Feb 18 | HCP polling rewrite (correct API params, 5-page cap, pre-fetch index). |
| v2.7 | Feb 17 | Send Now, moved-to-HCP lead archiving, multi-option total fix, Vercel timeout fix. |
| v2.6 | Feb 17 | Manual Update Estimates, admin delete, lead archiving. |
| v2.5 | Feb 16 | Pipeline entry flow correction, HCP lead source sync. |
| v2.4 | Feb 15 | SMS Inbox for unmatched inbound messages. |
| v2.3 | Feb 15 | Admin team management with invite-based provisioning. |
| v2.2 | Feb 15 | Flow 2 leads, estimate links, dark mode. |
| v2.1 | Feb 14 | Twilio Hosted SMS, two-way messaging. |
| v2.0 | Feb 13 | Major revision — estimate pipeline focus, SMS integration. |
| v1.0 | Feb 13 | Initial draft. |

---

*Genesis Refrigeration & HVAC  •  Genesis Pipeline  •  PRD v4.0  •  February 2026  •  CONFIDENTIAL*
