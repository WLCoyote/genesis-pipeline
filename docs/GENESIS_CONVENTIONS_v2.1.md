# GENESIS_CONVENTIONS.md

## Cross-App Standards for the Genesis Software Ecosystem

**Version:** 2.1  
**Date:** February 2026  
**Scope:** All Genesis apps — Pipeline, Inventory, Inspection, Genesis OS, HVAC Guru, Intel  
**Also applies to:** Genesis AI Command Layer (Claude Agent SDK)

This document defines conventions that every Genesis app must follow. These conventions cost nothing to implement but prevent significant pain when apps need to communicate with each other — including communication with the Genesis AI Command Layer agent. Every repo should include a copy of this file. Every Claude instance working on a Genesis app should read it before making architectural decisions.

---

## 1. User Identity

**Email is the universal user identifier across all Genesis apps.**

Each app has its own Supabase Auth instance with its own UUIDs. These UUIDs are internal to each app and meaningless to other apps. When apps communicate, users are identified by email address.

### Rules:

- Every API endpoint that returns user-specific data must include the user's `email` field, not just their internal `user_id` UUID
- When logging actions that may be viewed cross-app (activity logs, audit trails), always store `user_email` alongside `user_id`
- Never assume a UUID from one app is valid in another app
- If a user's email changes, each app handles its own update — there is no central user directory (yet)

### Future:
When single sign-on is implemented (likely via Genesis OS as the auth hub), email will be the migration key used to link existing accounts across apps.

---

## 2. Housecall Pro Job Number

**The HCP job/estimate number is the universal foreign key for field operations.**

Pipeline, Inspection, and HVAC Guru all touch the same real-world jobs. Housecall Pro is the system of record for job identity. The HCP number is how Genesis OS (and any future integration) links data about the same job across multiple apps.

### Rules:

- Every app that captures job information must store the HCP job or estimate number in a queryable field
- Field name in the database can vary by app (Pipeline uses `estimate_number`, Inspection stores it in `job_info.jobNum`), but the **API response field** must always be `hcp_job_number` (see Section 4)
- When building API endpoints that return job-related data, always include `hcp_job_number` in the response
- If the HCP number is not available (e.g., a job not yet in Housecall Pro), the field should be `null`, not omitted

---

## 3. API Response Format

**Every Genesis app uses the same response envelope.**

When any app exposes an API endpoint — whether for cross-app communication, agent skill consumption, webhooks, or future external consumers — it uses this format:

```json
{
  "data": { ... },
  "error": null,
  "meta": {
    "app": "inspect",
    "version": "1.0",
    "timestamp": "2026-02-20T15:30:00Z"
  }
}
```

### Success response:
```json
{
  "data": {
    "inspection_id": "abc-123",
    "hcp_job_number": "EST-2026-0042",
    "score_pct": 94,
    "verdict_status": "running_well"
  },
  "error": null,
  "meta": {
    "app": "inspect",
    "version": "1.0",
    "timestamp": "2026-02-20T15:30:00Z"
  }
}
```

### Error response:
```json
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Inspection not found"
  },
  "meta": {
    "app": "inspect",
    "version": "1.0",
    "timestamp": "2026-02-20T15:30:00Z"
  }
}
```

### Rules:

- `data` is always the top-level key for the payload. It is an object or array on success, `null` on error
- `error` is `null` on success. On failure, it contains `code` (machine-readable string) and `message` (human-readable string)
- `meta.app` is a short identifier for the source app: `pipeline`, `inventory`, `inspect`, `os`, `guru`, `intel`
- `meta.version` is the API version (see Section 5)
- `meta.timestamp` is ISO 8601 UTC
- HTTP status codes are used correctly: 200 for success, 400 for bad request, 401 for unauthorized, 404 for not found, 500 for server error

---

## 4. Shared Field Names for API Responses

Internal database schemas are each app's own business. But when data leaves an app via API, these field names must be used for common concepts. This prevents every integration from becoming a mapping exercise.

### People & Users

| Concept | API Field Name | Type | Notes |
|---------|---------------|------|-------|
| User's email | `user_email` | string | Universal user identifier |
| User's display name | `user_name` | string | Full name as displayed |
| User's role in this app | `user_role` | string | App-specific role (admin, tech, supervisor, etc.) |
| Customer/homeowner name | `customer_name` | string | The end customer, not a Genesis employee |
| Customer email | `customer_email` | string | |
| Customer phone | `customer_phone` | string | |
| Customer address | `customer_address` | string | Full formatted address |

### Jobs & Work

