

**System Architecture**

Genesis HVAC Estimate Pipeline & Marketing Platform

Version 2.4 — February 15, 2026

Genesis Services — Monroe, WA

CONFIDENTIAL — Internal Use Only

**v2.4 Changes:** Added SMS Inbox for unmatched inbound messages. New `phone_number` and `dismissed` columns on messages table. Twilio webhook now notifies all admins/CSRs when no matching estimate exists. New `/api/inbox` route and `/dashboard/inbox` page with thread view, reply, dismiss, and convert-to-lead actions. New `unmatched_sms` notification type. Previous: v2.3 added team management. v2.2 added Flow 2, leads, estimate links, dark mode. v2.1 added Twilio Hosted SMS.

# **1\. High-Level Overview**

The platform is a serverless-first, three-engine system built around Supabase as the data and auth core, with Next.js on Vercel handling the frontend and API logic. External services provide email delivery, SMS messaging, and HVAC data synchronization. The architecture prioritizes low maintenance, low cost, and simplicity for a non-developer builder using AI-assisted code generation.

**Engine 1 — Estimate Pipeline (MVP):** The core workflow engine. Estimates from Housecall Pro enter the system, get assigned to comfort pros, and are enrolled in automated follow-up sequences. Sequences mix auto-sent emails/SMS with manual call tasks. Customers can reply to SMS messages, and comfort pros can respond directly from the app via a conversation thread. Status syncs bidirectionally with HCP. A second ingress path (Flow 2) handles leads from external sources (Facebook, Google, website forms) via an inbound webhook. CSRs manage these in the Leads tab and move qualified leads to HCP with one click, which creates the customer and estimate in Housecall Pro via API — the estimate then enters the standard pipeline.

**Engine 2 — Notification Hub (MVP):** Real-time alert system powered by Supabase Realtime WebSocket subscriptions. Fires when leads engage with messages (opens, clicks), when customers reply to SMS messages, when follow-up tasks are due, when estimate statuses change in HCP, and when auto-decline is approaching.

**Engine 3 — Campaign Broadcaster (Phase 2):** Bulk send engine for marketing emails to the tagged/segmented 5,000-customer base. Includes audience builder, contact frequency safeguards, do-not-disturb logic for active pipeline leads, and domain warm-up batch controls.

All three engines share the same Supabase PostgreSQL database and customer contact history. Cross-engine intelligence is possible: a broadcast campaign click from a dormant estimate lead can trigger a notification to the original comfort pro.

# **2\. Technology Stack**

| Component | Technology | Role & Notes |
| :---- | :---- | :---- |
| **Database** | Supabase PostgreSQL | All data storage. Row Level Security enforces role-based access. Real-time subscriptions for live notifications. Database triggers for automated logic (e.g., auto-enroll new estimates in sequences). |
| **Authentication** | Supabase Auth \+ Google SSO | Google Workspace single sign-on for all team members. No public signup. RLS policies use auth.uid() to scope data by user role. |
| **Frontend** | Next.js 16 (React 19) | Interactive dashboard hosted on Vercel. Server components for data fetching, client components for interactivity. Dark mode with class-based toggle (persists to localStorage, respects system preference). Middleware via proxy.ts (Next.js 16 convention). |
| **Hosting** | Vercel | Zero-config deploys from GitHub. Native Next.js support (built by the same team). Free Hobby tier sufficient for MVP. Upgrade to Pro for higher function limits. |
| **API Layer** | Vercel API Routes | Node.js serverless functions for all external API calls. Single JavaScript runtime (no Deno/Edge Functions complexity). Handles Resend sends, Twilio sends, HCP API calls. |
| **Scheduled Jobs** | Vercel Cron Jobs | Configured in vercel.json. Runs: sequence step execution (multiple times daily), HCP status polling (3x daily), auto-decline processing (daily). |
| **Email Delivery** | Resend | Transactional follow-up emails and broadcast campaigns. Sends from marketing@genesishvacr.com. Webhooks for open/click/bounce tracking. Free tier: 3,000 emails/month, then $20/month for 50k. |
| **SMS Delivery** | Twilio Hosted SMS | Two-way SMS via existing Genesis Comcast VoiceEdge number (425-261-9095) hosted on Twilio for SMS routing. Voice stays on Comcast. Outbound via REST API, inbound via webhook. 10DLC registered for compliance. Costs: $1/mo number hosting \+ ~$0.0079/outbound SMS. |
| **HVAC Data Sync** | Housecall Pro API | GET /estimates for status polling with date range filter. POST /estimates/options/approve and /estimates/options/decline with option\_ids array. Bearer token auth. |
| **Styling** | Tailwind CSS v4 | Utility-first CSS with @theme inline design tokens. Dark mode via @variant dark (&:where(.dark, .dark *)). Responsive design for mobile field use. Fast iteration during build. |
| **Charts** | Recharts | React-native charting for pipeline analytics and campaign metrics. Simpler integration than Chart.js in a React codebase. |
| **Source Control** | GitHub | Private repo with auto-deploy to Vercel on push to main branch. |
| **AI (Phase 3\)** | Anthropic Claude API | Email/template content generation with HVAC-tailored system prompts. Daily token caps tracked in database. |
| **Weather (Phase 3\)** | OpenWeather API (free) | Monroe, WA seasonal data for automated campaign triggers. |

