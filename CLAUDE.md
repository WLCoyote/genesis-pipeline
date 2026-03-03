# **CLAUDE.md — Genesis Pipeline**

## **Identity**

Genesis Pipeline is the sales engine for Genesis Refrigeration & HVAC (Monroe, WA). It is part of the **Genesis Software Ecosystem** — a multi-app platform coordinated by an AI Command Layer. Pipeline's identifier in the ecosystem is `pipeline`.

**This app does three things:** estimate pipeline tracking, branded proposal generation, and sales automation with multi-channel follow-up sequences. It also handles inbound leads and comfort pro commission tracking.

---

## **Working Relationship**

**You are the CTO.** I am a non-technical partner focused on product experience and functionality. Your job is to:

* Own all technical decisions and architecture.
* Push back on ideas that are technically problematic — don't just go along with bad ideas.
* Find the best long-term solutions, not quick hacks.
* Think through potential technical issues before implementing.
* Prioritize scalability, security, and maintainability.
* Explain things in plain language. Assume I'm a non-technical founder.

---

## **Core Rules**

### **1\. Understand Before Acting**

* Think through the problem first. Read the codebase for relevant files.
* Never speculate about code you haven't opened.
* If a file is referenced, **READ IT FIRST** before answering.
* Give grounded, hallucination-free answers.

### **2\. Check In Before Major Changes**

* Before any major change, propose the approach and wait for my approval.
* "Major" \= new tables, new API routes, architecture changes, dependency additions, or anything that touches more than one module.

### **3\. Communicate Clearly**

* Provide a high-level explanation of what changed after every task.
* Keep explanations concise but informative.

### **4\. Simplicity Above All**

* Make every change as simple as possible.
* Every change should impact as little code as possible.
* When in doubt, choose the simpler solution.

### **5\. No YOLO Mode**

* Always plan before building. No rushing into code without verification.
* If context is unclear, ask clarifying questions before proceeding.
* Test after every change.
* Favor small, reusable components over monolithic code.
* Always include robust error handling and logging.

---

## **Checkpoint Protocol**

Context windows and Claude Code Max usage limits are finite. Auto-compact will trigger without warning and lose session context. Usage limits can cut a session short mid-task. **Always checkpoint manually before either happens.**

### **When to Checkpoint**

* **After every major deliverable** — a completed feature, a multi-file fix, a new API route, a rewritten component. Don't wait for a context signal — treat completion as the trigger.
* **After 3–4 small fixes in a row** — quick fixes stack up fast. If you've knocked out a batch of small changes, checkpoint before continuing.
* **Before switching to a new phase in the build plan**
* **After any major architectural decision or schema change**
* **Before ending a working session for the day**
* **When the user says "checkpoint"**

**Important:** Claude cannot see the context usage percentage. Do NOT rely on monitoring context %. Instead, checkpoint based on work completed. Heavy tool use (reading files, edits, TypeScript checks) burns context much faster than conversation — a session with 8+ file edits needs a checkpoint even if it feels short.

### **Usage Limit Awareness (Claude Code Max 5x)**

Claude Code Max has tiered usage limits:
* **Per-session:** Heavy tool use and long agentic runs consume session quota faster than conversation. Watch for slowdowns or usage warnings.
* **Weekly:** Usage resets on a weekly cycle — checkpoint at the end of each work session so the next session can pick up cleanly regardless of where the reset lands.
* **If a limit is hit mid-task:** Stop, run the full checkpoint sequence below, then wait for reset. Never leave docs out of sync because usage ran out.

### **How to Checkpoint**

When you see any trigger, stop what you're doing and run this full sequence **before** continuing, compacting, or ending the session:

