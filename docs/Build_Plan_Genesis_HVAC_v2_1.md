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
- **Auto-fill price** from markup tier in real time when cost is typed in create/edit modal (equipment/material/addon only, not labor/service_plan)
- **Manual price flag** (`manual_price` column, sql/017): per-item opt-out from auto-pricing and bulk recalculation. Checkbox in create/edit modal.
- **Recalculate Pricebook** button on markup tiers page: bulk-updates unit_price for all active non-manual material-type items using current tiers. Confirmation dialog before running. (`POST /api/admin/pricebook/recalculate`)
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
- **Adaptive form fields by category**: create/edit modal shows only relevant fields per category group. Equipment shows system type, efficiency, refrigerant, manufacturer, specs. Parts shows manufacturer, supplier, part number. Labor/Service shows cost, price, UOM, taxable, commissionable. Warranty/Exclusion/Rebate show minimal fields. Universal fields (name, category, description, cost, price, subcategory, manual price, push to HCP, active) always visible. Implemented via `getVisibleFields()` in `PricebookManager.tsx`.
- API routes: `GET/POST /api/admin/pricebook/categories`, `GET/POST /api/admin/pricebook/suppliers`, bulk PUT extended with `action` routing (category, activate, deactivate, price_adjust, edit).

### Step 6.6A: Database Migrations — NOT STARTED

SQL migration `sql/018_quote_builder_schema.sql`:

**New tables:**
- `quote_templates` — name, description, system_type, created_by FK users, is_shared, is_active
- `quote_template_tiers` — template_id FK CASCADE, tier_number (1–3), tier_name, tagline, feature_bullets JSONB, is_recommended, image_url (Supabase Storage)
- `quote_template_items` — template_tier_id FK CASCADE, pricebook_item_id FK, quantity, is_addon, addon_default_checked, sort_order
- `estimate_line_items` — estimate_id FK CASCADE, pricebook_item_id FK, option_group (1–3), display_name, spec_line, description, quantity, unit_price, line_total, is_addon, is_selected, sort_order, hcp_option_id
- `financing_plans` — plan_code UNIQUE, label, fee_pct, months, apr, is_default, is_active, synchrony_url, display_order. Seed: Plan 930 (11.60%, 25mo, 0% APR, default), Plan 980 (8.70%, 37mo, 5.99%), Plan 943 (8.70%, 132mo, 9.99%)
- `proposal_engagement` — estimate_id FK, event_type CHECK, option_group, financing_plan, session_seconds, device_type, occurred_at. RLS: anon INSERT (public proposal page), authenticated SELECT via estimates join.
- `large_job_tags` — tag_name UNIQUE, is_active. Seed: "Remodel", "New Con"

**New columns on `estimates`:** proposal_token, proposal_sent_at, proposal_signed_at, proposal_signed_name, proposal_signature_data, proposal_signed_ip, proposal_pdf_url, selected_financing_plan_id FK, payment_schedule_type, tax_rate, tax_amount, subtotal, template_id FK.

**Types:** Add QuoteTemplate, QuoteTemplateTier, QuoteTemplateItem, EstimateLineItem, FinancingPlan, ProposalEngagement, LargeJobTag interfaces to `lib/types.ts`. Extend Estimate with new columns.

### Step 6.6B: Quote Templates CRUD — NOT STARTED

**API routes:**
- `GET/POST /api/admin/quote-templates` — list (shared + own) / create
- `GET/PUT/DELETE /api/admin/quote-templates/[id]` — full template with tiers + items / update / soft-delete
- `POST /api/admin/quote-templates/[id]/image` — upload tier system image to Supabase Storage bucket `system-images`

**Frontend:**
- `app/dashboard/admin/quote-templates/page.tsx` — server page
- `app/components/QuoteTemplateManager.tsx` — template list with search/filter, create/edit modal with 3 tier panels (name, tagline, feature bullets, is_recommended, image upload, pricebook item picker for tier items + addon items)