# **3\. Data Model**

The database is structured around the estimate pipeline as the primary workflow. The estimates table is the central object, with estimate\_options, follow\_up\_events, messages, and notifications radiating from it. Customers and campaigns are supporting entities.

## **3.1 Core Tables**

| Table | Key Fields | Purpose |
| :---- | :---- | :---- |
| **users** | id, email, name, phone role (admin | comfort\_pro | csr) google\_id, is\_active, created\_at | Team members. Role determines dashboard views and permissions. |
| **customers** | id, hcp\_customer\_id email, phone, name, address equipment\_type, last\_service\_date lead\_source, tags\[\] (text array) do\_not\_contact (boolean) created\_at, updated\_at | Customer records synced from HCP. HVAC-specific fields enable segmentation. Tags support campaign targeting. |
| **estimates** | id, estimate\_number (unique) hcp\_estimate\_id customer\_id (FK → customers) assigned\_to (FK → users) status (sent | active | snoozed |   won | lost | dormant) total\_amount, sent\_date sequence\_id (FK → follow\_up\_sequences) sequence\_step\_index (int) snooze\_until, snooze\_note auto\_decline\_date, online\_estimate\_url created\_at, updated\_at | Parent estimate record. Central pipeline object. Tracks follow-up sequence position and snooze state. online\_estimate\_url stores the HCP customer-facing estimate URL for use in follow-up templates via {{estimate\_link}} placeholder. |
| **estimate\_options** | id, estimate\_id (FK → estimates) hcp\_option\_id (for API sync) option\_number (1, 2, 3...) description (e.g., 'Furnace \+ HP') amount status (pending | approved | declined) | Individual options within an estimate. HCP option IDs enable two-way approve/decline sync via POST API. |
| **follow\_up\_sequences** | id, name, is\_default (boolean) steps (JSONB array of objects):   { day\_offset, channel, template,     is\_call\_task } created\_by, created\_at | Company-level sequence templates. Admin-managed. Steps define the multi-channel follow-up cadence. Templates support placeholders: {{customer\_name}}, {{customer\_email}}, {{comfort\_pro\_name}}, {{estimate\_link}}. Email templates use HTML hyperlinks for estimate links; SMS templates show URL on its own line. |
| **follow\_up\_events** | id, estimate\_id (FK → estimates) sequence\_step\_index channel (email | sms | call) status (scheduled | pending\_review |   sent | opened | clicked |   completed | skipped | snoozed) scheduled\_at, sent\_at content (actual message sent) comfort\_pro\_edited (boolean) created\_at | Execution log. One row per step per estimate. Tracks what was sent, when, and engagement. |
| **notifications** | id, user\_id (FK → users) type (email\_opened | link\_clicked |   call\_due | lead\_assigned |   estimate\_approved | estimate\_declined |   declining\_soon | sms\_received |   unmatched\_sms) estimate\_id (FK → estimates) message, read (boolean) created\_at | Real-time alerts. Supabase Realtime pushes new rows to the frontend via WebSocket. unmatched\_sms notifications are sent to all admins/CSRs when an inbound SMS has no matching estimate. |
| **messages** | id, customer\_id (FK → customers) estimate\_id (FK → estimates, nullable) direction (inbound | outbound) channel (sms) body (text) twilio\_message\_sid (for tracking) phone\_number (external party's number) sent\_by (FK → users, nullable — null for inbound) dismissed (boolean, default false) created\_at | Full SMS conversation history. Stores every inbound and outbound text tied to the customer. Outbound messages sent via the pipeline app or automated sequences are logged here. Inbound messages from customers arrive via Twilio webhook and are stored here. The estimate\_id is set when the message is part of an active estimate conversation; null for general/unmatched messages. phone\_number stores the external party's phone (sender for inbound, recipient for outbound) — used to group unmatched SMS threads in the Inbox. dismissed allows soft-delete of Inbox threads. Realtime enabled for live conversation updates. |
| **campaigns** | id, name, type (email | sms) subject, content (HTML/text) segment\_filter (JSONB) exclude\_active\_pipeline (boolean) not\_contacted\_days (int) batch\_size, batch\_interval status (draft | sending | sent) sent\_count, created\_by, created\_at | Phase 2: Broadcast marketing campaigns with audience builder and warm-up controls. |
| **campaign\_events** | id, campaign\_id (FK → campaigns) customer\_id (FK → customers) status (sent | opened | clicked |   bounced | unsubscribed) created\_at | Phase 2: Per-recipient campaign tracking for analytics. |
| **leads** | id, source (facebook | google | website | manual | other), customer\_name, email, phone, address, notes (text), status (new | contacted | qualified | converted | closed), assigned\_to (FK → users, nullable), converted\_estimate\_id (FK → estimates, nullable), hcp\_customer\_id, created\_at, updated\_at | Inbound leads from external sources (Flow 2). CSR manages status progression. "Move to HCP" button creates customer + estimate in Housecall Pro via API, sets status to converted, and links via converted\_estimate\_id. |
| **user\_invites** | id, email (unique), name, phone role (admin | comfort\_pro | csr) invited\_by (FK → users) created\_at | Pre-registered team member invites. Admin creates invites with email/name/role. When the invited person signs in with Google, the auth callback auto-creates their users row and deletes the invite. RLS: admin-only. |
| **settings** | key (text, primary key) value (JSONB) updated\_by, updated\_at | System config: auto\_decline\_days, default\_sequence\_id, warmup\_batch\_size, etc. |

## **3.2 Key Relationships**

* Each estimate belongs to one customer and is assigned to one comfort pro (user).

* Each estimate has one or more estimate\_options, each with its own HCP option ID and approval status.

* When any option is approved, the parent estimate status moves to “won.” When all options are declined, it moves to “lost.”

* Each estimate references a follow\_up\_sequence and tracks its current position via sequence\_step\_index.

* follow\_up\_events logs every executed (or scheduled) step for an estimate, creating a complete audit trail.

* notifications are scoped to a user\_id, enabling per-user real-time subscriptions.

* messages are tied to a customer\_id and optionally an estimate\_id. Both inbound and outbound SMS are stored chronologically, creating a full conversation thread viewable on the customer/estimate detail page. Comfort pros can reply directly from the app, which sends via Twilio and logs the outbound message.

* Deduplication: estimates.estimate\_number has a unique constraint. On import, existing numbers update rather than insert.

* leads track external lead sources. When converted via "Move to HCP", the lead links to the resulting estimate via converted\_estimate\_id and stores the hcp\_customer\_id.

* Follow-up sequence templates use {{estimate\_link}} which resolves to the estimate's online\_estimate\_url (HCP customer-facing URL format: https://client.housecallpro.com/estimates/{hash}).

* user\_invites are consumed on first sign-in: the auth callback matches by email, creates the users row with the invite's role, and deletes the invite.

# **4\. Authentication & Security**

## **4.1 Authentication**

All access requires Google Workspace SSO via Supabase Auth. There is no public signup. New users are added by an admin via the Team page using invite-based provisioning: admin enters email, name, phone, and role to create a pending invite. When the invited person signs in with Google for the first time, the auth callback checks for a matching invite, auto-creates their `users` row, and deletes the invite. Users without an invite see an "Account Not Configured" message. The auth flow uses Supabase's built-in Google OAuth provider, scoped to the Genesis Google Workspace domain.

## **4.2 Row Level Security (RLS)**

Every table has RLS enabled. Policies enforce role-based access:

* Admin: Full read/write access to all tables.

* Comfort Pro: Read/write access to estimates, estimate\_options, follow\_up\_events, and notifications where assigned\_to or user\_id matches their auth.uid(). Read-only access to customers, follow\_up\_sequences, and settings.

* CSR: Read/write on estimates (for initial creation and assignment). Read on customers. No access to campaigns or settings.

## **4.3 API Key Security**

All third-party API keys (Resend, Twilio, HCP, Anthropic) are stored as Vercel environment variables, never in client-side code. Supabase keys (anon key for client, service role key for server) are separated: the anon key is safe for the frontend (RLS protects data), while the service role key is only used in Vercel API routes.

## **4.4 Network Security**

* HTTPS enforced on all connections (Vercel and Supabase provide this by default).

* Resend webhooks verified via signature validation.

* Twilio webhooks verified via request signature validation (X-Twilio-Signature header).

* HCP API calls use Bearer token authentication.

* No public-facing data endpoints. All data access requires authenticated session.

# **5\. Data Flows**

## **5.1 Estimate Ingress**

MVP: CSV export from Housecall Pro, uploaded via the admin dashboard. The import process parses the CSV, deduplicates on estimate\_number, creates/updates customer records (matched by hcp\_customer\_id), creates estimate and estimate\_options records, assigns the comfort pro based on the HCP data, and auto-enrolls the estimate in the default follow-up sequence.

Version 0.2: HCP webhook fires on new estimate creation. A Vercel API route receives the payload, performs the same dedup and enrollment logic, and auto-assigns the comfort pro from the HCP data. No manual import needed for new estimates.

Flow 2 (Built): External leads arrive via /api/leads/inbound webhook. CSRs qualify leads and "Move to HCP" creates the customer and estimate in Housecall Pro via POST /customers and POST /estimates API calls. The estimate then enters the standard pipeline.

## **5.2 Follow-Up Sequence Execution**

A Vercel cron job runs multiple times daily (e.g., every 2 hours during business hours). For each active estimate, it checks: is a sequence step due (based on sent\_date \+ step day\_offset)? Is the estimate snoozed (skip if snooze\_until is in the future)? Has the estimate been won/lost/dormant (stop if so)?

For auto-send steps (email/SMS): the system creates a follow\_up\_event with status “pending\_review” and a scheduled\_at 30 minutes in the future. If the comfort pro doesn’t edit or cancel within that window, a subsequent cron run picks it up and sends via Resend (email) or Twilio (SMS), updating the status to “sent.” Outbound SMS messages are also logged to the messages table for conversation tracking.

For call task steps: the system creates a follow\_up\_event with status “scheduled” and a notification for the comfort pro. The comfort pro marks it “completed” (with optional notes) or snoozes the entire sequence.

## **5.3 HCP Status Sync**

A Vercel cron job runs 3 times daily. It calls GET /estimates on the HCP API with a date range filter (today back to the auto-decline threshold). For each returned estimate, it compares option statuses against the local database. If HCP shows an option as approved that the system has as pending, the system updates the option, marks the estimate as “won,” stops the follow-up sequence, and creates a notification.

When the auto-decline threshold is reached: the system collects all pending hcp\_option\_ids for the estimate, POSTs to /estimates/options/decline with the option\_ids array, marks the estimate as “lost” locally, and notifies the comfort pro. A “declining soon” notification fires 3 days before the threshold.

## **5.4 Inbound SMS (Twilio Webhook)**

When a customer replies to an SMS, Twilio sends a webhook POST to /api/webhooks/twilio. The handler: 1) Validates the Twilio request signature. 2) Matches the incoming phone number to a customer record. 3) Creates a row in the messages table with direction "inbound." 4) If the customer has an active estimate, links the message to that estimate via estimate_id. 5) Creates a notification (type: sms_received) for the comfort pro assigned to the active estimate. 6) Supabase Realtime pushes the new message to the frontend, updating the conversation thread live.