1. **Update `docs/Build_Plan_Genesis_HVAC_v2_1.md`** — mark completed tasks, update current phase status, note what's next
2. **Update `docs/Genesis_Pipeline_PRD_v4.0.md`** — capture any scope changes, decisions, or feature clarifications made this session
3. **Update `docs/Genesis_Pipeline_Architecture_v4.0.md`** — document any schema changes, new routes, or structural decisions
4. **Update `CLAUDE.md`** — update the Build Status table to reflect current state, add any new Quick Guards discovered this session
5. **Git commit** — commit all code and doc changes with a message like `checkpoint: [brief description of session progress]`
6. **Run `/compact`** with a focused summary — example: `/compact Focus: completed Phase 6.3 pricebook bulk actions, next is Phase 6.5 quote builder. Key decisions: using server actions not API routes for quote saves.`

### **Manual Checkpoint Command**

If I say **"checkpoint"**, run the full sequence above without asking for specifics. Use your knowledge of what we accomplished this session to write accurate updates.

### **Compact Summary Format**

When running `/compact`, always include:
* What phase/task we just completed
* What's next
* Any key architectural decisions made this session
* Any unresolved blockers

---

## **Project Reference Docs**

These are the source of truth. **Read them before making decisions** — don't rely on memory or assumptions about the project.

### **Pipeline-Specific Docs**

| Doc | What it covers | When to reference |
| ----- | ----- | ----- |
| `docs/Genesis_Pipeline_PRD_v4.0.md` | Product requirements v4.0 — pricebook, proposal flow, commission tracking, follow-up sequences, inbound leads, Command Layer API surface | Before building any feature — confirm what it should do |
| `docs/Genesis_Pipeline_Architecture_v4.0.md` | Tech stack, full database schema, API routes, data flows, file structure, env vars | Before any database, API, or integration work |
| `docs/Build_Plan_Genesis_HVAC_v2_1.md` | Full build plan: Phase 0–5 (original build) + Phase 6–9 (v4.0 features). E2E checklist in Phase 4. | Before starting any new phase — follow the sequence |
| `docs/API_Routes.md` | Current internal API route map — external webhooks, cron jobs, dashboard routes, auth | Before adding/modifying API routes |

### **Ecosystem Docs (cross-app standards)**

| Doc | What it covers | When to reference |
| ----- | ----- | ----- |
| `docs/GENESIS_CONVENTIONS_v2.1.md` | Cross-app standards: response envelope, shared field names, auth, versioning, AI Command Layer integration | Before building any `/api/v1/` endpoint or cross-app feature |
| `docs/ENDPOINT_REGISTRY.md` | Registry of all `/api/v1/` endpoints across all Genesis apps with status | Before building Command Layer endpoints |
| `docs/ENV_MANIFEST.md` | Every env var across all apps + Command Layer | Before adding env vars or deploying |
| `docs/APP_DIRECTORY.md` | App identifiers, URLs, hosting, Supabase projects | Quick reference for the ecosystem |
| `docs/WEBHOOK_CONTRACTS.md` | Event payload formats for app-to-app webhooks | Before implementing cross-app events |
| `docs/SHARED_TYPES.ts` | TypeScript types for standard response envelope and shared fields | Import when building `/api/v1/` endpoints |

### **Keeping Docs Updated**

* When we change a feature, data model, or architectural decision, **update the relevant doc** to reflect the change.
* Add a brief note at the point of change describing what changed and why.
* If a decision contradicts something in the docs, flag it and update the doc after approval.
* Docs should always reflect the current state of the project, not the original plan.

---

## **Ecosystem Context**

Pipeline is one app in the Genesis Software Ecosystem. All cross-app communication follows `GENESIS_CONVENTIONS_v2.1.md`.

| App | ID | Status | URL |
| ----- | ----- | ----- | ----- |
| **Genesis Pipeline** | `pipeline` | Live (v3.2 deployed, v4.0 planned) | `genesis-pipeline.vercel.app` → `app.genesishvacr.com` |
| Genesis Inspection | `inspect` | Live | `genesis-inspect.vercel.app` |
| Genesis Inventory | `inventory` | Live | `inventory-tracker-genesis.netlify.app` |
| Genesis Dashboard | `dashboard` | Not built | `dashboard.genesishvacr.com` |
| Genesis OS | `os` | Not built | TBD |
| HVAC Guru | `guru` | Not built | TBD |
| Genesis Intel | `intel` | Not built | TBD |
| AI Command Layer | `agent` | Not built | Mac Mini (local) |

