

**Product Requirements Document**

Genesis HVAC Estimate Pipeline & Marketing Platform

Version 3.2 — February 20, 2026

Prepared by: Wylee, Owner / Product Lead

Genesis Services — Monroe, WA

CONFIDENTIAL — Internal Use Only

# **1\. Document Overview**

## **1.1 Purpose**

This PRD defines the requirements for a custom estimate pipeline and marketing automation platform built for Genesis Refrigeration & HVAC (DBA for marketing is Genesis Heating, Cooling, and Refrigeration), a residential HVAC company in Monroe, WA. The platform’s primary purpose is to eliminate lost revenue from poor estimate follow-up by automating multi-channel nurture sequences. Its secondary purpose is to provide marketing campaign tools for the full 5,000-customer base.

The platform replaces the need for expensive tools like Mailchimp ($45–$350/month) or GoHighLevel ($97–$297/month) by leveraging open-source and low-cost services, while delivering HVAC-specific functionality those platforms lack.

## **1.2 Scope**

**In Scope:** Estimate pipeline with automated follow-up sequences, customer management with Housecall Pro integration, multi-channel communication (email \+ SMS), role-based team access, real-time notifications, and broadcast marketing campaigns. Scalable for 5,000+ customers.

**Out of Scope:** Full CRM functionality (jobs, invoicing, scheduling remain in Housecall Pro), payment processing, public user signups, native mobile app (web-based responsive dashboard only), and advanced A/B testing (Phase 3+).

**Assumptions:** Built by Wylee using AI-assisted code generation (Claude/Grok). No dedicated development team. Housecall Pro remains the system of record for job execution.

## **1.3 Version History**