Templates are pre-built packages: 3 tiers (Good/Better/Best) each with equipment, labor, materials, and recommended add-ons. Any user can create templates. System images are per-tier (represent the package, not individual items).

### Step 6.6C: Quote Builder — COMPLETE

New page: `/dashboard/quote-builder` — BUILT.

Sections: customer lookup/create → template selector → 3 tier builders (name, tagline, feature bullets, pricebook items + quantities) → addon section → assignment → summary panel → "Create Quote" button. HCP sync runs non-blocking on quote creation.

**UX fixes + HCP sync restructure (completed Feb 28):**
1. **Toggle UX**: Restyled Equipment/Add-ons toggle as segmented tabs
2. **Quantity in picker**: Added qty input next to "+ Add" in the item picker table
3. **HCP sync restructure**: Summary service line item with full price at top, labor at $0, equipment/materials at $0 for documentation, financing line item with origination fee as cost. Uses `pricebook_items.hcp_type` for categorization.
4. **Tier names**: Defaults renamed to Standard Comfort / Enhanced Efficiency / Premium Performance (matching HTML reference)

**Workflow:** Pick a template to pre-populate tiers, or start from scratch. Everything editable. Prices snapshot from pricebook at creation time.

**API routes:**
- `GET /api/customers/search?q=` — search customers by name/email/phone
- `POST /api/quotes/create` — creates estimate + estimate_line_items + generates proposal_token (crypto.randomBytes 32 hex). Estimate number format: `GEN-{sequential}`

### Step 6.6D: Financing Plans CRUD — COMPLETE

**API routes:** `GET/POST /api/admin/financing-plans`, `PUT/DELETE /api/admin/financing-plans/[id]` — admin CRUD, editable table (MarkupTiersEditor pattern). Monthly payment formula: `financed_total = invoice / (1 - fee_pct)`, `monthly = financed_total / months`.

### Step 6.7: HCP Sync on Quote Creation — COMPLETE

`lib/hcp-estimate.ts`: `createHcpCustomer()`, `createHcpEstimate()`, `syncEstimateToHcp()`. Called at end of quote creation. If sync fails, Pipeline estimate still created — warning shown, manual retry via `POST /api/estimates/[id]/sync-hcp`. Structured format: summary service line item at top with full price, labor/materials at $0, financing line item with origination fee as cost.

### Step 6.8: WA DOR Tax Lookup — COMPLETE

`lib/tax.ts`: `getTaxRate(address, city, zip)` calls WA DOR API. Fallback: 9.2%. Timeout: 5s. API route: `GET /api/tax/lookup?address=&city=&zip=`.

---

## PHASE 7: Proposal Engine — IN PROGRESS

Interactive customer-facing proposal page. Design defined in `docs/genesis-proposal-interactive.html`. Dark navy/blue/orange theme with Barlow Condensed + Lato fonts.

### Step 7.1: Proposal Page — COMPLETE

New page: `app/proposals/[token]/page.tsx` — **no auth**, token-gated. Standalone layout (no DashboardShell). Dark theme always.

**Component directory: `app/components/proposal/`** — 8 components: ProposalPage, ProposalHeader, TierCards, AddonCards, FinancingCalculator, PaymentSchedule, WhyGenesis, SignatureBlock, StickyBottomBar. Tier names: Standard Comfort / Enhanced Efficiency / Premium Performance.

### Step 7.2: Engagement Tracking — **COMPLETE**

`POST /api/proposals/[token]/engage` — public, no auth. Events: page_open, option_view, calculator_open, plan_selected, addon_checked/unchecked, signature_started, signed. Session timing via visibilitychange + beforeunload using navigator.sendBeacon. Device type auto-detected from user-agent. All events wired into ProposalPage client component. Best-effort tracking — never blocks the customer experience.

### Step 7.3: Signature + PDF Generation + HCP Writeback — ✅ COMPLETE

