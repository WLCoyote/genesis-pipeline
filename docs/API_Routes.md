# Genesis Pipeline API Routes

## Externally Callable (webhooks — accept outside traffic)

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/webhooks/twilio` | POST | Twilio signature validation | Inbound SMS from customers |
| `/api/webhooks/resend` | POST | Resend webhook signature | Email open/click/bounce events |
| `/api/leads/inbound` | POST | Bearer token (`LEADS_WEBHOOK_SECRET`) | Inbound leads from Zapier, Facebook, Google, website forms |

## Cron Jobs (Vercel-triggered, server-only)

| Route | Method | Auth | Schedule (UTC) | Purpose |
|-------|--------|------|----------------|---------|
| `/api/cron/execute-sequences` | GET | `CRON_SECRET` header | 7x daily (every 2hrs) | Sends due follow-up steps (email/SMS/call tasks) |
| `/api/cron/poll-hcp-status` | GET | `CRON_SECRET` header | 3x daily | Polls HCP API for new/updated estimates |
| `/api/cron/auto-decline` | GET | `CRON_SECRET` header | 1x daily | Declines estimates past the auto-decline threshold |

## Internal — Dashboard API (authenticated frontend calls only)

### Estimates

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/estimates/[id]` | GET | Fetch single estimate with options, events, messages |
| `/api/estimates/[id]` | DELETE | Admin delete estimate (cascades options, events, notifications) |
| `/api/estimates/[id]/status` | POST | Mark won/lost with option selection (`{ action, selected_option_ids }`) |
| `/api/estimates/[id]/reassign` | POST | Reassign estimate to different comfort pro |
| `/api/estimates/[id]/snooze` | POST | Snooze/unsnooze follow-up sequence |
| `/api/estimates/[id]/send-next` | POST | Send next due sequence step immediately (bypasses edit window) |
| `/api/estimates/[id]/skip-step` | POST | Skip current sequence step without sending |
| `/api/estimates/[id]/execute-step` | POST | Execute a previously skipped step |
| `/api/estimates/create` | POST | Create estimate manually |

### Leads

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/leads` | GET | List all leads |
| `/api/leads` | POST | Create lead manually |
| `/api/leads/[id]` | PATCH | Update lead (status, notes, details) |
| `/api/leads/[id]` | DELETE | Admin delete lead |
| `/api/leads/[id]/move-to-hcp` | POST | Create customer + estimate in HCP, mark lead converted |

### Messaging

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/send-sms` | POST | Send SMS to a customer (from estimate detail conversation thread) |
| `/api/send-email` | POST | Send email via Resend |
| `/api/inbox` | GET | Fetch unmatched SMS threads grouped by phone number |
| `/api/inbox` | POST | Reply to an inbox thread (calls Twilio directly) |
| `/api/inbox` | PATCH | Dismiss an inbox thread |

### Follow-up Events

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/follow-up-events/[id]` | PATCH | Edit pending event content, mark call task complete |

### Admin

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/update-estimates` | POST | Manual trigger for HCP polling (same logic as cron) |
| `/api/admin/sequences` | GET/PUT | Read/update follow-up sequence template (steps, pause/resume) |
| `/api/admin/settings` | GET/PATCH | System settings (auto_decline_days, etc.) |
| `/api/admin/users` | GET/PATCH | List users, update roles, activate/deactivate |
| `/api/admin/invites` | GET/POST/DELETE | Manage team invites |
| `/api/admin/hcp-lead-sources` | GET | Sync lead source options from HCP API |
| `/api/admin/pricebook` | GET | List pricebook items (filters: `?category=`, `?search=`, `?active=`) |
| `/api/admin/pricebook` | POST | Create pricebook item (admin only) |
| `/api/admin/pricebook/[id]` | PUT | Update item + HCP sync with rich description (admin only) |
| `/api/admin/pricebook/[id]` | DELETE | Soft-delete item (set inactive, admin only) |
| `/api/admin/pricebook/import` | POST | Bootstrap import all materials + services from HCP (additive only, admin) |
| `/api/admin/pricebook/bulk` | PUT | Bulk actions: `action=category\|activate\|deactivate\|price_adjust\|edit` (admin only) |
| `/api/admin/pricebook/bulk` | POST | Bulk sync selected active materials to HCP (admin only) |
| `/api/admin/pricebook/categories` | GET | List active pricebook categories (any authenticated user) |
| `/api/admin/pricebook/categories` | POST | Create new category with name + hcp_type (admin only) |
| `/api/admin/pricebook/suppliers` | GET | List active pricebook suppliers (any authenticated user) |
| `/api/admin/pricebook/suppliers` | POST | Create new supplier (admin only) |
| `/api/admin/markup-tiers` | GET | List all markup tiers ordered by tier_number (any authenticated user) |
| `/api/admin/markup-tiers` | PUT | Replace all markup tiers (admin sends full array, delete + re-insert, admin only) |
| `/api/admin/pricebook/recalculate` | POST | Recalculate prices from markup tiers for all non-manual-price items (admin only) |
| `/api/admin/labor-calculator` | GET | Read saved labor calculator inputs from settings (any authenticated user) |
| `/api/admin/labor-calculator` | PUT | Save labor calculator inputs to settings (admin only) |

### Data Import

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/import/csv` | POST | CSV estimate import from HCP export |

## Cross-App API (Command Layer / inter-app)

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/v1/pricebook` | GET | `GENESIS_INTERNAL_API_KEY` | Read-only pricebook (omits cost/HCP fields). Filters: `?category=`, `?search=` |

## Auth Summary

- **External webhooks:** Signature validation (Twilio, Resend) or Bearer token (leads)
- **Cron jobs:** `CRON_SECRET` header (Vercel injects automatically)
- **All internal routes:** Supabase Auth session required (Google SSO). Role checked server-side (admin, comfort_pro, csr). RLS enforces row-level access.

## Key Integration Points

- **Outbound to HCP:** POST /customers, POST /estimates, POST /estimates/options/decline, GET /materials, POST /materials, PUT /materials/{uuid}, GET /services (called from internal routes, not exposed)
- **Outbound to Twilio:** All SMS via Messaging Service SID `MGd102dd6d19268d0e867c30f9457caf2f`
- **Outbound to Resend:** Transactional email from `marketing@genesishvacr.com`
- **Database:** Supabase PostgreSQL with RLS. Realtime subscriptions for notifications and messages.