| Concept | API Field Name | Type | Notes |
|---------|---------------|------|-------|
| HCP job/estimate number | `hcp_job_number` | string or null | The Housecall Pro identifier. Null if not linked. |
| Job date | `job_date` | string (ISO 8601) | Date the work was performed or scheduled |
| Job address | `job_address` | string | Service location |

### Equipment

| Concept | API Field Name | Type | Notes |
|---------|---------------|------|-------|
| Equipment make/manufacturer | `equipment_make` | string | e.g., "American Standard", "Mitsubishi" |
| Equipment model number | `equipment_model` | string | Manufacturer model number |
| Equipment serial number | `equipment_serial` | string | |
| System type | `system_type` | string | e.g., "conventional", "ductless", "refrigeration" |

### Status & Scoring

| Concept | API Field Name | Type | Notes |
|---------|---------------|------|-------|
| Percentage score | `score_pct` | integer (0-100) | |
| Status | `status` | string | App-specific status value |
| Created timestamp | `created_at` | string (ISO 8601 UTC) | |
| Updated timestamp | `updated_at` | string (ISO 8601 UTC) | |

### Rules:

- These field names apply **only to API responses** — not internal database columns
- If a field doesn't apply to your app, omit it from the response. Don't include it as `null` unless it's a field that sometimes has a value (like `hcp_job_number`)
- All timestamps are ISO 8601 in UTC
- All phone numbers include country code (e.g., `+14252619095`)
- Addresses are single formatted strings in API responses, even if stored as structured fields internally

---

## 5. API Versioning

**All cross-app API endpoints are versioned from day one.**

```
/api/v1/inspections/stats
/api/v1/estimates/summary
/api/v1/inventory/vehicle/{id}
```

### Rules:

