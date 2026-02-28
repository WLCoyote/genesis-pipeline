# WEBHOOK_CONTRACTS.md

## Genesis Ecosystem — Webhook Event Contracts

**Last updated:** February 2026  
**Purpose:** Standard payload formats for app-to-app events. When Pipeline fires a "proposal signed" event, every consumer (Command Layer, Dashboard, future apps) knows exactly what the payload looks like.

---

## Webhook Envelope

All webhook events use the same envelope as API responses (Conventions Section 3), with an added `event` field in meta.

```json
{
  "data": { ... },
  "error": null,
  "meta": {
    "app": "pipeline",
    "version": "1.0",
    "timestamp": "2026-02-20T15:30:00Z",
    "event": "proposal.signed"
  }
}
```

**Rules:**
- `meta.event` is a dot-delimited string: `{resource}.{action}` (e.g., `proposal.signed`, `commission.confirmed`)
- `meta.app` identifies the source app
- `meta.timestamp` is when the event occurred (ISO 8601 UTC)
- `data` contains the event payload using shared field names from Conventions Section 4
- Webhooks are authenticated with `GENESIS_INTERNAL_API_KEY` in the `Authorization: Bearer` header

---

## Event Types

### Pipeline Events

#### `proposal.signed`

Fired when a customer signs a proposal.

```json
{
  "data": {
    "estimate_id": "est-abc-123",
    "hcp_job_number": "EST-2026-0042",
    "customer_name": "Sarah Martinez",
    "option_selected": "Premium Package",
    "total_amount": 12400,
    "signed_at": "2026-02-20T15:30:00Z",
    "comfort_pro_email": "mike@genesishvacr.com"
  },
  "error": null,
  "meta": {
    "app": "pipeline",
    "version": "1.0",
    "timestamp": "2026-02-20T15:30:00Z",
    "event": "proposal.signed"
  }
}
```

**Command Layer action:** Sends immediate Telegram alert to Wylee.

---

#### `proposal.opened`

Fired when a customer opens a proposal link for the first time.

```json
{
  "data": {
    "estimate_id": "est-abc-123",
    "hcp_job_number": "EST-2026-0042",
    "customer_name": "Sarah Martinez",
    "opened_at": "2026-02-20T14:22:00Z",
    "view_count": 1
  },
  "error": null,
  "meta": {
    "app": "pipeline",
    "version": "1.0",
    "timestamp": "2026-02-20T14:22:00Z",
    "event": "proposal.opened"
  }
}
```

---

#### `proposal.approaching_decline`

Fired when an estimate is within 3 days of auto-decline threshold.

```json
{
  "data": {
    "estimate_id": "est-abc-123",
    "hcp_job_number": "EST-2026-0042",
    "customer_name": "Tom Robertson",
    "total_amount": 8900,
    "days_until_decline": 3,
    "decline_date": "2026-02-23"
  },
  "error": null,
  "meta": {
    "app": "pipeline",
    "version": "1.0",
    "timestamp": "2026-02-20T09:00:00Z",
    "event": "proposal.approaching_decline"
  }
}
```

---

#### `commission.confirmed`

Fired when a comfort pro's commission is confirmed for a job.

```json
{
  "data": {
    "comfort_pro_name": "Mike Torres",
    "comfort_pro_email": "mike@genesishvacr.com",
    "hcp_job_number": "JOB-2026-0198",
    "customer_name": "Sarah Martinez",
    "commission_amount": 620,
    "job_total": 12400
  },
  "error": null,
  "meta": {
    "app": "pipeline",
    "version": "1.0",
    "timestamp": "2026-02-20T16:45:00Z",
    "event": "commission.confirmed"
  }
}
```

**Command Layer action:** Sends Telegram notification to Wylee.

---

#### `lead.created`

Fired when a new lead enters Pipeline (from website form, Retell AI, email routing, or manual entry).

```json
{
  "data": {
    "lead_id": "lead-xyz-789",
    "customer_name": "Sarah Chen",
    "customer_phone": "+14255551234",
    "customer_email": "sarah.chen@email.com",
    "source": "retell_ai",
    "summary": "No heat, furnace making clicking sound",
    "created_at": "2026-02-20T23:42:00Z"
  },
  "error": null,
  "meta": {
    "app": "pipeline",
    "version": "1.0",
    "timestamp": "2026-02-20T23:42:00Z",
    "event": "lead.created"
  }
}
```

---

### Inspection Events

#### `inspection.completed`

Fired when a tech submits a completed inspection.

```json
{
  "data": {
    "inspection_id": "insp-abc-456",
    "hcp_job_number": "JOB-2026-0201",
    "customer_name": "David Park",
    "score_pct": 62,
    "verdict_status": "needs_attention",
    "tech_email": "jason@genesishvacr.com",
    "completed_at": "2026-02-20T11:30:00Z"
  },
  "error": null,
  "meta": {
    "app": "inspect",
    "version": "1.0",
    "timestamp": "2026-02-20T11:30:00Z",
    "event": "inspection.completed"
  }
}
```

**Future Command Layer action:** Low score → auto-create Pipeline estimate for recommended repairs.

---

### Inventory Events *(planned)*

#### `inventory.low_stock`

```json
{
  "data": {
    "item_name": "Honeywell T6 Thermostat",
    "current_quantity": 1,
    "reorder_threshold": 3,
    "vehicle_name": "Van 1 - Mike"
  },
  "error": null,
  "meta": {
    "app": "inventory",
    "version": "1.0",
    "timestamp": "2026-02-20T17:00:00Z",
    "event": "inventory.low_stock"
  }
}
```

---

## Webhook Delivery

**Receiver endpoint:** `https://app.genesishvacr.com/api/command/events`  
**Method:** POST  
**Auth:** `Authorization: Bearer {GENESIS_INTERNAL_API_KEY}`

The Vercel receiver at this endpoint forwards event payloads to the Mac Mini agent, same pattern as Telegram webhook forwarding.

**Retry policy (future):** If the receiver returns non-200, retry 3 times with exponential backoff (1s, 5s, 30s). Not implemented in Phase 1 — events are fire-and-forget initially.

---

## Adding New Event Types

1. Choose a `resource.action` name following the pattern above
2. Define the `data` payload using shared field names from Conventions Section 4
3. Add it to this file with an example payload
4. Note what the Command Layer should do with it (if anything)
5. Implement the webhook fire in the source app