Version 3.2: Twilio Messaging Service (SID: MGd102dd6d19268d0e867c30f9457caf2f) created and integrated for A2P 10DLC compliance. All 5 SMS-sending routes switched from `from: TWILIO_PHONE_NUMBER` to `messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID`. A2P campaign registered (use case: "Engage in a discussion") — pending carrier approval. Privacy policy page at `/privacy` and Terms & Conditions page at `/terms` created for Twilio compliance. Inbox POST route rewritten to call Twilio directly instead of proxying through `/api/send-sms` (Vercel serverless can't self-fetch). Error display added to ConversationThread and InboxThreads components. `TWILIO_MESSAGING_SERVICE_SID` env var added to `.env.local` and Vercel (February 20, 2026).

Version 3.1: Paused state on estimate detail — yellow "follow-ups on hold" banner in actions, hides pending event/Send Now/Skip Step, timeline shows "Paused" badges on incomplete steps. Sent date fix — removed `option.updated_at` (was showing today's date on old estimates); now uses `schedule.scheduled_start` → `estimate.created_at` fallback. HCP pro link — estimate number in detail header is clickable, links to `https://pro.housecallpro.com/app/estimates/{option_id}`; removed customer URL button (HCP API does not expose customer-facing URL). Execute skipped steps — "Send SMS/EMAIL" or "Schedule Call" button on skipped timeline steps via POST /api/estimates/[id]/execute-step. HCP decline on Mark Lost — status route calls POST /estimates/options/decline on HCP API with stored option IDs. Option selection modal — Mark Won/Lost opens inline panel with checkboxes per option; won = local only (customer signs in HCP), unselected declined in HCP; lost = selected declined in HCP. Admin SMS notifications — all inbound SMS now notify admins/CSRs (not just unmatched); deduplicates if assigned user is also admin. Twilio live — verified and activated, webhook configured, NEXT_PUBLIC_SITE_URL env var added (February 18, 2026).

Version 3.0: Follow-up timeline rewritten to show all sequence steps (not just events). Past-due steps without events show as "Skipped", current step is highlighted, future steps show as "Upcoming" with projected dates. Won/lost estimates show remaining steps as "Not Reached". Added Skip Step button to manually advance past a step without sending. Added Sequence Pause/Resume toggle — admin can pause all follow-ups without deleting steps, resume later. New `is_active` column on `follow_up_sequences` (SQL 011). Cron job validates sequence is active and step still exists before sending pending events — prevents sends after sequence is edited or paused. Timeline preserves full history: executed steps show the event's actual channel even when sequence settings change (February 18, 2026).

Version 2.9: Major HCP polling accuracy fixes. Sent detection now uses `option.status = "submitted for signoff"` (not `approval_status = "awaiting response"` which is never set). Also pulls in already-resolved estimates (approved/declined) for initial sync. Customer name priority: `customer.company` > `first_name + last_name` > `"Unknown"`. HCP amounts are in cents — now divided by 100. Sent date derived from `estimate.schedule.scheduled_start` or `estimate.created_at` fallback (v3.1: removed `option.updated_at` — reflected modification date, not send date). Existing estimates get full refresh on every poll: customer info, amounts, options, sent_date. Estimates list sorted newest to oldest. Removed HCP API date filters (`scheduled_start` filters by appointment date, not creation); now fetches newest-first and filters by `created_at` in code (February 18, 2026).

Version 2.8: Rewrote HCP estimate polling to use correct API filter parameters (`scheduled_start_min`/`scheduled_start_max` in YYYY-MM-DD format, `page_size=200`, `sort_direction=desc`). Previous `start_date`/`end_date` parameters were silently ignored by HCP, causing the API to return all 2,100+ estimates and timeout. Added 5-page cap and pre-fetched local estimate index for instant matching (no per-estimate DB query). Polling now completes in seconds instead of timing out. Bumped maxDuration to 300s as safety net (February 18, 2026).

Version 2.7: Added "Send Now" button on estimate detail page for immediately sending due sequence steps (skips 30-min edit window). Moved-to-HCP leads now appear in the archived section with purple "Moved to HCP" badge instead of disappearing. Fixed total amount calculation for multi-option estimates (uses HCP estimate total or highest option, not sum of all options). Fixed Vercel 504 timeout on Update Estimates (maxDuration = 120s). Fixed React hydration error #418 in dark mode toggle (February 17, 2026).

Version 2.6: Added manual "Update Estimates" button for on-demand HCP polling (admin/CSR). Added admin-only delete for estimates and leads with cascading cleanup. Added lead archiving with "archived" status, Archive/Unarchive buttons on lead cards, and collapsible archived leads section. SQL migration 010 adds archived to leads status check constraint (February 17, 2026).

Version 2.5: Corrected estimate pipeline entry flow. Estimates now enter the pipeline only when the HCP polling cron detects they've been sent to the customer (option status = "submitted for signoff"), not when Move to HCP is clicked. Move to HCP creates the customer and estimate in HCP only. Polling cron handles new estimate detection and existing estimate updates, filtering out estimates older than auto\_decline\_days. Added HCP lead source sync, lead editing, and sequence editor placeholder reference (February 16, 2026).

Version 2.4: Added SMS Inbox for unmatched inbound messages. When someone texts the business number but isn't linked to an active estimate, admins and CSRs get notified and can view the conversation in a new Inbox page. From the inbox, staff can reply to gather info, convert the thread to a lead, or dismiss it. New `phone_number` and `dismissed` columns on messages table, new `/api/inbox` route, new `/dashboard/inbox` page (February 15, 2026).

Version 2.3: Added admin team management with invite-based user provisioning. Admin invites team members by email/name/role; new users auto-provision on first Google sign-in. Admin can edit roles and deactivate users. New `user_invites` table and Team page (February 15, 2026).

Version 2.2: Updated to reflect completed build through Phase 3. Added Flow 2 (Genesis-first lead ingestion via webhook), estimate link integration with HCP customer-facing URLs in follow-up templates, dark mode with system preference detection, and inbound lead management for CSRs. Moved HCP polling and external lead capture from future phases to MVP (February 15, 2026).

Version 1.0: Initial draft based on Grok discussions (February 13, 2026).

Version 2.1: Replaced Alive5 with Twilio Hosted SMS. Added two-way SMS messaging with full conversation tracking. Added inbound webhook, messages table, and in-app reply capability for comfort pros. Voice remains on Comcast VoiceEdge (February 14, 2026).

Version 2.0: Major revision — refocused on estimate pipeline as primary MVP, restructured data model, added SMS integration, two-way HCP sync, and detailed follow-up sequence design (February 13, 2026).

# **2\. Problem Statement & Business Goals**

## **2.1 Core Problem**

Genesis loses a significant portion of potential revenue because estimate follow-up is inconsistent and manual. After a comfort pro sends an estimate, there is no systematic process to ensure timely follow-up. Leads go cold within three weeks, though some customers return after six months or more. Without a structured system, follow-up depends entirely on individual discipline, which doesn’t scale as the sales team grows.

Secondary problems include no marketing infrastructure for the existing 5,000-customer base (no campaigns are currently being sent), no centralized view of the estimate pipeline across the team, and no data on follow-up effectiveness or conversion rates.

## **2.2 Business Goals**

* Recover lost estimate revenue by ensuring every estimate gets a complete, multi-channel follow-up sequence automatically.

* Total platform costs under $50/month base plus $10–50 variable for email/SMS volume and $5–10 for AI with usage caps.

* Give management visibility into the full estimate pipeline: who’s following up, who’s not, and what’s converting.

* Enable broadcast marketing campaigns to the full customer base to drive repeat business and referrals.

* Build a foundation that could eventually replace more expensive platforms as Genesis scales.

## **2.3 Success Metrics**

* 90%+ of estimates receive the full follow-up sequence (vs. current ad-hoc approach).

* Measurable improvement in estimate-to-job conversion rate within 90 days of launch.

* Comfort pros actively using the dashboard daily to manage their pipeline.

* First broadcast email campaign sent to segmented customer list within 30 days of pipeline MVP launch.

* First-month total spend under $100.

# **3\. User Personas**

## **3.1 Wylee — Owner / Admin**

Full access to all features. Configures follow-up sequence templates, manages company settings (auto-decline thresholds, sequence timing), views all pipeline data across the team, creates and sends broadcast campaigns, and manages integrations. Primary person setting up campaigns and automations.

## **3.2 Comfort Pro / Salesman**

Currently one, growing. Primary daily user of the estimate pipeline. Sees only their assigned leads. Receives real-time notifications when leads engage (open emails, click links). Manages their follow-up queue: can snooze sequences per customer with notes, edit messages before auto-send, and mark call tasks as completed. Needs the system to be as simple as Housecall Pro.

## **3.3 CSR (Customer Service Representative)**

Creates initial records when calls come in, can assign comfort pros to estimates (though this will primarily auto-sync from HCP). Manages inbound leads from external sources (Facebook ads, Google ads, website forms) via the Leads tab — can update lead status, add notes, and move qualified leads to HCP with a single button click that creates the customer and estimate in Housecall Pro via API. Limited access — no campaign creation or settings management.

## **3.4 Customers (Indirect)**

5,000 residential HVAC clients in the Monroe, WA area. Receive follow-up communications after estimates (email, SMS) and eventually broadcast marketing campaigns. Never log into the system.

# **4\. Feature Requirements**

Features are prioritized using MoSCoW classification. Each feature is assigned to a delivery phase.

| Priority | Feature | Description | Phase |
| ----- | :---- | :---- | ----- |
| **MUST** | **Estimate Pipeline** | Import estimates from HCP (CSV initially, API later). Track status: sent, follow-up active, snoozed, won, lost, dormant. Dedup on estimate number. Support multiple options per estimate (xxx-1, xxx-2). | MVP |
| **MUST** | **Follow-Up Sequences** | Company-defined multi-channel templates (auto email, auto SMS, call tasks). 30-minute edit window before auto-sends. "Send Now" button on estimate detail for immediately sending due steps (bypasses edit window). "Skip Step" button to manually advance past a step without sending. "Execute" button on skipped timeline steps to send them after the fact (POST /api/estimates/[id]/execute-step). Comfort pro snooze with notes. Auto-stop on approval/denial. Admin can pause/resume entire sequence without losing step configuration — when paused, estimate detail shows yellow "follow-ups on hold" banner, hides Send Now/Skip Step/pending event, and timeline shows "Paused" badges on incomplete steps. Full sequence timeline shows all steps with status (Sent, Skipped, Current, Upcoming, Paused, Not Reached). | MVP |
| **MUST** | **Estimate Options** | Track individual options within each estimate with separate statuses. One option approved \= estimate won. All declined \= estimate lost. Store HCP option IDs for two-way sync. Mark Won/Lost opens an option selection modal with checkboxes — won: selected approved locally (customer signs in HCP), unselected pending options declined in HCP via POST /estimates/options/decline; lost: selected options declined in HCP, if all options now declined the estimate moves to lost. | MVP |
| **MUST** | **User Roles & Auth** | Admin, comfort\_pro, CSR roles. Google Workspace SSO. Role-based views and permissions. Each comfort pro sees only their assigned leads. Admin team management with invite-based provisioning. | MVP |
| **MUST** | **Team Management** | Admin Team page to invite new users (email, name, phone, role), edit existing user roles, and activate/deactivate team members. Invite-based provisioning: admin pre-registers users, who auto-provision on first Google sign-in. | MVP |
| **MUST** | **Comfort Pro Dashboard** | Estimate list with at-a-glance counters (emails sent, texts sent, calls made, opens, dates). Sortable/filterable. Default “needs action today” view. Activity feed. | MVP |
| **MUST** | **Email Sending** | Transactional follow-up emails via Resend. Domain authentication (SPF/DKIM/DMARC) for genesishvacr.com. Unsubscribe links. | MVP |
| **MUST** | **SMS Sending (Two-Way)** | Automated follow-up texts and manual replies via Twilio Hosted SMS using existing Comcast VoiceEdge number (425-261-9095). Voice stays on Comcast. Template-based outbound with edit capability. Inbound customer replies received via webhook, stored in messages table, with real-time notification to comfort pro. Full conversation thread viewable on estimate detail page with in-app reply. | MVP |
| **MUST** | **Notifications** | Real-time in-app alerts: email opened, link clicked, call task due, lead assigned, estimate approved/declined. Badge counter on dashboard. | MVP |
| **MUST** | **Estimate Link Integration** | Follow-up templates include {{estimate_link}} placeholder for estimate URLs. Emails use styled "View Your Estimate" button; SMS shows URL on its own line. Note: HCP API does not expose the customer-facing estimate URL (uses opaque hash not derivable from API data). The `online_estimate_url` field exists but is not auto-populated by polling. Estimate number in detail header links to the HCP pro view at `https://pro.housecallpro.com/app/estimates/{option_id}`. | MVP |
| **MUST** | **Dark Mode** | Full dark mode support across all pages and components. Toggle in header with sun/moon icon. Persists preference to localStorage. Respects system color scheme preference on first visit. | MVP |
| **MUST** | **Inbound Lead Management (Flow 2)** | Inbound webhook at /api/leads/inbound accepts leads from Facebook, Google, Zapier, or any source. Lead source options synced from HCP. CSR manages leads in dashboard Leads tab (create, edit, update status), moves qualified leads to HCP via API creating customer + estimate. Estimate enters pipeline only after sent in HCP (detected by polling cron). | MVP |
| **MUST** | **SMS Inbox** | When an inbound SMS doesn't match an active estimate, admins and CSRs are notified. New Inbox page shows unmatched threads grouped by phone number. Staff can reply to gather info, convert to a lead (pre-fills lead form), or dismiss the thread. | MVP |
| **MUST** | **Auto-Decline** | Admin-configurable threshold (default 60 days). “Declining soon” warning to comfort pro. POSTs to HCP API to decline options, keeping systems in sync. | MVP |
| **MUST** | **HCP Estimate Polling** | Scheduled polling of HCP API to detect new sent estimates and status changes. Runs 3x daily via Vercel cron job. Detects sent estimates by `option.status = "submitted for signoff"` (active) or `option.approval_status = "approved"/"declined"` (resolved). Customer name from `customer.company` or first+last name. HCP amounts in cents, divided by 100. Sent date from `estimate.schedule.scheduled_start` if available, else `estimate.created_at` (`option.updated_at` was removed — it reflects last modification, not send date). Existing estimates get full refresh: customer info, pricing, options, sent_date. Fetches newest-first (`sort_direction=desc`, `page_size=200`), filters by created\_at in code. Pre-fetches local estimate IDs for instant dedup. Max 5 pages per poll. Manual "Update Estimates" button for admin/CSR. | MVP |
| **MUST** | **Admin Delete** | Admin can delete estimates (with cascading cleanup of options, events, notifications) and leads. Confirmation required. Used for cleaning up mistakes, not routine workflow. | MVP |
| **MUST** | **Lead Archiving** | Leads that don't convert can be archived to keep the active list clean. Archived leads appear in a collapsible section below active leads. Unarchive restores a lead to "new" status. | MVP |
| **SHOULD** | **HCP Webhook Sync** | Real-time webhook for new estimates/customers from HCP with auto comfort pro assignment. | v0.2 |
| **SHOULD** | **Open/Click Tracking** | Resend webhook handler for email open, click, bounce, and unsubscribe events. Creates real-time notifications for comfort pros when leads engage. | MVP |
| **SHOULD** | **Pipeline Analytics** | Dashboard showing: estimates out, follow-up completion rate, conversion rate, per-salesman metrics, average time to close. | v0.2 |
| **SHOULD** | **Customer Management** | Full customer database with equipment type, service history, tags/categories, lead source. Import from HCP CSV. | v0.2 |
| **COULD** | **Broadcast Campaigns** | Email blasts to tagged/segmented customer lists. Batch size control for domain warm-up. “Not contacted in X days” filter. Do-not-disturb for active nurture leads. | Phase 2 |
| **COULD** | **Customer Segmentation** | Dynamic rules: by equipment type, service recency, location, custom tags. Audience builder for campaigns. | Phase 2 |
| **COULD** | **Campaign Analytics** | Open/click rates, bounces, conversions per campaign. Cost per lead by source. | Phase 2 |
| **COULD** | **HVAC Templates** | Pre-built email templates: seasonal promos, maintenance reminders, emergency alerts, rebate notifications. | Phase 2 |
| **COULD** | **Domain Warm-Up Tool** | Automated send scaling for new email domain. Slider for daily batch size with gradual increase. | Phase 2 |
| **WON'T** | **AI Content Generation** | Claude/Grok API for email/template generation with HVAC-tailored prompts and usage caps. | Phase 3 |
| **WON'T** | **Weather Triggers** | OpenWeather API for Monroe seasonal campaign automation. | Phase 3 |
| **MUST** | **External Lead Capture** | Inbound webhook at /api/leads/inbound accepts leads from Facebook, Google, Zapier, or any source. CSR manages leads in dashboard, moves qualified leads to HCP via API. (Built as Flow 2) | MVP |
| **WON'T** | **A/B Testing** | Split testing for subject lines, send times, and content variants. | Phase 3 |
| **WON'T** | **Advanced Analytics** | ROI calculations, AI-powered insights, predictive conversion scoring. | Phase 3 |

# **5\. Follow-Up Sequence Design**

The follow-up sequence is the core engine of the MVP. It defines a company-standard series of touchpoints that fire automatically after an estimate is sent. The sequence uses a mix of automated messages (email/SMS) and manual tasks (phone calls) to maximize conversion while keeping the personal touch.

## **5.1 Default Sequence Template**

| Day | Channel | Action |
| ----- | ----- | :---- |
| **0** | **Auto SMS** | Estimate sent notification with link: "Hi \[name\], this is \[comfort pro\] from Genesis. I just sent your estimate to \[email\] — you can view and approve it here: \[estimate link\]" |
| **1** | **Auto SMS** | Follow-up check-in: “Hi \[name\], just checking in — did you get a chance to look over the estimate? Happy to walk through anything.” |
| **3** | **Call Task** | System flags lead for phone call. Comfort pro sees notification with context. Marks complete or snoozes. |
| **7** | **Auto Email** | Value-add email with styled "View Your Estimate" button linking to HCP estimate page. Mentions financing options and manufacturer rebates. |
| **14** | **Call Task** | Second phone call prompt. System shows full engagement history (opens, clicks) to inform the conversation. |
| **21** | **Auto Email** | "We'd love to earn your business" email with styled "View Your Estimate" button. |
| **30** | **Auto SMS** | Final active SMS touch with estimate link. Lead moves to dormant status after this step. |
| **60** | **Auto Email** | Last "we're still here" email with styled "View Your Estimate" button. Then auto-decline triggers: POSTs to HCP API and marks estimate as lost. |

## **5.2 Sequence Behavior Rules**

* Auto-sends fire without approval unless the comfort pro intervenes during the 30-minute edit window.

* Call tasks generate a notification and appear in the comfort pro’s “needs action” queue. They do not auto-send anything.

* Snoozing pauses the entire sequence for that customer for a comfort-pro-selected duration. When the snooze expires, the sequence resumes from where it left off.

* Snooze requires a note explaining the reason (e.g., “Customer waiting on financing approval, check back in 2 weeks”).

* If a customer approves or declines any estimate option in HCP, the sequence stops immediately.

* The admin can modify the default sequence template at any time. Changes apply in real-time to all estimates using that sequence — future/uncompleted steps reflect the new configuration, while historical events (sent, skipped, completed) are preserved as-is.

* The admin can pause an entire sequence via the "Pause Sequence" button. When paused, no new follow-up events are created and any pending events are skipped by the cron job. Steps and templates are preserved — clicking "Resume Sequence" reactivates follow-ups. New `is_active` column on `follow_up_sequences` table (SQL 011).

* The "Skip Step" button on the estimate detail page allows manually advancing past the current step without sending it. The step is marked as "Skipped" in the timeline and the sequence advances to the next step.

* The auto-decline threshold is admin-configurable (default 60 days). A "declining soon" warning fires to the comfort pro 3 days before auto-decline.

# **6\. Data Model**

The database is structured around the estimate pipeline as the primary workflow, with customers and campaigns as supporting entities.

| Table | Key Fields | Purpose |
| :---- | :---- | :---- |
| **users** | id, email, name, role (admin/comfort\_pro/csr), google\_id, created\_at | Team members with role-based access. |
| **customers** | id, email, phone, name, address, equipment\_type, last\_service\_date, lead\_source, tags\[\], hcp\_customer\_id, created\_at | Customer records synced from HCP. HVAC-specific fields for segmentation. |
| **estimates** | id, customer\_id, assigned\_to (user\_id), estimate\_number, hcp\_estimate\_id, status (sent/active/snoozed/won/lost/dormant), total\_amount, sent\_date, snooze\_until, snooze\_note, sequence\_step, auto\_decline\_date, online\_estimate\_url, created\_at | Parent estimate record. Tracks pipeline status and follow-up sequence position. Stores HCP customer-facing estimate URL for inclusion in follow-up templates via {{estimate\_link}}. |
| **estimate\_options** | id, estimate\_id, hcp\_option\_id, option\_number (1,2,3), description, amount, status (pending/approved/declined) | Individual options within an estimate. HCP option ID stored for two-way API sync. |
| **follow\_up\_sequences** | id, name, is\_default, is\_active, steps (JSONB array of: day\_offset, channel, template\_content, is\_call\_task), created\_by, created\_at | Company-level sequence templates. Admin-managed. `is_active` controls whether follow-ups execute (pause/resume without deleting steps). Templates support placeholders: {{customer\_name}}, {{customer\_email}}, {{comfort\_pro\_name}}, {{estimate\_link}}. |
| **leads** | id, source, customer\_name, email, phone, address, notes, status (new/contacted/qualified/moved\_to\_hcp/archived), assigned\_to, converted\_estimate\_id, hcp\_customer\_id, created\_at, updated\_at | Inbound leads from external sources (Flow 2). CSR manages status progression. "Move to HCP" creates customer+estimate in HCP and sets status to moved\_to\_hcp. Leads can be archived when they don't convert. |
| **follow\_up\_events** | id, estimate\_id, sequence\_step\_index, channel, status (scheduled/pending\_review/sent/opened/clicked/completed/skipped/snoozed), scheduled\_at, sent\_at, content, comfort\_pro\_edited, created\_at | Execution log for each step of each estimate’s sequence. Tracks what happened and when. |
| **notifications** | id, user\_id, type (email\_opened/click/call\_due/lead\_assigned/estimate\_status/declining\_soon), estimate\_id, message, read, created\_at | Real-time alerts for comfort pros and admins. |
| **campaigns** | id, name, type (email/sms), subject, content, segment\_filter (JSONB), batch\_size, status (draft/sending/sent), sent\_count, created\_by, created\_at | Phase 2: Broadcast marketing campaigns. |
| **campaign\_events** | id, campaign\_id, customer\_id, status (sent/opened/clicked/bounced/unsubscribed), created\_at | Phase 2: Per-recipient campaign tracking. |
| **user\_invites** | id, email, name, phone, role, invited\_by, created\_at | Pre-registered team member invites. When an invited user signs in with Google, their account is auto-provisioned and the invite is consumed. |
| **settings** | key, value, updated\_by, updated\_at | System configuration: auto\_decline\_days, sequence defaults, warm-up limits, etc. |

# **7\. Technical Architecture**

## **7.1 Tech Stack**

| Component | Technology | Notes |
| :---- | :---- | :---- |
| **Database** | Supabase (PostgreSQL) | Tables, Row Level Security, real-time subscriptions, database triggers for auto-segmentation. |
| **Authentication** | Supabase Auth | Google Workspace SSO. RLS policies enforce role-based data access. |
| **Frontend** | Next.js 16 (React 19) | Dashboard UI with dark mode. Hosted on Vercel. Uses App Router with server components. Middleware via proxy.ts (Next.js 16 convention). |
| **API Layer** | Vercel API Routes | Node.js serverless functions for all external API calls. Single runtime (no Deno). |
| **Scheduled Jobs** | Vercel Cron Jobs | Daily estimate status polling from HCP, sequence step execution, auto-decline processing. |
| **Email** | Resend | Transactional and marketing email. Domain verification, webhook for open/click tracking. |
| **SMS** | Twilio Hosted SMS | Two-way SMS via existing Comcast VoiceEdge number (425-261-9095) hosted on Twilio. Voice stays on Comcast. Outbound via Twilio Messaging Service (SID: MGd102dd6d19268d0e867c30f9457caf2f) using `messagingServiceSid` parameter, inbound via webhook. A2P 10DLC campaign registered ("Engage in a discussion") — required for carrier delivery. |
| **HVAC Data** | Housecall Pro API | GET estimates with status polling. POST to approve/decline options. Webhook for new records (v0.2). |
| **Styling** | Tailwind CSS v4 | Utility-first CSS with @theme inline tokens. Dark mode via @variant dark with class-based toggle. Responsive design for mobile field use. |
| **Charts** | Recharts | React-native charting library for pipeline and campaign analytics. |
| **Source Control** | GitHub | Version control with auto-deploy to Vercel on push. |
| **AI (Phase 3\)** | Anthropic Claude API | Content generation with HVAC-tailored prompts and daily token caps. |

## **7.2 Architecture Flow**

The system operates as three connected engines sharing a common database:

**Engine 1 — Estimate Pipeline (MVP):** Estimates arrive from HCP (CSV import or API polling). Each estimate is assigned to a comfort pro and enters the follow-up sequence. Automated messages send via Resend (email) and Twilio (SMS), with follow-up templates including styled "View Your Estimate" links to the HCP customer-facing estimate page. Call tasks generate notifications. Customer SMS replies are received via Twilio webhook and appear in real-time. The comfort pro manages their queue and replies to customer messages through the dashboard. Status changes sync back to HCP via POST API calls.

A second ingress path (Flow 2) handles leads from external sources — Facebook ads, Google ads, website forms, or manual entry. These arrive via an inbound webhook (/api/leads/inbound) and appear in the CSR's Leads tab. The CSR qualifies the lead, then clicks "Move to HCP" which creates the customer and estimate in Housecall Pro via API. The estimate then enters the standard pipeline automatically.

**Engine 2 — Notification Hub (MVP):** Real-time alerts powered by Supabase Realtime subscriptions. Fires when leads engage (email opens, link clicks), when tasks are due, when estimates are approved/declined in HCP, and when auto-decline is approaching. Drives the badge counter and activity feed in the comfort pro dashboard.

**Engine 3 — Campaign Broadcaster (Phase 2):** Bulk email sends to tagged/segmented customer lists. Includes audience builder with tag filters, contact frequency safeguards (“not contacted in X days”), do-not-disturb for active pipeline leads, and batch size controls for domain warm-up.

All three engines share the customer database and contact history. A broadcast campaign click from a dormant estimate lead can trigger a notification to the original comfort pro.

## **7.3 Integrations Map**

* Housecall Pro → Your System: GET /estimates for status polling (runs 3x daily via cron). Detects approvals and status changes. Note: HCP API does not expose customer-facing estimate URLs (opaque hash, not derivable). Estimate detail links to HCP pro view via option ID instead.

* Your System → Housecall Pro: POST /customers to create customers, POST /estimates to create estimates (used by Move to HCP in Flow 2). POST /estimates/options/decline with option\_ids array for auto-decline.

* External Sources → Your System: Inbound lead webhook (/api/leads/inbound) accepts leads from Zapier, Facebook Lead Ads, Google Ads, or direct POST. Secured with LEADS\_WEBHOOK\_SECRET.

* Your System → Resend: Send transactional follow-up emails and broadcast campaigns.

* Resend → Your System: Webhooks for open/click/bounce events.

* Your System → Twilio: POST outbound SMS for follow-up sequence texts and manual comfort pro replies.

* Twilio → Your System: Webhooks for inbound SMS from customers.

* Supabase Realtime → Frontend: Live notification updates, pipeline status changes.

# **8\. Non-Functional Requirements**

* Performance: Handle 5,000+ customers, sub-2-second page loads, real-time notification delivery via Supabase Realtime.

* Security: Google Workspace SSO only (no public access). Row Level Security on all tables. API keys stored in environment variables (Vercel/Supabase). HTTPS everywhere.

* Usability: Responsive design for mobile use by field staff. Navigation simplicity comparable to Housecall Pro. Comfort pros should be productive within 10 minutes of first use.

* Compliance: Opt-out/unsubscribe links on all marketing emails. CAN-SPAM compliance for broadcasts. Follow-up sequences respect customer opt-out preferences.

* Scalability: Free tiers initially. Upgrade path: Supabase Pro for more storage as customer base grows; Vercel Pro for higher function invocation limits.

* Reliability: Sequence steps must execute even if the dashboard is not open. Cron jobs handle all scheduled work server-side.

# **9\. Risks & Dependencies**

## **9.1 Risks**

* Email Deliverability: New sending domain (marketing@genesishvacr.com) needs warm-up period. Mitigation: Start with small batches, authenticate domain early, use Resend’s deliverability tools.

* Twilio A2P 10DLC Registration: Required for business SMS compliance. Messaging Service created, A2P campaign registered (February 20, 2026) — pending carrier approval. Without approval, US carriers silently drop outbound SMS (error 30034). Privacy policy (`/privacy`) and Terms & Conditions (`/terms`) pages created for compliance.

* HCP API Access: Housecall Pro’s API capabilities need verification (especially webhook availability for estimates). Mitigation: MVP uses CSV import; API integration is v0.2.

* Scope Creep: Feature requests during build could delay MVP. Mitigation: Strict MoSCoW adherence; nothing outside “MUST” for initial launch.

* AI Cost Overruns (Phase 3): Mitigation: Strict daily token caps with database tracking and manual fallback.

## **9.2 Dependencies**

* Accounts and API Keys Required: Supabase, Vercel, Resend, Twilio, Housecall Pro API, GitHub. Phase 3: Anthropic API.

* Tools: VS Code for development, GitHub for source control.

* Domain Setup: SPF, DKIM, DMARC records for genesishvacr.com must be configured before any email sends.

* Housecall Pro: Continued use as system of record for jobs, scheduling, and invoicing.

# **10\. Timeline & Milestones**

Estimated effort: 1–2 hours per day using AI-assisted code generation. Build guide structured as step-by-step cookbook instructions.

**MVP (Weeks 1–6):** Estimate pipeline, follow-up sequences, comfort pro dashboard, email/SMS sending, notifications, user auth, HCP CSV import, auto-decline with HCP API sync.

**Version 0.2 (Weeks 7–8):** HCP API polling for status updates, HCP webhooks for new estimates, open/click tracking with real-time notifications, pipeline analytics dashboard.

**Phase 2 (Weeks 9–12):** Broadcast campaign creation, customer segmentation and audience builder, campaign analytics, domain warm-up tooling, pre-built HVAC templates.

**Phase 3 (Ongoing):** AI content generation, weather-triggered campaigns, external lead capture (Webflow/Facebook/Google), A/B testing, advanced analytics.

# **11\. Success Criteria**

**MVP Launch:** Functional pipeline dashboard. Every new estimate automatically enters the follow-up sequence. Comfort pro can manage their queue, snooze leads, and complete call tasks.

**30-Day Check:** 90%+ of estimates receiving full sequence. Comfort pros using dashboard daily. First broadcast campaign sent. Total spend under $100.

**90-Day Check:** Measurable improvement in estimate conversion rate. Pipeline analytics informing sales process improvements. Marketing campaigns driving repeat business.