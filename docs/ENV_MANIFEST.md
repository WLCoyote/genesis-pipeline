# ENV_MANIFEST.md

## Genesis Ecosystem — Environment Variable Manifest

**Last updated:** February 2026  
**Purpose:** Single reference for every environment variable across all Genesis apps and the Command Layer. Prevents "does this app need that key?" confusion during deploys.

---

## Shared Across All Apps

These variables exist in every Genesis Next.js app.

| Variable | Purpose | Scope | Notes |
|----------|---------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client + Server | **Per-app** — each app has its own Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Client + Server | Public — safe for browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Server only | **Secret** — never expose to client |
| `NEXT_PUBLIC_SITE_URL` | App's own deployed URL | Client + Server | Set after first deploy |
| `GENESIS_INTERNAL_API_KEY` | Cross-app + agent auth | Server only | **Same 64-char key across ALL apps + agent** |
| `CRON_SECRET` | Vercel cron authentication | Server only | Shared across all Vercel-hosted apps |

---

## Per-App Variables

### Pipeline — `app.genesishvacr.com`

| Variable | Purpose | Scope |
|----------|---------|-------|
| `TWILIO_ACCOUNT_SID` | Twilio account ID | Server only |
| `TWILIO_AUTH_TOKEN` | Twilio auth | Server only |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio Messaging Service | Server only |
| `TWILIO_PHONE_NUMBER` | Twilio sender number | Server only |
| `RESEND_API_KEY` | Resend email API | Server only |
| `HCP_API_KEY` | Housecall Pro API | Server only |
| `LEADS_WEBHOOK_SECRET` | Inbound lead webhook auth | Server only |

### Inspection — `genesis-inspect.vercel.app`

| Variable | Purpose | Scope |
|----------|---------|-------|
| *(Standard shared vars only for now)* | | |

### Inventory — `inventory-tracker-genesis.netlify.app`

| Variable | Purpose | Scope |
|----------|---------|-------|
| *(Pending API audit — update after audit)* | | |

### Dashboard — `dashboard.genesishvacr.com` *(not built yet)*

| Variable | Purpose | Scope |
|----------|---------|-------|
| `QBO_CLIENT_ID` | QuickBooks OAuth client ID | Server only |
| `QBO_CLIENT_SECRET` | QuickBooks OAuth client secret | Server only |

---

## Command Layer — Mac Mini

These variables exist on the Mac Mini only.

| Variable | Purpose | Notes |
|----------|---------|-------|
| `ANTHROPIC_API_KEY` | Claude Agent SDK | Core agent intelligence |
| `GENESIS_INTERNAL_API_KEY` | All `/api/v1/` calls to Genesis apps | Same key as all apps |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API | Send/receive messages |
| `TELEGRAM_ALLOWED_CHAT_ID` | Wylee's Telegram chat ID | Rejects all other chat IDs |
| `AGENT_FORWARD_SECRET` | Vercel → Mac Mini webhook forwarding | Separate from GENESIS_INTERNAL_API_KEY |
| `PIPELINE_BASE_URL` | `https://app.genesishvacr.com` | |
| `INSPECT_BASE_URL` | `https://genesis-inspect.vercel.app` | |
| `INVENTORY_BASE_URL` | `https://inventory-tracker-genesis.netlify.app` | |
| `HCP_API_KEY` | Housecall Pro Bearer token | Shared with Pipeline |
| `QBO_CLIENT_ID` | QuickBooks OAuth client ID | Shared with Dashboard |
| `QBO_CLIENT_SECRET` | QuickBooks OAuth client secret | Shared with Dashboard |
| `QBO_REFRESH_TOKEN` | QBO refresh token | Auto-updated on token refresh — store in SQLite, not just env |
| `GMAIL_CLIENT_ID` | Gmail API OAuth client ID | Phase 2 |
| `GMAIL_CLIENT_SECRET` | Gmail API OAuth client secret | Phase 2 |
| `RETELL_API_KEY` | Retell AI API key | Phase 2 |

---

## Vercel Webhook Receiver

These are on the Pipeline Vercel project (hosts the `/api/command/telegram` route).

| Variable | Purpose | Notes |
|----------|---------|-------|
| `AGENT_FORWARD_SECRET` | Auth for forwarding to Mac Mini | Must match Mac Mini's value |
| `TELEGRAM_BOT_TOKEN` | For sending "agent offline" fallback messages | Same token as Mac Mini |
| `MAC_MINI_AGENT_URL` | Internal URL for Mac Mini agent process | e.g., `http://<mac-mini-ip>:3100` |

---

## Key Rotation Checklist

If `GENESIS_INTERNAL_API_KEY` is compromised, update it in:
- [ ] Pipeline (Vercel env vars)
- [ ] Inspection (Vercel env vars)
- [ ] Inventory (Netlify env vars)
- [ ] Dashboard (Vercel env vars) — when built
- [ ] Genesis OS — when built
- [ ] Mac Mini (agent .env)
- [ ] Redeploy all apps after updating

If `AGENT_FORWARD_SECRET` is compromised, update it in:
- [ ] Pipeline Vercel project (webhook receiver)
- [ ] Mac Mini (agent .env)

---

## Rules

1. **Never store secrets in code, config files, or git.** Environment variables only.
2. **`NEXT_PUBLIC_` prefix = safe for browser.** Everything else is server-only.
3. **New third-party service?** Follow the pattern: `{SERVICE}_{PURPOSE}`. Add it here.
4. **Every app's `.env.example` must match this manifest.** If it's listed here for your app, it's in your `.env.example`.
