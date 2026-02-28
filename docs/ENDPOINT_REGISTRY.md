# ENDPOINT_REGISTRY.md

## Cross-App API Endpoint Registry

**Last updated:** February 2026  
**Purpose:** Single source of truth for every `/api/v1/` endpoint across the Genesis ecosystem. The Command Layer agent, other apps, and any Claude instance building cross-app features should consult this file to know what's actually callable today.

**Status key:**
- 🟢 **Live** — deployed, tested, callable
- 🟡 **In Progress** — being built, not yet callable
- 🔴 **Planned** — specced but no code yet
- ⚪ **App Not Built** — the parent app doesn't exist yet

---

## Pipeline — `pipeline`

**Base URL:** `https://app.genesishvacr.com`  
**Auth:** `Authorization: Bearer {GENESIS_INTERNAL_API_KEY}`

| Endpoint | Method | Status | Purpose | Agent Tool |
|----------|--------|--------|---------|------------|
| `/api/v1/estimates/stats` | GET | 🔴 Planned | Pipeline value, stage counts, close rate MTD | `pipeline_stats` |
| `/api/v1/estimates/stale` | GET | 🔴 Planned | Estimates with no activity in 5+ days | `pipeline_stale` |
| `/api/v1/estimates/{id}` | GET | 🔴 Planned | Full estimate detail | `estimate_detail` |
| `/api/v1/estimates/{id}/snooze` | POST | 🔴 Planned | Snooze estimate with reason + resume date | `estimate_snooze` |
| `/api/v1/estimates/{id}/send-next` | POST | 🔴 Planned | Trigger next follow-up in sequence | `estimate_send_next` |
| `/api/v1/estimates/{id}/status` | POST | 🔴 Planned | Mark won/lost/declined | `estimate_mark_status` |
| `/api/v1/leads` | GET | 🔴 Planned | List open leads | `leads_list` |
| `/api/v1/leads/{id}/move-to-hcp` | POST | 🔴 Planned | Push lead to Housecall Pro | `lead_move_to_hcp` |
| `/api/v1/commission/summary` | GET | 🔴 Planned | Commission by comfort pro, current period | `commission_summary` |
| `/api/v1/pricebook` | GET | 🟢 Live | Read-only pricebook items (omits internal cost/HCP fields) | `pricebook_list` |

**Query params supported:** `start_date`, `end_date` (ISO 8601) on stats and summary endpoints. `category`, `search` on pricebook endpoint.

**Notes:** Pipeline is live but v1 cross-app endpoints need to be built. Internal app endpoints exist but don't follow the conventions envelope yet.

---

## Inspection — `inspect`

**Base URL:** `https://genesis-inspect.vercel.app`  
**Auth:** `Authorization: Bearer {GENESIS_INTERNAL_API_KEY}`

| Endpoint | Method | Status | Purpose | Agent Tool |
|----------|--------|--------|---------|------------|
| `/api/v1/inspections/stats` | GET | 🔴 Planned | Pass rate, inspection count, common failures | `inspect_stats` |
| `/api/v1/inspections/{id}/findings` | GET | 🔴 Planned | Detailed findings for specific inspection | `inspect_findings` |

**Query params supported:** `start_date`, `end_date` (ISO 8601) on stats endpoint.

**Notes:** Inspect app is live and conforms to conventions. Cross-app v1 endpoints to be built.

---

## Inventory — `inventory`

**Base URL:** `https://inventory-tracker-genesis.netlify.app`  
**Auth:** `Authorization: Bearer {GENESIS_INTERNAL_API_KEY}`

| Endpoint | Method | Status | Purpose | Agent Tool |
|----------|--------|--------|---------|------------|
| `/api/v1/inventory/summary` | GET | 🔴 Planned | Stock levels, low-stock alerts | `inventory_summary` |
| `/api/v1/inventory/vehicle/{id}` | GET | 🔴 Planned | What's on a specific truck | `inventory_vehicle` |

**Notes:** App is live but API surface hasn't been audited against conventions yet. Endpoints above are target — actual routes may differ after audit.

---

## Dashboard — `dashboard`

**Base URL:** `https://dashboard.genesishvacr.com`  
**Auth:** `Authorization: Bearer {GENESIS_INTERNAL_API_KEY}`

| Endpoint | Method | Status | Purpose | Agent Tool |
|----------|--------|--------|---------|------------|
| `/api/v1/snapshot` | GET | ⚪ App Not Built | Revenue, AR, team status summary | `dashboard_snapshot` |

---

## Genesis OS — `os`

**Base URL:** TBD  
**Auth:** `Authorization: Bearer {GENESIS_INTERNAL_API_KEY}`

| Endpoint | Method | Status | Purpose | Agent Tool |
|----------|--------|--------|---------|------------|
| `/api/v1/processes/{slug}` | GET | ⚪ App Not Built | Process/procedure lookup by slug | `os_process_lookup` |

---

## HVAC Guru — `guru`

**Base URL:** TBD  
**Auth:** `Authorization: Bearer {GENESIS_INTERNAL_API_KEY}`

| Endpoint | Method | Status | Purpose | Agent Tool |
|----------|--------|--------|---------|------------|
| TBD | — | ⚪ App Not Built | Equipment diagnostic history, failure patterns | TBD |

---

## Intel — `intel`

**Base URL:** TBD  
**Auth:** `Authorization: Bearer {GENESIS_INTERNAL_API_KEY}`

| Endpoint | Method | Status | Purpose | Agent Tool |
|----------|--------|--------|---------|------------|
| TBD | — | ⚪ App Not Built | Competitive intelligence, market data | TBD |

---

## How to Update This File

When you ship a new cross-app endpoint:
1. Change its status from 🔴 to 🟡 (in progress) or 🟢 (live)
2. Confirm the endpoint path, method, and query params match what's deployed
3. If the endpoint deviates from what was planned, update the row
4. Add the date you updated it in the "Last updated" field at top

When you add a new endpoint not listed here:
1. Add a new row to the appropriate app section
2. Follow conventions: `/api/v1/` prefix, standard response envelope, shared field names
3. Map it to an agent tool name if the Command Layer will use it