## **5.5 Outbound SMS (Manual Reply)**

When a comfort pro sends a reply from the conversation thread in the app, the frontend POSTs to /api/send-sms with the message body, customer_id, and estimate_id. The API route: 1) Sends the SMS via Twilio REST API from the hosted Comcast number. 2) Logs the message to the messages table with direction "outbound" and sent_by set to the comfort pro’s user_id. 3) Returns the Twilio message SID for tracking.

## **5.6 Notification Delivery**

Notifications are written to the notifications table in Supabase. The frontend subscribes to this table via Supabase Realtime, filtered by the logged-in user’s ID. New rows appear instantly as badge counts and activity feed items. The comfort pro can mark notifications as read. Unread count drives the badge counter on the dashboard.

## **5.7 Inbound Lead Ingestion (Flow 2)**

External lead sources (Facebook Lead Ads, Google Ads, website forms) send lead data to /api/leads/inbound via POST, secured with LEADS\_WEBHOOK\_SECRET header validation. The webhook accepts flexible field names to accommodate different sources (e.g., "full\_name" or "name", "email\_address" or "email"). A new row is created in the leads table with status "new". CSRs manage leads in the Leads tab — updating status, adding notes, and qualifying leads. When ready, the CSR clicks "Move to HCP" which: 1) POSTs to the HCP API to create a customer record, 2) POSTs to create an estimate for that customer, 3) Updates the lead status to "converted" and stores the hcp\_customer\_id and converted\_estimate\_id. The new estimate then enters Flow 1's standard pipeline via the next HCP polling cycle.