**Prerequisites:** Install `@react-pdf/renderer`, create Supabase Storage bucket `proposal-pdfs`.

**Sign API:** `POST /api/proposals/[token]/sign` — public, no auth, token-gated. Body: `{ customer_name, signature_data, selected_tier, selected_addon_ids, selected_financing_plan_id }`. Critical DB write returns immediately; post-sign tasks run in `after()` (Next.js 16).

**Sign flow:**
1. Validate token → fetch estimate with line items, customer, user
2. Guards: already signed (409), expired/lost/dormant (410)
3. CRITICAL DB WRITE: update line items is_selected, calculate totals, update estimate (signature fields, status=won, amounts)
4. Return `{ ok: true }` immediately
5. `after()` fire-and-forget:
   - Record 'signed' engagement event
   - Generate PDF (`lib/proposal-pdf.ts`) → upload to Supabase Storage → update `proposal_pdf_url`
   - HCP writeback: approve selected option, decline others, upload PDF attachment, add note
   - Send confirmation email with PDF attachment (`lib/proposal-email.ts` via Resend)
   - Create notifications for assigned user + admins
   - Skip remaining follow-up sequence steps

**New files:**
- `lib/proposal-pdf.ts` — `generateProposalPdf()` using `@react-pdf/renderer` `renderToBuffer()`. Clean print-friendly format (white background), not dark theme. Layout: header, customer info, selected package table, addons, totals, payment schedule, signature image + name + date + IP, footer disclaimers.
- `lib/proposal-email.ts` — `sendProposalConfirmation()` calls Resend directly (not `/api/send-email`) for attachment support. Branded HTML + PDF attachment.

**HCP writeback functions added to `lib/hcp-estimate.ts`:**
- `approveHcpOption(optionId)` — `POST /estimates/options/approve`
- `declineHcpOptions(optionIds)` — `POST /estimates/options/decline`
- `uploadHcpAttachment(estimateId, optionId, pdfBuffer, filename)` — `POST /estimates/{id}/options/{option_id}/attachments` (multipart)
- `addHcpOptionNote(estimateId, optionId, content)` — `POST /estimates/{id}/options/{option_id}/notes`