**Cross-app auth:** All `/api/v1/` endpoints use `Authorization: Bearer {GENESIS_INTERNAL_API_KEY}`. Same 64-char key across all apps and the Command Layer agent.

---

## **Quick Guards**

These come up often enough to call out explicitly:

* **Supabase service role key** is server-only. Never import it in client-side code.
* **Use the shared Supabase clients** in `lib/supabase/`. Don't create new instances.
* **RLS is on for every table.** Don't bypass it unless you're in a server-side API route using the service role client.
* **`.env.local` is in `.gitignore`.** Verify this. Never commit API keys.
* **`estimates.estimate_number` has a unique constraint.** Always use `ON CONFLICT` for imports.
* **Cross-app endpoints** use `/api/v1/` prefix, `GENESIS_INTERNAL_API_KEY` auth, and standard `{data, error, meta}` response envelope. See `GENESIS_CONVENTIONS_v2.1.md`.
* **Internal dashboard endpoints** do NOT need `/api/v1/` prefix or the conventions envelope. They use Supabase Auth sessions.
* **Use the shared UI components** in `app/components/ui/` (Button, PageTopbar, Card, SectionHeader, StatCard, Modal, FormField + inputCls/selectCls/textareaCls). Don't duplicate inline patterns that already have a component.

---

## **Build Status**

### **Current Deployed Version: v3.2**

Phases 0–3 complete. Phase 4 in progress. Phase 6 complete. Phase 7 complete (including 7.6 quote builder overhaul, 7.7 QA fixes, 7.8 UI polish + rebates, 7.9 design system + pricebook decomposition). Phase 8.0 complete (estimates list UI overhaul). Phase 8.1A complete (estimate detail page UI overhaul). Phase 8.1B complete (sequences page UI overhaul + decomposition). Phase 8.2 complete (polish, restructure, notifications, ds- consistency pass including Quote Builder, Outfit font weight refinement). Phase 8.3 complete (design system component library — 7 reusable UI components, 45+ files refactored). Phase 8.5 complete: 8.5A complete, 8.5F complete, 8.5B complete, 8.5D complete, 8.5C complete, 8.5E complete. E2E bug fixes done (sql/021). HCP writeback fixed for draft flow. sql/023–026 run in Supabase. sql/027 created (needs run in Supabase). sql/028 run in Supabase.

