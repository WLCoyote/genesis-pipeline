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

### **v2.1 Docs (kept as implementation reference)**

The v4.0 docs describe the full vision but are thinner on the already-built foundation. The v2.1 docs contain critical details not yet in v4.0: existing table schemas (`customers`, `messages`, `notifications`, `follow_up_events`, `campaigns`, `estimate_options`), HCP polling logic, Vercel self-fetch constraint, cost targets, success metrics, and non-functional requirements. Keep these until v4.0 docs are backfilled.

| Doc | Status |
| ----- | ----- |
| `docs/PRD_Genesis_HVAC_v2_1.md` | Kept — contains success metrics, non-functional requirements, risks, and implementation details not in v4.0 |
| `docs/Architecture_Genesis_HVAC_v2_1.md` | Kept — contains existing table schemas, HCP polling logic, internal API route details, and deployment constraints not in v4.0 |

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

---

## **Build Status**

### **Current Deployed Version: v3.2**

Phases 0–3 complete. Phase 4 in progress. v4.0 features (pricebook, proposals, commission, Command Layer API) are specced but not started.

| Phase | Focus | Status |
| ----- | ----- | ----- |
| Phase 0 | Pre-build setup | Complete |
| Phase 1 | Database & auth | Complete |
| Phase 2 | Backend API routes & cron jobs | Complete |
| Phase 3 | Frontend dashboard + dark mode | Complete |
| Phase 4 | Deployment & E2E testing | In progress — blocked on A2P campaign approval for outbound SMS |
| Phase 5 | Team launch | Not started |
| **v4.0** | **Pricebook, proposals, commission, Command Layer API** | **Specced — not started** |
| v0.2 | HCP webhooks, analytics | Future |
| Phase 2+ | Campaigns & segmentation | Future |
| Phase 3+ | AI, weather triggers | Future |