## **5.8 Estimate Link Integration**

When an estimate is synced from HCP (via polling or Move to HCP), the system stores the customer-facing estimate URL in online\_estimate\_url. The URL format is https://client.housecallpro.com/estimates/{hash}. During follow-up sequence execution, the {{estimate\_link}} placeholder in templates is replaced with this URL. In email templates, the link is rendered as a styled HTML button ("View Your Estimate"). In SMS templates, the URL appears on its own line since SMS cannot render hyperlinks.

## **5.9 Campaign Broadcasting (Phase 2\)**

The admin creates a campaign with content, selects audience via tag/segment filters, sets a “not contacted in X days” threshold, and optionally excludes customers in active pipeline sequences (do-not-disturb). The system calculates eligible recipients and presents the count. The admin sets a batch size for warm-up pacing. A cron job sends batches at the configured interval until the campaign is complete. Resend webhooks log per-recipient events for analytics.

# **6\. Scalability & Cost Projections**

## **6.1 Current Scale**

The system is designed for Genesis’s current scale: approximately 60 estimates per month, 1 comfort pro (growing), and a 5,000-customer base for marketing campaigns. The free tiers of Supabase and Vercel comfortably handle this volume.

## **6.2 Cost Breakdown**

| Service | Tier | Estimated Monthly Cost |
| :---- | :---- | :---- |
| **Supabase** | Free | $0 (500MB DB, 50k auth requests, 2GB bandwidth). Upgrade to Pro ($25/mo) when approaching limits. |
| **Vercel** | Hobby (Free) | $0 (100GB bandwidth, 100 hrs serverless). Upgrade to Pro ($20/mo) for more cron jobs and functions. |
| **Resend** | Free → Starter | $0 for first 3,000 emails/mo. $20/mo for up to 50,000. Sufficient for pipeline \+ campaigns. |
| **Twilio** | Pay-as-you-go | $1/mo number hosting \+ ~$0.0079/outbound SMS \+ ~$0.004/inbound. One-time 10DLC registration $4–15. At 300 SMS/mo ≈ $4/mo total. |
| **Housecall Pro** | Existing plan | Already paid. API access typically included in business tier. |
| **GitHub** | Free | $0 for private repos. |
| **Domain DNS** | Existing | $0 — DNS records added to existing domain registration. |