- Every API endpoint intended for cross-app consumption starts with `/api/v1/`
- Internal-only endpoints (called by the app's own frontend) do not need versioning
- When a breaking change is needed, create `/api/v2/` and keep `/api/v1/` working until all consumers have migrated
- A breaking change is: removing a field, renaming a field, changing a field's type, or changing the response structure
- Adding new fields to an existing response is NOT a breaking change — consumers should ignore fields they don't recognize

---

## 6. API Authentication (App-to-App)

**Internal app-to-app calls use a shared API key.**

When Genesis OS calls Inspection's API, or when the AI Command Layer agent calls any app's API, it includes an API key in the request header:

```
Authorization: Bearer {GENESIS_INTERNAL_API_KEY}
```

### Rules:

- Each app that exposes cross-app endpoints stores an accepted API key as the environment variable `GENESIS_INTERNAL_API_KEY`
- All apps in the ecosystem — including the AI Command Layer agent — use the **same key** for internal communication. This is a single shared secret.
- The key is a randomly generated 64-character string, stored only in environment variables, never in code
- Every cross-app API endpoint must check for this key before returning data. No open endpoints.
- This key is separate from Supabase keys, Anthropic keys, and any other service keys
- If the key is compromised, rotate it across all apps and the agent simultaneously

### Endpoint authentication check (example):

```typescript
// In any cross-app API route
const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
if (apiKey !== process.env.GENESIS_INTERNAL_API_KEY) {
  return Response.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' }, meta: { ... } }, { status: 401 });
}
```

### Future:
When apps go SaaS and serve external customers, external API auth moves to per-customer API keys or OAuth. The internal Genesis key remains for app-to-app and agent-to-app communication.

---

## 7. Error Codes

**Standard error codes used across all apps.**

| Code | HTTP Status | Meaning |
|------|------------|---------|
| `BAD_REQUEST` | 400 | Request is malformed or missing required fields |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but not authorized for this action |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `CONFLICT` | 409 | Action conflicts with current state (e.g., duplicate) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Dependency is down (Supabase, Claude API, etc.) |

Apps can define additional app-specific error codes (e.g., `INSPECTION_NOT_COMPLETE`, `ESTIMATE_ALREADY_WON`) but the above codes are universal.

---

## 8. Date & Time

**All timestamps are ISO 8601 in UTC.**

```
2026-02-20T15:30:00Z
```

### Rules:

- Store as `TIMESTAMPTZ` in PostgreSQL (this is already the default in Supabase)
- Return as ISO 8601 with `Z` suffix in all API responses
- Never return local time in an API response — the consuming app handles timezone conversion for display
- Date-only fields (like `job_date`) use `YYYY-MM-DD` format: `2026-02-20`

---

## 9. App Identifiers

Each app has a short identifier used in API responses, logging, and any cross-app context:

| App | Identifier | Full Name |
|-----|-----------|-----------| 
| Pipeline | `pipeline` | Genesis HVAC Estimate Pipeline |
| Inventory | `inventory` | Genesis HVAC Inventory Tracker |
| Inspection | `inspect` | Genesis Maintenance Inspection Report App |
| Genesis OS | `os` | Genesis OS Business Operating System |
| HVAC Guru | `guru` | HVAC Guru Diagnostic Assistant |
| Intel | `intel` | Genesis Intel Agent |
| AI Command Layer | `agent` | Genesis AI Command Layer |

---

## 10. When These Conventions Apply

**Apply these conventions when:**
- Building any API endpoint that will be called by another Genesis app
- Building any API endpoint that the AI Command Layer agent will consume
- Building any API endpoint that could be exposed to external consumers in the future
- Logging data that may be queried cross-app (audit logs, activity feeds)
- Designing database fields that store references to concepts shared across apps (users, jobs, equipment)

**Don't worry about these conventions when:**
- Building internal frontend components
- Writing internal database queries
- Building API endpoints that are only called by the app's own frontend (though following the response format is still good practice)

---

## 11. AI Command Layer Integration

**The Genesis AI Command Layer agent is a first-class consumer of every app's API.**

The agent runs on a dedicated Mac Mini using the **Claude Agent SDK** (Python) and connects to apps through their cross-app API endpoints. It uses the same `GENESIS_INTERNAL_API_KEY` authentication and expects the same response envelope as any other Genesis app.

### Rules for app developers:

- **Every cross-app endpoint is automatically agent-accessible.** You do not build separate "agent endpoints." The agent calls the same `/api/v1/` endpoints that other apps call. If your API follows this conventions doc, the agent can consume it.
- **Return machine-parseable data.** The agent processes `data` from the standard response envelope. Avoid returning HTML fragments, markdown, or display-formatted strings in API responses. Return raw values and let the consumer (whether another app or the agent) format for display.
- **Summary endpoints are high value.** The agent's most common pattern is: get a summary, then drill into detail. If your app has a natural "summary" (pipeline value, overdue count, open inspections, low-stock alerts), expose it as a `/api/v1/{resource}/summary` or `/api/v1/{resource}/stats` endpoint.
- **Include counts and totals.** When returning lists, always include a `total_count` field in the response data so the agent can report "you have 4 open estimates" without having to count array items.
- **Date-range filtering.** Cross-app endpoints that return time-based data should accept `start_date` and `end_date` query parameters (ISO 8601 format). The agent uses these heavily for briefings ("what happened today," "this week's inspections").

### Agent tool → app endpoint mapping:

| Agent Tool | App | Endpoints Called |
|------------|-----|-----------------| 
| `pipeline_stats` | Pipeline | `GET /api/v1/estimates/stats` |
| `pipeline_stale` | Pipeline | `GET /api/v1/estimates/stale` |
| `estimate_detail` | Pipeline | `GET /api/v1/estimates/{id}` |
| `estimate_snooze` | Pipeline | `POST /api/v1/estimates/{id}/snooze` |
| `estimate_send_next` | Pipeline | `POST /api/v1/estimates/{id}/send-next` |
| `estimate_mark_status` | Pipeline | `POST /api/v1/estimates/{id}/status` |
| `leads_list` | Pipeline | `GET /api/v1/leads` |
| `lead_move_to_hcp` | Pipeline | `POST /api/v1/leads/{id}/move-to-hcp` |
| `commission_summary` | Pipeline | `GET /api/v1/commission/summary` |
| `inspect_stats` | Inspect | `GET /api/v1/inspections/stats` |
| `inspect_findings` | Inspect | `GET /api/v1/inspections/{id}/findings` |
| `hcp_schedule_today` | Housecall Pro | HCP REST API (external) |
| `qbo_revenue` | QuickBooks | QBO REST API (external) |
| `qbo_ar_aging` | QuickBooks | QBO REST API (external) |

### What each app should expose for the agent (minimum):

| App | Minimum Endpoints | Purpose |
|-----|------------------|---------|
| Pipeline | `GET /api/v1/estimates/stats` | Pipeline value, stage counts, close rate |
| Pipeline | `GET /api/v1/estimates/stale` | Estimates with no activity in 5+ days |
| Pipeline | `GET /api/v1/commission/summary` | Commission by comfort pro, current period |
| Inspect | `GET /api/v1/inspections/stats` | Pass rate, inspection count, common failures |
| Inspect | `GET /api/v1/inspections/{id}/findings` | Detailed findings for a specific inspection |
| Inventory | `GET /api/v1/inventory/summary` | Stock levels, low-stock alerts |
| Inventory | `GET /api/v1/inventory/vehicle/{id}` | What's on a specific truck |
| Dashboard | `GET /api/v1/snapshot` | Revenue, AR, team status summary |
| Genesis OS | `GET /api/v1/processes/{slug}` | Process/procedure lookup by slug |

These endpoints do not need to exist today. They are built when the agent tools are built. But when you build any new cross-app endpoint, follow this pattern.

---

## 12. Environment Variable Naming

**All Genesis apps follow a consistent env var naming pattern.**

Environment variables are grouped by service and follow a predictable naming scheme. This makes deploy configs, CLAUDE.md files, and onboarding predictable across all apps.

### Naming pattern:

```
{SERVICE}_{PURPOSE}
```

### Standard env vars (every Next.js app):

| Variable | Purpose | Scope | Notes |
|----------|---------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client + Server | Per-app Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Client + Server | Public — safe for browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Server only | Secret — never expose to client |
| `NEXT_PUBLIC_SITE_URL` | App's own deployed URL | Client + Server | Set after first deploy |

### Cross-app env vars:

| Variable | Purpose | Scope | Notes |
|----------|---------|-------|-------|
| `GENESIS_INTERNAL_API_KEY` | App-to-app + agent auth | Server only | Shared 64-char secret across all apps |

### Third-party service env vars:

| Variable | Purpose | Used By | Scope |
|----------|---------|---------|-------|
| `ANTHROPIC_API_KEY` | Claude Agent SDK | AI Command Layer | Server only |
| `TWILIO_ACCOUNT_SID` | Twilio account ID | Pipeline | Server only |
| `TWILIO_AUTH_TOKEN` | Twilio auth | Pipeline | Server only |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio Messaging Service | Pipeline | Server only |
| `TWILIO_PHONE_NUMBER` | Twilio sender number | Pipeline | Server only |
| `RESEND_API_KEY` | Resend email API | Pipeline | Server only |
| `HCP_API_KEY` | Housecall Pro API | Pipeline, AI Command Layer | Server only |
| `QBO_CLIENT_ID` | QuickBooks OAuth client | Dashboard, AI Command Layer | Server only |
| `QBO_CLIENT_SECRET` | QuickBooks OAuth secret | Dashboard, AI Command Layer | Server only |
| `RETELL_API_KEY` | Retell AI phone answering | AI Command Layer | Server only |
| `LEADS_WEBHOOK_SECRET` | Inbound lead webhook auth | Pipeline | Server only |
| `CRON_SECRET` | Vercel cron authentication | All Vercel apps | Server only |

### Rules:

- Never store secrets in code, config files, or git. Environment variables only.
- `NEXT_PUBLIC_` prefix = safe for browser exposure. Everything else is server-only.
- When adding a new third-party service, follow the pattern: `{SERVICE}_{PURPOSE}`
- Document every required env var in the app's CLAUDE.md under the Environment Variables section

---

## 13. Repository Standards

**Every Genesis repo includes these files at the root:**

| File | Purpose | Required |
|------|---------|----------|
| `CLAUDE.md` | AI context file — app identity, architecture, conventions, constraints | Yes |
| `GENESIS_CONVENTIONS.md` | This file — cross-app standards (copy, not symlink) | Yes |
| `README.md` | Human-readable project overview, setup instructions, deploy process | Yes |
| `.env.example` | Template of all required env vars with placeholder values | Yes |
| `.gitignore` | Standard ignore file (node_modules, .env, .next, etc.) | Yes |

### CLAUDE.md:

Every repo has a CLAUDE.md that follows the standard template. This file is the first thing any Claude instance reads when working on a Genesis app. It contains the app's identity within the ecosystem, its technical stack, its database schema summary, its API surface, its deploy configuration, and any app-specific rules or constraints.

### .env.example:

Every repo includes a `.env.example` with all required variables listed and placeholder values. This file is committed to git. Actual `.env` files are never committed.

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GENESIS_INTERNAL_API_KEY=your-64-char-key
```

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | February 20, 2026 | Initial conventions document |
| 2.0 | February 22, 2026 | Added Section 11 (AI Command Layer integration), Section 12 (env var naming), Section 13 (repository standards). Added `agent` to app identifiers. Updated auth section to include agent as consumer. |
| 2.1 | February 2026 | Updated Section 11: replaced OpenClaw with Claude Agent SDK as agent runtime. Updated app identifiers: removed AdForge, added Intel. Updated agent tool → endpoint mapping to reflect Pipeline v4.0 full tool inventory. Updated env vars: added RETELL_API_KEY, TWILIO_MESSAGING_SERVICE_SID, LEADS_WEBHOOK_SECRET. Updated HCP_API_KEY and QBO vars to reflect shared use by Pipeline and Command Layer. |