| Phase | Focus | Status |
| ----- | ----- | ----- |
| Phase 0 | Pre-build setup | Complete |
| Phase 1 | Database & auth | Complete |
| Phase 2 | Backend API routes & cron jobs | Complete |
| Phase 3 | Frontend dashboard + dark mode | Complete |
| Phase 4 | Deployment & E2E testing | In progress — blocked on A2P campaign approval for outbound SMS |
| Phase 5 | Team launch | Not started |
| Phase 6.1–6.5 | Pricebook CRUD, HCP import/sync, markup tiers, labor calc, manual price flag, bulk recalculate from tiers, bulk actions, cascading nav, dynamic categories, suppliers, bulk edit, refrigerant indicators, rich HCP descriptions, adaptive form fields by category | **Complete** |
| Phase 6.6A | Database migrations (quote templates, estimate line items, financing plans, proposal engagement, large job tags + estimate columns) | **Complete** |
| Phase 6.6B | Quote templates CRUD (admin/user template management) | **Complete** |
| Phase 6.6C | Quote builder page (customer lookup, template/item selection, tier builder, create estimate) | **Complete** — segmented tabs, qty picker, HCP sync restructure done |
| Phase 6.6D | Financing plans CRUD | **Complete** |
| Phase 6.7 | HCP sync on quote creation (lib/hcp-estimate.ts, sync on quote create, manual retry endpoint) | **Complete** |
| Phase 6.8 | WA DOR tax lookup (lib/tax.ts, GET /api/tax/lookup) | **Complete** |
| Phase 7.1 | Proposal page (token-gated public page, dark theme, tier cards, addons, financing calculator, signature block, sticky bottom bar) | **Complete** |
| Phase 7.2 | Engagement tracking (POST /api/proposals/[token]/engage, session timing, all event types wired into ProposalPage) | **Complete** |
| Phase 7.3 | Signature + PDF generation + HCP writeback (sign endpoint, PDF via @react-pdf/renderer, Supabase Storage, HCP approve/decline/attach/note, confirmation email, notifications, skip follow-ups) | **Complete** |
| Phase 7.3b | Unsent estimates — HCP polling pulls drafts, Pipeline/Unsent tabs on estimates page, Build Quote button pre-loads customer into quote builder, draft→active on quote creation | **Complete** |
| Phase 7.4 | Proposal tracking in dashboard (ProposalEngagementPanel, LineItemsView, dual data model, View Proposal button, sequence template variables updated) | **Complete** |
| Phase 7.5 | Proposal polish — flat-rate PDF, signature fix (black pen), company settings page, disclosure checkboxes, Synchrony pre-approval button, favicon, dynamic terms/company info | **Complete** |
| Phase 7.6 | Quote builder UI overhaul — 3-column tiers, steps bar, live totals bar, pricebook sidebar panel, save draft/preview/send, category restructure, favorites | **Complete** — all 8 phases (A-H) done. 12 components, draft endpoint, favorites toggle. Needs sql/023 run in Supabase. |
| Phase 7.7 | Quote builder QA fixes + proposal polish — cost/margin display, tier metadata persistence, feature bullets, draft restoration, preview flow, proposal terms gating, PDF URL fix, HCP sync fix | **Complete** — sql/024 migration, 6 sub-phases, 15 files modified |
| Phase 7.8 | UI polish + rebates — removed redundant totals bar, dark navy sidebar, expanded pricebook search (all fields), pricebook-managed rebates per tier (picker, stored in tier_metadata, subtracted from totals, shown on proposal) | **Complete** |
| Phase 7.9 | UI design system + pricebook overhaul — Outfit + Lato fonts, ds- color tokens, sidebar 200px, PricebookManager decomposed to 8 components + orchestrator, stat cards, margin alerts, source/margin filters, pagination | **Complete** |
| Phase 8.0 | Estimates page UI overhaul — stat cards, pill tabs (Pipeline/Unsent/Won/Lost), grid table with avatars + urgency chips + hover actions, pagination, rep/time/status filters, EstimateTable decomposed to 4 components | **Complete** |
| Phase 8.1A | Estimate detail page UI overhaul — topbar, flex layout with 320px right rail, timeline connectors (channel-colored circles + lines), ds- restyled: FollowUpTimeline, EstimateActions, CustomerInfo (avatar), ConversationThread, LineItemsView (green accepted tier), ProposalEngagementPanel (signed badge + stats grid), OptionsList, ExecuteStepButton, SnoozeForm, EditMessageForm | **Complete** |
| Phase 8.1B | Sequences page UI overhaul — SequenceEditor decomposed to 4 components (SequenceHeader, SequenceTokenBar, SequenceStepCard, SequenceAddStep), timeline connectors, channel-colored step cards, shared token bar, add-step with channel options | **Complete** |
| Phase 8.2 | Polish, restructure & notifications — font swap (Outfit), Outfit weight refinement (400/600 strategy), estimate detail scroll fix, customer address mapping, leads simplification, analytics dashboard, import→settings, HCP category paths, team edit fields, notification system, ds- consistency pass (all pages including Quote Builder) | **Complete** — sql/025 + sql/026 run in Supabase |
| Phase 8.3 | Design system component library — 7 reusable UI components (Button, PageTopbar, Card, SectionHeader, StatCard, Modal, FormField) in `app/components/ui/`, swapped across 45+ files. No visual changes. | **Complete** |
| Phase 8.5A | Proposal polish + branding — monthly payment hero, sticky footer fix, Veteran Owned badge, friendship tagline, bottom bar totals swap | **Complete** |
| Phase 8.5F | Address fix (data issue, no code) + Google 403 (config, not code) | **Complete** |
| Phase 8.5B | Proposal logic — per-tier add-ons, cash/financing choice at signature, equipment visibility toggle (eye icon), sql/027 migration | **Complete** — sql/027 needs run in Supabase |
| Phase 8.5D | Leads & permissions — Lead→Build Quote (pre-fill from lead), admin-only deletes (tightened template DELETE + UI guard), CSR email CC (notification_cc_emails setting + Resend CC) | **Complete** |
| Phase 8.5C | Variable tiers (1-5 options) + badge label customization — dynamic grid, add/remove tier, badge_label/show_badge in tier_metadata, sql/028 migration | **Complete** — sql/028 run in Supabase |
| Phase 8.5E | Accessibility — browser zoom fix (overflow-x-auto wrappers, title tooltips on truncated text), font size toggle (S/M/L in sidebar, localStorage, html class) | **Complete** |
| Phase 8.4 | Commission tracking (two-stage, QBO) | Not started |
| Phase 8.5-old | Commission dashboard | Not started |
| Phase 9 | Command Layer API (`/api/v1/` endpoints) | Not started |
| v0.2 | HCP webhooks, analytics | Future |
| Phase 2+ | Campaigns & segmentation | Future |
| Phase 3+ | AI, weather triggers | Future |