**Fix prerequisite:** Store `hcp_option_ids` on `estimate_line_items` after HCP sync in both `quotes/create` and `estimates/[id]/sync-hcp` routes (column exists in sql/018 but IDs aren't saved yet).

**Proposal page update:** Add `proposal_pdf_url` to "already signed" screen as a download link.

**HCP writeback (post-send, Phase 7.3b — future):**
- When proposal is sent: add option note to HCP ("Proposal sent via Genesis Pipeline on {date}")

### Step 7.3b: Unsent Estimates (Draft Import from HCP) — ✅ COMPLETE

**Problem:** HCP polling only imported estimates that had been "submitted for signoff". Post-walkthrough estimates (unsent) were invisible in Pipeline — comfort pro had to manually enter customer info in the quote builder.

**Solution:**
- **SQL migration `019`:** Added `'draft'` to `estimates.status` CHECK constraint
- **HCP polling expanded:** `handleNewEstimate()` now imports unsent estimates as `status='draft'` instead of skipping. Auto-transitions `draft→active` when options get sent in HCP.
- **Estimates tab:** Pipeline/Unsent segmented tabs. Unsent tab shows draft estimates with customer name, address, HCP estimate #, and an orange "Build Quote" button.
- **Build Quote flow:** Button navigates to `/dashboard/quote-builder?estimate_id=xxx`. Server page fetches draft estimate + customer data, passes as `draftEstimate` prop. Customer fields pre-filled, assigned_to preserved.
- **Quote creation from draft:** `POST /api/quotes/create` detects `existing_estimate_id`, updates the existing draft (status→active, adds line items + proposal token) instead of creating a new estimate. Keeps the original HCP estimate number. Always syncs to HCP (creates new structured estimate with tier options so `hcp_option_ids` get stored for sign-time writeback).

### Step 7.4: Proposal Tracking in Dashboard — ✅ COMPLETE

**New components:**
- `ProposalEngagementPanel.tsx` — shows on estimate detail when proposal_token exists: total opens, time on page, most viewed tier, device type, financing interactions, addon toggles, incomplete signature alert, signed banner with PDF download, chronological event timeline
- `LineItemsView.tsx` — displays estimate_line_items grouped by option_group/tier (Standard Comfort / Enhanced Efficiency / Premium Performance). Shows addons separately with selected/not-selected state. Subtotal, tax, total breakdown.

**Modified:**
- Estimate detail page (`app/dashboard/estimates/[id]/page.tsx`):
  - Query fetches `estimate_line_items` and `proposal_engagement`
  - Dual data model: `LineItemsView` for Pipeline-built estimates, `OptionsList` for HCP-polled
  - `ProposalEngagementPanel` renders when `proposal_token` exists
  - "View Proposal" button in header (opens in new tab)
- Sequence template variables: replaced `{{estimate_link}}` with `{{proposal_link}}`, added `{{estimate_number}}`, `{{total_amount}}`, `{{customer_address}}`. Updated both `execute-sequences` cron and `send-next` routes. SQL migration `020` updates default templates.
- `SequenceEditor.tsx` insert buttons updated to match new variables

---

### E2E Bug Fixes (Post-7.4) — ✅ COMPLETE

First full end-to-end test revealed 6 bugs, all fixed:

1. **Sign endpoint 500:** `selected_tier` column missing from `estimates` table. Added via `sql/021_selected_tier.sql`.
2. **React #418 hydration error:** Proposal layout had nested `<html>` + `<body>` inside root layout. Removed duplicate tags, uses wrapper `<div>` with body style override instead.
3. **Signature canvas offset:** Canvas intrinsic width (600px) didn't match CSS width (100%). Added `ResizeObserver` to dynamically sync canvas dimensions to container.
4. **Financing % display:** `FinancingCalculator.tsx` showed raw decimal (0.0999%) instead of percentage (9.99%). Fixed with `(apr * 100).toFixed(2)`.
5. **Payment schedule text:** "Due at signing" changed to "Due when scheduled" in PaymentSchedule, SignatureBlock authorization text, and proposal PDF. Large job terms updated: 50% schedule, 25% rough-in, 25% install, $1,000 final inspection.
6. **Copy button no feedback:** Added "Copied!" state with green background toggle (2 seconds) to QuoteBuilder success screen.

**Also fixed:** Financing plan grid now supports up to 4 plans (was capped at 3).

Second E2E test revealed 3 more issues, all fixed:

7. **HCP writeback silent failure:** When building from a draft (Unsent tab), quote creation skipped HCP sync because `hcp_estimate_id` already existed. But without syncing, `hcp_option_ids` were never stored on `estimate_line_items`, so sign-time approve/decline/attach had nothing to target. Fix: always sync to HCP on quote creation — creates a new structured estimate with proper tier options.
8. **LineItemsView too verbose:** Showed every line item across all 3 tiers. Condensed to tier summary cards (name + subtotal). Accepted tier highlighted green with "Accepted" badge and expanded items; other tiers dimmed.
9. **No PDF download on estimate page:** "View Proposal" pointed to live proposal page even after signing (showing "Proposal Accepted" page). Fix: "View Proposal" only shows when unsigned; green "Download Signed PDF" button shows when `proposal_pdf_url` exists.

### Phase 7.5: Proposal Polish + Company Settings + Tax Toggle — ✅ COMPLETE

1. **Flat-rate PDF:** Removed individual line item prices. Items shown as bullet list (name + spec), only total displayed. Condensed layout targets 1-page output.
2. **Signature fix:** Changed canvas from `penColor="#fff" backgroundColor="transparent"` to `penColor="#000" backgroundColor="#ffffff"`. Signature was invisible on white PDF. Added printed name directly under signature on PDF.
3. **Company settings page:** Admin settings page expanded with Company Information section (7 fields: company_name, phone, email, website, address, license_number, license_state) and Proposal Terms section (4 textareas: authorization, labor_warranty, financing, cancellation). New `lib/company-settings.ts` with `getCompanyInfo()` and `getProposalTerms()` — reads from settings table with defaults. `sql/022_company_settings.sql` seeds initial values.
4. **Dynamic company info:** PDF and confirmation email now pull company name, phone, license, website from settings (not hardcoded). Settings API changed from `.update()` to `.upsert()` with `onConflict: "key"` to handle new keys.
5. **Disclosure checkboxes:** Three checkboxes on proposal page before signing — Terms & Conditions, Labor Warranty, Financing (conditional on financing plan selected). All must be checked to enable submit.
6. **"Get Pre-Approved" button:** Added to FinancingCalculator linking to Synchrony dealer page.
7. **Favicon:** Genesis mascot logo as `app/icon.png` + `app/apple-icon.png`.
8. **Phone/license fix:** Corrected to (425) 261-9095 and GENESRH862OP across all files.
9. **Tax toggle in quote builder:** Checkbox to include/exclude tax. Auto-lookups WA DOR rate using customer address. Shows rate, allows re-lookup. Sends `tax_rate` in create payload (API already supported it). Summary cards show tax + total with tax per tier.
10. **Edit estimates / lock signed:** "Edit Quote" button (amber) on estimate detail page for unsigned Pipeline estimates. Signed proposals show "Signed [date]" badge. Quote builder accepts non-draft estimates. Signed estimates redirect away from quote builder.

**Pending user feature requests (not yet built):**
- Tax toggle in quote builder — DONE (moved to Phase 7.5)
- Edit estimates / revise proposals — partially done (button + lock done; full tier/item pre-loading deferred to quote builder overhaul)

---

## PHASE 7.6: Quote Builder UI Overhaul — ✅ COMPLETE

Rewrites the quote builder from a vertical stacked form to a professional 3-column tier comparison view with persistent pricebook sidebar, live totals bar, step navigation, and full save/preview/send workflow. HTML mockup: `docs/genesis-quote-builder-ui.html`.

### Key Decisions
- **Steps bar**: Free navigation (5 steps: Customer → Build Tiers → Add-Ons → Financing → Review & Send)
- **Quick picks**: `is_favorite` boolean on pricebook_items, toggled from pricebook admin
- **Save/Send**: Save Draft + Preview + Send to Customer (3 buttons in topbar)
- **Categories**: Add Indoor, Cased Coil, Outdoor, Equipment Warranty, Labor Warranty, Maintenance Plan to DB. Existing categories stay. Empty categories hidden on proposal.
- **Financing in builder**: Live monthly per tier in totals bar using `cash / (1 - fee_pct) / months`

### Build Order
1. **Phase A**: ✅ DB migration `sql/023_quote_builder_overhaul.sql` — add `is_favorite` to pricebook_items, new categories, `category` on estimate_line_items
2. **Phase B**: ✅ Types + utils extraction into `app/components/quote-builder/types.ts` and `utils.ts`
3. **Phase C**: ✅ Layout shell — QuoteBuilder parent + Topbar + Steps + TotalsBar
4. **Phase D**: ✅ Step content — CustomerStep, TiersStep (3-column), AddonsStep, FinancingStep, ReviewStep
5. **Phase E**: ✅ PricebookPanel (right sidebar: search, tabs, favorites, items, tier target selector)
6. **Phase F**: ✅ Server page updates — expanded financing plan query (fee_pct, months, apr, is_default), added is_favorite to pricebook query, updated import path to new quote-builder/, removed page-level h1
7. **Phase G**: ✅ Draft save endpoint (`POST /api/quotes/draft`) — creates/updates draft estimates with line items + category. Updated `POST /api/quotes/create` to store `category` on line items + `selected_financing_plan_id` on estimate.
8. **Phase H**: ✅ PricebookManager favorites toggle — star ★ button per row, calls PUT endpoint with `is_favorite`

### Component Architecture (split from ~1100-line monolith)
```
app/components/quote-builder/
  types.ts, utils.ts
  QuoteBuilder.tsx (parent: state + handlers + layout)
  QuoteBuilderTopbar.tsx, QuoteBuilderSteps.tsx, QuoteBuilderTotalsBar.tsx
  QuoteBuilderCustomerStep.tsx (includes template selector)
  QuoteBuilderTiersStep.tsx (3-column tier cards, categorized items)
  QuoteBuilderAddonsStep.tsx, QuoteBuilderFinancingStep.tsx, QuoteBuilderReviewStep.tsx
  QuoteBuilderPricebookPanel.tsx (right sidebar)
```

---

## PHASE 7.7: Quote Builder QA Fixes + Proposal Polish — COMPLETE

First round of visual QA on the Phase 7.6 quote builder overhaul. 17 items identified, 15 actionable (2 deferred). Covers builder UX, tier metadata persistence, draft restoration, preview flow, proposal page fixes, and HCP sync corrections.

**Deferred items:**
- Editable proposal terms in builder (works for now via admin settings)
- HCP employee linkage (needs `hcp_employee_id` on users table + HCP employee API)

### SQL Migration: `sql/024_qb_qa_fixes.sql`
- `tier_metadata` JSONB column on `estimates` — stores tier names, taglines, feature bullets, is_recommended per tier
- 3 new pricebook categories: Electrical, Exclusion, Controls

### Phase 1: Quick Builder Fixes
- **1A**: ✅ Cost + profit margin in TiersStep — cost column per line item, tier-level margin summary (Cost · Margin · %)
- **1B**: ✅ Pricebook sidebar labels — `part_number` on PricebookItemSlim, subtitle shows model/part/spec instead of category, hover tooltip
- **1C**: ✅ New categories in utils.ts — Electrical, Exclusion, Controls added to CATEGORY_ORDER + CATEGORY_TABS
- **1D**: ✅ Tax toggle visible on step 2 (tiers) in addition to step 4 (financing)

### Phase 2: Tier Metadata + Feature Bullets
- **2A**: ✅ Save `tier_metadata` JSONB with estimates (draft + create endpoints)
- **2B**: ✅ Feature bullets editor in TiersStep — editable bullet list per tier with add/remove
- **2C**: ✅ Proposal page reads `tier_metadata` for tier names, taglines, is_recommended instead of hardcoded values
- **2D**: ✅ TierCards renders feature bullets (green checkmarks) + condensed "Equipment Included" list

### Phase 3: Draft Restoration (Edit loads empty fix)
- **3A**: ✅ Fetch `estimate_line_items` + `tier_metadata` when loading a draft in quote builder page
- **3B**: ✅ Reconstruct tiers from draft line items — group by `option_group`, merge with tier_metadata, restore financing/tax state

### Phase 4: Preview (Show Real Proposal)
- **4A**: ✅ Generate `proposal_token` on draft save (new drafts only)
- **4B**: ✅ Preview button saves draft first, then opens `/proposals/{token}` in new tab

### Phase 5: Proposal Page Fixes
- **5A**: ✅ Sticky bottom bar — CTA disabled until all disclosure checkboxes checked, scroll-to-terms on disabled click
- **5B**: ✅ View PDF button fix — PDF generation moved synchronous (before sign response); HCP/email/notifications remain in after()

### Phase 6: HCP Sync Fix
- **6A**: ✅ Already correctly uses `hcp_type` to distinguish materials vs services — no changes needed

### Files Modified
`sql/024_qb_qa_fixes.sql`, `utils.ts`, `types.ts`, `QuoteBuilder.tsx`, `QuoteBuilderTiersStep.tsx`, `QuoteBuilderPricebookPanel.tsx`, `page.tsx` (quote-builder), `route.ts` (quotes/draft), `route.ts` (quotes/create), `page.tsx` (proposals/[token]), `TierCards.tsx`, `ProposalPage.tsx`, `StickyBottomBar.tsx`, `route.ts` (sign), `lib/hcp-estimate.ts`

---

## PHASE 7.8: UI Polish + Rebates — COMPLETE

Post-deploy QA polish and rebate system. Pushed to GitHub (Vercel build triggered).

### Changes
1. **Removed QuoteBuilderTotalsBar**: Redundant navy header showing tier prices + "Send Proposal Link" — prices already visible on tier cards, "Send to Customer" already in top bar. Deleted `QuoteBuilderTotalsBar.tsx`.
2. **Dark navy sidebar**: Restyled global sidebar from white/gray to dark navy (`#0a1929`) with `#1a3357` borders, blue-tinted links. Matches Genesis brand.
3. **Expanded pricebook search**: Search now covers all fields — `display_name`, `manufacturer`, `model_number`, `part_number`, `spec_line`, `category`, `system_type`, `efficiency_rating`, `refrigerant_type`, `unit_of_measure`. Added `refrigerant_type` to `PricebookItemSlim` type and server query.
4. **Rebate system**: Pricebook-managed rebates per tier.
   - `RebateForm` type (`id`, `name`, `amount`) on `TierForm.rebates[]`
   - "Rebate" category added to pricebook (`sql/024`, `CATEGORY_ORDER`, `CATEGORY_TABS`)
   - Tier cards have a rebate picker dropdown pulling from pricebook items with `category === "rebate"`
   - Amount pre-fills from pricebook `unit_price`, editable per-tier
   - Rebates stored in `tier_metadata` JSONB, persisted on draft save + quote create
   - Rebates subtracted from totals everywhere: builder `calculateTierTotals`, proposal page, sign endpoint, draft/create `total_amount`
   - Proposal renders rebates as green discount lines with strikethrough original price

### Files Modified
`Sidebar.tsx`, `QuoteBuilderTotalsBar.tsx` (deleted), `QuoteBuilder.tsx`, `QuoteBuilderTiersStep.tsx`, `QuoteBuilderPricebookPanel.tsx`, `utils.ts`, `types.ts`, `page.tsx` (quote-builder), `route.ts` (quotes/draft), `route.ts` (quotes/create), `route.ts` (sign), `page.tsx` (proposals/[token]), `TierCards.tsx`, `ProposalPage.tsx`, `sql/024_qb_qa_fixes.sql`

---

## PHASE 7.9: UI Design System + Pricebook Overhaul — ✅ COMPLETE

Unified design system (Barlow Condensed + Lato typography, ds- color tokens, refined sidebar) and pricebook page decomposition from 2,187-line monolith to 8 focused components + 707-line orchestrator.

### Phase A: Shared Design Foundation
1. **Fonts**: Barlow Condensed (display headings: 500/700/800/900) and Lato (body text: 300/400/700) added via `next/font/google` in `layout.tsx`.
2. **CSS tokens**: 25+ design system tokens added to `@theme inline` in `globals.css` — `ds-` prefixed colors (blue, green, red, yellow, purple, orange, gray), sidebar color, text colors, shadows. `--font-display` and `--font-body` aliases.
3. **Sidebar**: Narrowed to 200px, `bg-ds-sidebar` (#0a1628), font-display logo with tracking, refined nav items (13px, white/50 default, blue active with left border). DashboardShell bg → `bg-ds-bg`.

### Phase B: Pricebook Page Decomposition
8 new components in `app/components/pricebook/`:

| Component | Lines | Purpose |
|---|---|---|
| `PricebookStats.tsx` | 78 | 5-column stat cards (total items, avg margin, margin alerts, HCP synced, manual price) |
| `PricebookMarginAlert.tsx` | 35 | Red alert banner when negative-margin items exist, links to margin filter |
| `PricebookToolbar.tsx` | 92 | Search + source filter + margin filter + show inactive toggle |
| `PricebookCategoryTabs.tsx` | 69 | Horizontal pill tabs with per-category item counts |
| `PricebookTable.tsx` | 271 | Table wrapper + thead + pagination (50/page) |
| `PricebookTableRow.tsx` | 250 | Color-coded margins, source badges, category tags, hover actions |
| `PricebookItemModal.tsx` | 548 | Create/edit item modal (extracted from monolith) |
| `PricebookBulkEditModal.tsx` | 212 | Bulk edit modal (extracted from monolith) |

**New features**: Source filter (All/HCP Material/HCP Service/Pipeline), Margin filter (All/Negative/Under 20%/20-40%/Over 40%), client-side pagination (50/page, auto-reset on filter change), stat cards row, margin alert banner, color-coded margin thresholds (green ≥40%, muted 20-40%, yellow 0-20%, red <0% with warning icon), category tag colors per row, hover-reveal action buttons.

### Files Modified
`layout.tsx`, `globals.css`, `Sidebar.tsx`, `DashboardShell.tsx`, `PricebookManager.tsx` (rewritten), `pricebook/page.tsx`. 8 new component files in `app/components/pricebook/`.

---

## PHASE 8.0: Estimates Page UI Overhaul ✅ COMPLETE

Applied the design system (fonts, ds- tokens, component decomposition pattern) from Phase 7.9 to the estimates page. Matches the HTML mockup at `docs/genesis-estimates-ui.html`.

### Component Decomposition
`EstimateTable.tsx` (471 lines) → orchestrator (185 lines) + 4 new components in `app/components/estimates/`:

| Component | Lines | Purpose |
|---|---|---|
| `EstimateStats.tsx` | 80 | 5 stat cards: Pipeline Value, Unsent Quotes, Won This Month, Avg Quote Value, Close Rate |
| `EstimateToolbar.tsx` | 177 | Pill tabs (Pipeline/Unsent/Won/Lost) + search + status/rep/time filters + result count |
| `EstimateTable.tsx` | 356 | Grid-based table (CSS grid, not `<table>`), pagination (10/page), mobile card fallbacks |
| `EstimateTableRow.tsx` | 269 | Pipeline + Unsent rows with gradient avatars, follow-up urgency chips, hover-reveal View/Resend actions |

### Key Features
- **Stat cards**: Real-time computed from estimate data (pipeline value, close rate over 90 days, avg quote value, won this month)
- **4 tab filters**: Pipeline (non-draft/won/lost), Unsent (draft), Won, Lost — acts as macro-filters
- **3 dropdown filters**: Status (admin), Rep (admin only), Time period (All Time/This Week/This Month/Last 90 Days)
- **Customer avatars**: Deterministic gradient colors from name hash (6 color options)
- **Follow-up urgency chips**: Overdue (red, >3 days), Today (orange, 3 days), Soon (yellow, 1-2 days), OK (green, <1 day or closed)
- **Hover-reveal actions**: View + Resend buttons on pipeline rows, Build Quote on unsent rows
- **Pagination**: 10 items/page with numbered pages, ellipsis, prev/next, auto-reset on filter change
- **StatusBadge updated**: ds- colors with status dot indicator (was pill-only)
- **UpdateEstimatesButton restyled**: ds-orange button with shadow

### Files Modified
`EstimateTable.tsx` (rewritten as orchestrator), `page.tsx` (topbar added), `StatusBadge.tsx` (ds- colors + dot), `UpdateEstimatesButton.tsx` (ds- styling). `EstimateFilters.tsx` deleted (replaced by EstimateToolbar). 4 new files in `app/components/estimates/`.

---

## PHASE 8.1: Commission Tracking — NOT STARTED

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