**MVP Monthly Total:** $0–$20 (depending on email volume).

**At Scale with Campaigns:** $45–$65/month (Supabase Pro \+ Resend Starter \+ Vercel if needed).

**Phase 3 with AI:** Add $5–10/month for Claude API with daily token caps.

## **6.3 Scaling Path**

* More comfort pros: No architecture changes needed. Add users, RLS handles data scoping automatically.

* Higher estimate volume: Cron job frequency can increase. Supabase handles concurrent writes well.

* Larger customer base: Supabase free tier supports 500MB. At 5,000 customers with full history, you are well within limits. Pro tier at 8GB handles 50,000+.

* Higher email volume: Resend scales to millions. Batch size controls prevent deliverability issues.

# **7\. Monitoring & Observability**

* Supabase Dashboard: Database size, query performance, auth events, real-time connection count, function invocations.

* Vercel Dashboard: API route execution times, error rates, cron job success/failure, bandwidth usage.

* Resend Dashboard: Email delivery rates, bounce rates, spam complaints, domain reputation score.

* In-App (Phase 2 Analytics): Pipeline conversion metrics, follow-up completion rates, per-salesman performance, campaign engagement.

For MVP, the built-in dashboards of Supabase, Vercel, and Resend provide sufficient monitoring. Custom alerting (e.g., email on cron job failure) can be added in Phase 2 via Vercel’s monitoring integrations.

# **8\. Future Architecture Considerations**

* Service Titan Migration: If Genesis eventually moves from HCP to Service Titan, the integration layer is modular. Replace the HCP API routes with Service Titan equivalents; the rest of the system is unaffected.

* Mobile App: If needed, the Supabase backend and Vercel API routes can serve a React Native mobile app with no backend changes.

* Multi-Location: The data model supports adding a location\_id to estimates and users for multi-branch operations.

* Advanced AI: The Phase 3 AI layer can expand to include predictive lead scoring, optimal send-time analysis, and automated A/B testing recommendations.