### **Pending Feature Requests**

| Feature | Notes |
| ----- | ----- |
| ~~Tax toggle in quote builder~~ | **Done** (Phase 7.5) |
| ~~Edit estimates / revise proposals~~ | **Done** (Phase 7.5 — edit button + lock signed) |
| ~~Quote builder UI overhaul~~ | **Done** (Phase 7.6) — 3-column tiers, steps bar, live totals, pricebook panel, save draft/preview/send |
| ~~Quote builder line item category restructure~~ | **Done** (Phase 7.6) — Indoor, Cased Coil, Outdoor, Equipment Warranty, Labor Warranty, Maintenance Plan |
| ~~Quote builder QA + proposal polish~~ | **Done** (Phase 7.7) — cost/margin, tier metadata, feature bullets, draft restore, preview, terms gating, PDF fix |
| ~~Rebates on proposals~~ | **Done** (Phase 7.8) — pricebook "Rebate" category, per-tier picker, subtracted from totals, green discount lines on proposal |
| ~~Adaptive pricebook form fields~~ | **Done** (Phase 6.5) — form adapts to category: Equipment shows all specs, Parts hides system type, Labor/Service/Warranty/Exclusion/Rebate show minimal fields. Universal: name, category, description, cost, price, subcategory, manual price, push to HCP, active. |
| ~~Pricebook UI overhaul~~ | **Done** (Phase 7.9) — decomposed 2187-line monolith to 8 components, added stat cards, margin alerts, source/margin filters, pagination, design system tokens, Barlow Condensed + Lato fonts |
| ~~Estimates page UI overhaul~~ | **Done** (Phase 8.0) — decomposed 471-line EstimateTable to 4 components, stat cards, pill tabs, grid table with avatars/urgency/hover actions, pagination, rep/time filters |
| ~~Estimate detail page UI overhaul~~ | **Done** (Phase 8.1A) — topbar, flex layout with 320px right rail, timeline connectors, ds- restyled 11 components (FollowUpTimeline, EstimateActions, CustomerInfo w/ avatar, LineItemsView, ProposalEngagementPanel, etc.) |
| ~~Sequences page UI overhaul~~ | **Done** (Phase 8.1B) — SequenceEditor decomposed to 4 components, timeline connectors, channel-colored step cards, shared token bar, add-step with channel options |
| ~~Font upgrade (Outfit)~~ | **Done** (Phase 8.2A1) — replaced Barlow Condensed with Outfit geometric sans-serif |
| ~~Estimate detail scroll fix~~ | **Done** (Phase 8.2A2) — independent column scrolling, no auto-scroll on load |
| ~~Customer address fix~~ | **Done** (Phase 8.2A3) — HCP polling now maps estimate.address to customers.address |
| ~~Leads page simplification~~ | **Done** (Phase 8.2B1) — removed estimates tab, leads-only with ds- styling |
| ~~Analytics dashboard~~ | **Done** (Phase 8.2B2) — replaced Overview with 4-section analytics (stats, activity, rep performance, feed) |
| ~~Import to Settings~~ | **Done** (Phase 8.2B3) — HCP pricebook sync + CSV import moved to Settings, full-sync endpoint added |
| ~~HCP category paths~~ | **Done** (Phase 8.2B4) — hcp_category_path column, BFS path building, stored on import/sync |
| ~~Team edit fields (email, phone)~~ | **Done** (Phase 8.2C1) — 3-column edit grid (email, phone, role) in TeamMemberList |
| ~~Notification system (email alerts)~~ | **Done** (Phase 8.2C2) — preferences table, Resend dispatcher, branded email templates, settings UI, wired into sign + status endpoints |
| ~~ds- design system consistency pass~~ | **Done** (Phase 8.2) — all pages updated with ds- topbars + tokens (Quote Builder completed post-8.2) |
| ~~Quote Builder ds- token pass~~ | **Done** (post-8.2) — 9 components updated: bg-ds-card, border-ds-border, font-display text-ds-text, replaced inline fontFamily + gradient |
| ~~Outfit font weight refinement~~ | **Done** (post-8.2) — 45 files, 70 elements: titles → font-semibold (600), subheaders/names → font-normal (400) |
| ~~Design system component library~~ | **Done** (Phase 8.3) — 7 components in `app/components/ui/`: Button (7 variants × 4 sizes), PageTopbar, Card, SectionHeader, StatCard, Modal, FormField + inputCls/selectCls/textareaCls constants. Swapped across 45+ files. |
| ~~Monthly payment hero number~~ | **Done** (Phase 8.5A) — Monthly at 46px, cash at 16px on tier cards + bottom bar |
| ~~Sticky footer fix~~ | **Done** (Phase 8.5A) — position: fixed + spacer |
| ~~Veteran Owned badge~~ | **Done** (Phase 8.5A) — WhyGenesis 6 cards, 3-col grid |
| ~~Per-tier add-ons~~ | **Done** (Phase 8.5B) — addonsByTier map, reset on tier switch |
| ~~Cash vs Financing choice~~ | **Done** (Phase 8.5B) — payment_method toggle in SignatureBlock |
| ~~Equipment visibility toggle~~ | **Done** (Phase 8.5B) — show_on_proposal per item, eye icon in builder |
| ~~Lead → Build Quote (skip HCP)~~ | **Done** (Phase 8.5D) — LeadCard button, lead fetch + pre-fill in QB page |
| ~~Admin-only deletes audit~~ | **Done** (Phase 8.5D) — template DELETE tightened to admin-only, UI button hidden for non-admin |
| ~~CSR new lead email CC~~ | **Done** (Phase 8.5D) — notification_cc_emails setting, CC on all notification emails via Resend |
| ~~Variable tier count (1-5)~~ | **Done** (Phase 8.5C) — dynamic tier add/remove, 1-5 options, sql/028 widens CHECK to 1-10 |
| ~~Badge label customization~~ | **Done** (Phase 8.5C) — editable badge text per tier, show/hide toggle, stored in tier_metadata JSONB |
| ~~Browser zoom fix~~ | **Done** (Phase 8.5E) — overflow-x-auto on tables/grids, title tooltips on truncated text, min-width guards |
| ~~Font size toggle (S/M/L)~~ | **Done** (Phase 8.5E) — S/M/L toggle in sidebar, html class + localStorage, 14px/16px/18px scale |
| Install materials builder | Pricebook tool to bundle install materials |
| Maintenance plan builder | Service plans, subscriptions |
| Configurable payment terms | 50/50 default, 4-payment option, configurable in quote builder |
