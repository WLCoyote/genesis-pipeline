

**Build Plan**

Genesis HVAC Estimate Pipeline & Marketing Platform

Version 3.0 — February 18, 2026

Genesis Services — Monroe, WA

Step-by-step cookbook for building with AI-assisted code generation

CONFIDENTIAL — Internal Use Only

# **How to Use This Build Plan**

This guide is structured as a sequential cookbook. Each step describes what to build, includes a prompt you can give Claude or Grok to generate the code, and provides a verification check so you know it works before moving on.

**Tools you need:** VS Code (code editor), a terminal/command line, a web browser, and a GitHub account.

**Working style:** For each step, read the description, copy the green PROMPT box text into Claude, paste the generated code into the specified file in VS Code, run the verification, and move on.

**Pace:** 1–2 hours per day. Don’t rush. Each phase should be fully working before you start the next one.

**IMPORTANT:** Always test each step before moving on. A bug in the database layer will cascade into every step that follows. Fix issues as they appear.

  **PHASE 0: Pre-Build Setup (Week 1, Days 1–2) ✅ COMPLETE**

Before writing any application code, set up all accounts, configure email authentication, and prepare your development environment.

**Step 0.1: Create Accounts and Gather API Keys**

Sign up for each service and record your credentials in a secure document (you will add these as environment variables later). Do not share these keys publicly or commit them to GitHub.

1. Supabase (supabase.com): Create a new project on the free tier. Record your Project URL, anon key, and service\_role key from Settings \> API.

2. Vercel (vercel.com): Sign up using your GitHub account. Free Hobby tier.

3. GitHub (github.com): Create a new private repository named genesis-pipeline.

4. Resend (resend.com): Sign up. Record your API key from the dashboard.

5. Twilio (twilio.com): Create a free account. Record your Account SID and Auth Token from the dashboard. Host your Comcast VoiceEdge number (425-261-9095) for SMS via Console > Phone Numbers > Port & Host > Host Numbers. Complete 10DLC registration in Console > Messaging > Compliance > 10DLC ($4–15 one-time). Number hosting takes 1–7 days, so start this early.

6. Housecall Pro: Access your API credentials from the developer/integrations section. Record your Bearer token.

**VERIFY:** You should have 6 sets of credentials documented securely: Supabase (URL \+ 2 keys), Vercel account, GitHub repo URL, Resend API key, Twilio (Account SID \+ Auth Token \+ hosted number confirmed), HCP Bearer token.

**Step 0.2: Configure Email Domain (SPF/DKIM/DMARC)**

**IMPORTANT:** Start this on Day 1\. Domain reputation takes time to build. Email deliverability depends on this being done correctly and early.

1. In Resend, go to Domains and add genesishvacr.com.

2. Resend will show you 3 DNS records to add: an SPF TXT record, a DKIM TXT record, and a DMARC TXT record.

3. Log into your domain’s DNS management (likely Google Domains or your registrar) and add each record exactly as Resend specifies.

4. Back in Resend, click Verify. It may take up to 48 hours for DNS propagation, but often completes within an hour.

5. Create the email address marketing@genesishvacr.com in Google Workspace Admin.

**VERIFY:** Resend dashboard shows genesishvacr.com as “Verified” with green checkmarks for SPF, DKIM, and DMARC.

**Step 0.3: Set Up Development Environment**

1. Install Node.js (version 18 or later) from nodejs.org if not already installed.

2. Install VS Code from code.visualstudio.com if not already installed.

3. Open a terminal in VS Code and verify: node \--version (should show v18+) and npm \--version.

4. Install the Vercel CLI: npm install \-g vercel

5. Install Git if not already installed: git \--version to check.

**VERIFY:** Running node \--version, npm \--version, vercel \--version, and git \--version all return version numbers without errors.

  **PHASE 1: Database & Authentication (Week 1, Days 3–5) ✅ COMPLETE**

**Build Notes:** All SQL scripts (001–007) executed in Supabase. Schema includes online\_estimate\_url on estimates table and leads table for Flow 2. Default sequence templates updated with {{estimate\_link}} placeholders. Realtime enabled on notifications, messages, and estimates tables.

Build the entire database schema, configure authentication, and set up Row Level Security. This is the foundation everything else depends on.

**Step 1.1: Create Database Schema**

In the Supabase dashboard, open the SQL Editor. You will run a single SQL script that creates all tables, relationships, indexes, and initial data.

**PROMPT CLAUDE:** *"Generate a complete SQL script for a Supabase PostgreSQL database with the following tables and exact fields. Include all foreign keys, indexes on commonly filtered columns, and a unique constraint on estimates.estimate\_number. Enable Row Level Security on all tables but don’t create policies yet (we’ll do that next). Include an INSERT for the settings table with default values: auto\_decline\_days \= 60, declining\_soon\_warning\_days \= 3\. Here are the tables: \[paste the complete data model from the Architecture doc, Section 3.1\]"*

Paste the generated SQL into the Supabase SQL Editor and click Run.

**VERIFY:** In Supabase Table Editor, you can see all tables listed: users, customers, estimates, estimate\_options, follow\_up\_sequences, follow\_up\_events, notifications, messages, campaigns, campaign\_events, settings. The settings table has one row with auto\_decline\_days \= 60\.

**Step 1.2: Configure Authentication**

1. In Supabase dashboard, go to Authentication \> Providers \> Google.

2. Enable the Google provider. You will need OAuth credentials from Google Cloud Console.

3. In Google Cloud Console: Create a new project (or use existing), go to APIs & Services \> Credentials, create an OAuth 2.0 Client ID (Web application type).

4. Set the authorized redirect URI to: https://\[YOUR-SUPABASE-PROJECT\].supabase.co/auth/v1/callback

5. Copy the Client ID and Client Secret back into Supabase’s Google provider settings.

6. To restrict to Genesis employees only: In Supabase Auth settings, you can add a domain allowlist for your Google Workspace domain.

**VERIFY:** In Supabase Auth dashboard, Google provider shows as enabled. You can test by clicking “Sign in with Google” in the Supabase Auth UI test page.

**Step 1.3: Create Row Level Security Policies**

**PROMPT CLAUDE:** *"Generate Supabase RLS policies for all my tables. The users table has a role column with values: admin, comfort\_pro, csr. Rules: Admin gets full read/write on everything. Comfort\_pro gets read/write on estimates, estimate\_options, follow\_up\_events, and notifications WHERE assigned\_to \= auth.uid() or user\_id \= auth.uid(). Comfort\_pro gets read-only on customers, follow\_up\_sequences, settings. CSR gets read/write on estimates (for creation and assignment), read on customers, no access to campaigns or settings. All tables should deny access to unauthenticated users. Use Supabase auth.uid() and a helper function that looks up the user’s role from the users table."*

Run the generated SQL in the Supabase SQL Editor.

**VERIFY:** In Supabase, go to Authentication \> Policies. Each table should show multiple policies listed. Try querying a table from the SQL editor using a test user’s context to confirm access controls work.

**Step 1.4: Create Default Follow-Up Sequence**

**PROMPT CLAUDE:** *"Generate a SQL INSERT for the follow\_up\_sequences table with a default sequence named 'Standard Estimate Follow-Up'. The steps JSONB array should contain these steps in order: Day 0 \- auto SMS \- estimate sent notification; Day 1 \- auto SMS \- follow-up check-in; Day 3 \- call task \- phone call prompt; Day 7 \- auto email \- value-add message with financing/rebates; Day 14 \- call task \- second phone call with engagement history; Day 21 \- auto email \- earn your business message; Day 30 \- auto SMS \- final active touch; Day 60 \- auto email \- last contact before auto-decline. Set is\_default to true."*

**VERIFY:** Query the follow\_up\_sequences table in Supabase. One row exists with is\_default \= true and 8 steps in the JSONB array.

**Step 1.5: Enable Realtime**

1. In Supabase dashboard, go to Database \> Replication.

2. Enable realtime for the notifications table (this is the primary table the frontend will subscribe to).

3. Enable realtime for the messages table (required for live conversation thread updates when customers reply to SMS).

4. Optionally enable for estimates if you want live pipeline updates across multiple browser sessions.

**VERIFY:** The Replication page shows notifications, messages (and optionally estimates) with realtime enabled.

  **PHASE 2: Backend API Routes & Cron Jobs (Weeks 2–3) ✅ COMPLETE**

**Build Notes:** All API routes built and tested. Next.js 16.1.6 with React 19. Middleware file is proxy.ts with exported proxy function (Next.js 16 convention, not middleware.ts). Three cron jobs configured in vercel.json: execute-sequences, poll-hcp-status, auto-decline. Additional routes built: /api/estimates/create, /api/estimates/[id]/snooze, /api/estimates/[id]/status, /api/estimates/[id]/reassign, /api/estimates/[id]/send-next (Send Now), /api/estimates/[id] (DELETE — admin only), /api/follow-up-events/[id], /api/admin/sequences, /api/admin/settings, /api/admin/invites, /api/admin/users, /api/admin/update-estimates (manual HCP polling), /api/leads, /api/leads/inbound, /api/leads/[id] (PATCH + DELETE), /api/leads/[id]/move-to-hcp, /api/inbox. Shared HCP polling logic extracted to `lib/hcp-polling.ts`.

Initialize the Next.js project and build all the serverless API routes that handle external service communication and scheduled jobs.

**Step 2.1: Initialize Next.js Project**

Open a terminal in VS Code:

1. Run: npx create-next-app@latest genesis-pipeline \--use-npm

2. When prompted: select Yes for TypeScript (recommended for catching errors), Yes for Tailwind CSS, Yes for App Router, defaults for everything else.

3. cd genesis-pipeline

4. Run: npm install @supabase/supabase-js @supabase/ssr resend recharts

**Actual versions used:** Next.js 16.1.6, React 19, Tailwind CSS v4, @supabase/ssr for cookie-based auth.

5. Initialize git: git init, then connect to your GitHub repo: git remote add origin \[YOUR-REPO-URL\]

6. Create a .env.local file in the project root with your keys (never commit this file):

**TIP:** Add .env.local to your .gitignore file (Next.js does this by default, but verify).

**PROMPT CLAUDE:** *"Generate a .env.local template file for a Next.js project that uses Supabase, Resend, Twilio, and Housecall Pro. Include placeholder values with comments explaining each variable. Variables needed: NEXT\_PUBLIC\_SUPABASE\_URL, NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY, SUPABASE\_SERVICE\_ROLE\_KEY, RESEND\_API\_KEY, TWILIO\_ACCOUNT\_SID, TWILIO\_AUTH\_TOKEN, TWILIO\_PHONE\_NUMBER, HCP\_BEARER\_TOKEN, HCP\_API\_BASE\_URL."*

**VERIFY:** Run npm run dev in the terminal. Your browser opens to localhost:3000 showing the default Next.js welcome page.

**Step 2.2: Create Supabase Client Utilities**

**PROMPT CLAUDE:** *"Generate two Supabase client utility files for a Next.js App Router project using @supabase/ssr. One for client-side use (uses anon key, for React components) and one for server-side use (uses service\_role key, for API routes). Follow Supabase’s recommended patterns for Next.js App Router with cookies-based auth."*

**VERIFY:** Both files exist in your project (typically in a lib/ or utils/ directory). No import errors when referenced.

**Step 2.3: Build Email Sending API Route**

This API route sends a single email via Resend. It will be called by the cron job and by the frontend for manual sends.

**PROMPT CLAUDE:** *"Generate a Next.js App Router API route at /api/send-email that accepts POST requests with: to (email address), subject, html (email body), and estimate\_id. It should send the email via the Resend SDK from marketing@genesishvacr.com, then log the result to the follow\_up\_events table in Supabase using the service role client. Include error handling. Return the Resend message ID on success."*

**VERIFY:** Use Postman or curl to POST to localhost:3000/api/send-email with test data. Check your email inbox for delivery. Check Supabase follow\_up\_events table for the logged record.

**Step 2.4: Build SMS Sending API Route**

**PROMPT CLAUDE:** *"Generate a Next.js App Router API route at /api/send-sms that accepts POST requests with: to (phone number), message (text content), customer_id, and estimate_id. It should: 1) Send the SMS via the Twilio REST API using the hosted Comcast number (from TWILIO_PHONE_NUMBER env var). 2) Log the result to follow_up_events in Supabase (for sequence-triggered sends). 3) Also log the outbound message to the messages table with direction=outbound, the customer_id, estimate_id, twilio_message_sid, and sent_by (the user_id if it's a manual reply, null if automated). Include error handling. If Twilio returns an error, log the failure but don't throw (so the sequence can continue). Use the Twilio Node.js SDK."*

**TIP:** Test with your own phone number first. Verify the message appears to come from 425-261-9095.

**VERIFY:** Send a test SMS to your personal phone. Confirm delivery and correct sender number. Check Supabase follow_up_events AND messages tables for the logged records.

**Step 2.4b: Build Twilio Inbound SMS Webhook**

**PROMPT CLAUDE:** *"Generate a Next.js App Router API route at /api/webhooks/twilio that handles incoming SMS from Twilio. It should: 1) Validate the Twilio request signature (X-Twilio-Signature header) for security. 2) Extract the From number, Body, and MessageSid from the request. 3) Match the From phone number to a customer record in the customers table. 4) If a matching customer is found and they have an active estimate (status=active or snoozed), create a message record with direction=inbound, the customer_id, estimate_id, body, and twilio_message_sid. 5) Create a notification (type: sms_received) for the comfort pro assigned to that estimate. 6) If no matching customer is found, log the message with customer_id=null for admin review. 7) Return a valid TwiML response (empty <Response></Response> so Twilio doesn't retry). Use the Supabase service role client."*

After deploying to Vercel, configure the webhook URL in your Twilio Console under your hosted number's Messaging settings: set the webhook to https://[YOUR-DOMAIN]/api/webhooks/twilio.

**VERIFY:** Send a text from your personal phone to 425-261-9095. Check Supabase: a message record should exist with direction=inbound and the correct customer match. A notification should appear for the assigned comfort pro.

**Step 2.5: Build Sequence Execution Cron Job**

This is the heart of the follow-up engine. It runs on a schedule, checks for due sequence steps, and executes them.

**PROMPT CLAUDE:** *"Generate a Next.js App Router API route at /api/cron/execute-sequences that does the following: 1\) Query all estimates with status \= 'active' that are NOT snoozed (snooze\_until is null or in the past). 2\) For each, get the follow\_up\_sequence and find the next step based on sequence\_step\_index. 3\) Check if that step is due (sent\_date \+ step.day\_offset \<= today). 4\) If the step is a call task: create a follow\_up\_event with status 'scheduled' and a notification for the assigned comfort pro. 5\) If the step is an auto-send: create a follow\_up\_event with status 'pending\_review' and scheduled\_at \= now \+ 30 minutes. 6\) Also process any pending\_review events where scheduled\_at has passed: call /api/send-email or /api/send-sms as appropriate, update status to 'sent', and increment the estimate’s sequence\_step\_index. 7\) Use the Supabase service role client. Include error handling per-estimate so one failure doesn’t stop the batch."*

Then create the vercel.json cron configuration:

**PROMPT CLAUDE:** *"Generate a vercel.json file that configures a cron job to hit /api/cron/execute-sequences every 2 hours between 8am and 8pm Pacific time. Include a CRON\_SECRET environment variable check so the endpoint can’t be called by random people."*

**VERIFY:** Insert a test estimate with sent\_date \= today and sequence\_step\_index \= 0\. Manually hit the cron endpoint via browser or curl. Check: a follow\_up\_event should be created, and if the 30-min window passes, a second hit should trigger the actual send.

**Step 2.6: Build HCP Status Polling Cron Job**

**Build Notes (v2.5 update):** Rewritten to handle both new estimate detection and existing estimate updates. Filters out estimates older than auto\_decline\_days. New estimates enter the pipeline only when sent to the customer (option status = "submitted for signoff") or already resolved (approval\_status = "approved"/"declined"). This is the primary ingress path for all estimates — both Flow 1 (created directly in HCP) and Flow 2 (created via Move to HCP). HCP API response includes: estimate.options[].status, estimate.options[].approval\_status, estimate.options[].updated\_at, estimate.schedule.scheduled\_start, and estimate.assigned\_employees[] for comfort pro assignment.

**Build Notes (v2.8 update — HCP API parameter fix):** The HCP GET /estimates endpoint does NOT support `start_date`/`end_date` parameters — they are silently ignored, returning all 2,140+ estimates. `scheduled_start_min`/`max` filter by appointment date, not creation date — also not useful. Now fetches newest-first with no API date filters and filters by `created_at` in code. Uses `page_size=200`, `sort_direction=desc`. Polling module (`lib/hcp-polling.ts`) rewritten with: pre-fetched local estimate index using JavaScript Sets for O(1) dedup, page-by-page processing, MAX\_PAGES=5 cap, 30s AbortController timeout per fetch. Returns `{ new_estimates, updated, won, lost, skipped, errors, pages_fetched }`.

**Build Notes (v2.9 update — HCP field mapping corrections):** Sent detection uses `option.status = "submitted for signoff"` (NOT `approval_status = "awaiting response"`). Also pulls in already-resolved estimates (`approval_status = "approved"/"declined"`) for initial sync — maps to won/lost locally. Customer name priority: `customer.company` > first+last name > "Unknown" (`company_name` field is the HCP account company, not the customer). HCP amounts in cents — divided by 100. Sent date from `option.updated_at` (submitted) or `estimate.schedule.scheduled_start` (resolved), with `created_at` fallback. Existing estimate updates do full refresh: customer info, amounts, options, sent_date. Estimates list sorted newest to oldest.

**Functionality:** The cron route at /api/cron/poll-hcp-status: 1\) Reads auto\_decline\_days from settings. 2\) Calls GET /estimates with `page_size=200&sort_direction=desc`, filters by `created_at` age in code. 3\) For each HCP estimate, checks if it exists locally by hcp\_estimate\_id or estimate\_number. 4\) **New estimates:** If not in local DB and any option has `status = "submitted for signoff"` or `approval_status = "approved"/"declined"` → creates local customer (name from `customer.company` > first+last > Unknown), creates estimate (amounts / 100 for cents→dollars, sent\_date from `option.updated_at` or `schedule.scheduled_start`), assigns comfort pro, enrolls active estimates in sequence. 5\) **Existing estimates:** Full refresh — updates customer info, estimate amounts/URL/sent\_date, option amounts/descriptions/statuses. Detects won/lost from approval\_status changes, stops sequence, notifies. 6\) Uses Supabase service role client.

**VERIFY:** Create an estimate in HCP, send it to a customer. Run the cron endpoint. Confirm: estimate appears in the pipeline with status "active" and is enrolled in the follow-up sequence. Then approve the estimate in HCP, run again, confirm status moves to "won".

**Step 2.7: Build Auto-Decline Cron Job**

**PROMPT CLAUDE:** *"Generate a Next.js API route at /api/cron/auto-decline that: 1\) Reads auto\_decline\_days and declining\_soon\_warning\_days from settings. 2\) Finds all estimates where status is active/snoozed AND auto\_decline\_date \<= today. 3\) For each: collect all pending hcp\_option\_ids, POST to https://api.housecallpro.com/estimates/options/decline with body { option\_ids: \[...\] } using Bearer token auth. 4\) Update all estimate\_options to declined, set estimate status to lost, create a notification for the comfort pro. 5\) Also find estimates approaching auto-decline (within warning days) and create declining\_soon notifications if one hasn’t been sent yet."*

**VERIFY:** Create a test estimate with auto\_decline\_date \= today. Run the endpoint. Confirm: HCP API was called (check HCP for the declined estimate), local status updated to lost, notification created.

**Step 2.8: Build Resend Webhook Handler**

**PROMPT CLAUDE:** *"Generate a Next.js API route at /api/webhooks/resend that handles incoming webhooks from Resend for email events (opened, clicked, bounced, unsubscribed). It should: 1\) Verify the webhook signature for security. 2\) Match the event to a follow\_up\_event record using the Resend message ID. 3\) Update the follow\_up\_event status accordingly. 4\) For opened and clicked events: create a notification for the comfort pro assigned to that estimate (so they know the lead is engaging). 5\) Use Supabase service role client."*

After deploying to Vercel, configure the webhook URL in your Resend dashboard under Webhooks.

**VERIFY:** Send a test email, open it, and click a link. Check Supabase: the follow\_up\_event should show updated status, and a notification should exist for the comfort pro.

**Step 2.9: Build CSV Import API Route**

**PROMPT CLAUDE:** *"Generate a Next.js API route at /api/import/csv that accepts a multipart form upload of a CSV file from Housecall Pro. It should: 1\) Parse the CSV rows. 2\) For each row: upsert a customer record (match on hcp\_customer\_id, create if new, update if exists). 3\) Create or update an estimate record (dedup on estimate\_number using the unique constraint — use ON CONFLICT). 4\) Create estimate\_options from the CSV data if option columns exist. 5\) For new estimates: auto-assign the comfort pro based on the CSV field, set status to active, set auto\_decline\_date based on settings, enroll in the default follow-up sequence. 6\) Return a summary: X customers created, Y updated, Z estimates created, W already existed. Use Supabase service role client."*

**TIP:** Export a small test batch from HCP (5–10 records) and examine the CSV columns carefully. Share the column headers with Claude so it can map them correctly.

**VERIFY:** Upload a test CSV via Postman. Check Supabase: customers and estimates populated correctly. Upload the same CSV again: no duplicates created, existing records updated.

  **PHASE 3: Frontend Dashboard (Weeks 3–5) ✅ COMPLETE**

**Build Notes:** All 7 steps completed plus additional features. Built with server components for pages and client components for interactivity. Tailwind CSS v4 with @theme inline tokens. Dark mode support across all pages and components with class-based toggle, localStorage persistence, and system preference detection on first visit. Admin team management with invite-based user provisioning (Step 3.11). SMS Inbox for unmatched inbound messages with thread view, reply, dismiss, and convert-to-lead (Step 3.12). Manual "Update Estimates" button for on-demand HCP polling (Step 3.13). Admin delete for estimates and leads (Step 3.14). Lead archiving with collapsible section (Step 3.15). "Send Now" button for due sequence steps (Step 3.16). Moved-to-HCP leads in archived section (Step 3.17). Full sequence timeline + skip step (Step 3.18). Sequence pause/resume toggle (Step 3.19).

Build the user-facing dashboard. Start with authentication, then the comfort pro's primary view, then admin features.

**Step 3.1: Build Authentication Flow**

**PROMPT CLAUDE:** *"Generate a Next.js App Router authentication flow using Supabase Auth with Google SSO. Include: a login page with a 'Sign in with Google' button, middleware that redirects unauthenticated users to the login page, a layout wrapper that loads the current user and their role from the users table, and a sign-out button. Use @supabase/ssr for cookie-based sessions. The app should redirect to /dashboard after successful login."*

**VERIFY:** Visit localhost:3000. You are redirected to the login page. Click Sign in with Google. After auth, you land on /dashboard. Refresh the page — you stay logged in.

**Step 3.2: Build the Comfort Pro Estimate List (Primary Screen)**

This is the most important screen in the app. It’s where the comfort pro lives every day.

**PROMPT CLAUDE:** *"Generate a Next.js React component for the comfort pro’s estimate pipeline view at /dashboard. It should show a table/list of estimates assigned to the current user with columns: Customer Name, Estimate Amount, Status (color-coded badge: green for active, yellow for snoozed, blue for won, red for lost, gray for dormant), Sent Date, Last Contacted date, and small counter badges for: emails sent, texts sent, calls made, and email opens. Each counter should pull from follow\_up\_events for that estimate. Include filters: a dropdown for status, a search box for customer name, and a default sort by 'needs action' (estimates with due follow-up steps first, then by last contacted ascending). Use Tailwind CSS for styling. Make it responsive for mobile. Each row should be clickable to open a detail view."*

**VERIFY:** Insert 5–10 test estimates in Supabase with varying statuses. Log in as a comfort pro. The list shows only your assigned estimates with correct counters and sorting.

**Step 3.3: Build the Estimate Detail View**

**PROMPT CLAUDE:** *"Generate a detail page/modal for a single estimate that shows: customer info (name, email, phone, address, equipment type), estimate options listed with amounts and statuses, the complete follow-up timeline (all follow\_up\_events in chronological order showing what was sent, when, and engagement status with icons for sent/opened/clicked), a snooze button that opens a form to set snooze duration and require a note, a button to view/edit the next pending message before it auto-sends, and buttons to manually mark the estimate as won or lost. Use Tailwind CSS. Include a prominent 'Call Now' button that shows the customer’s phone number."*

**VERIFY:** Click into a test estimate. All sections render with correct data. Snooze the estimate, refresh, and confirm the status changed and snooze note appears.

**Step 3.4: Build the Notification System**

**PROMPT CLAUDE:** *"Generate a notification bell component for the dashboard header that: shows an unread count badge, opens a dropdown panel showing recent notifications (type icon, message, timestamp, link to related estimate), uses Supabase Realtime to subscribe to new notifications for the current user and update the count live without page refresh, and marks notifications as read when clicked. Use Tailwind CSS. Include notification types: email\_opened (eye icon), link\_clicked (cursor icon), call\_due (phone icon), lead\_assigned (user icon), estimate\_approved (checkmark), estimate\_declined (x mark), declining\_soon (warning triangle), sms\_received (message bubble icon)."*

**VERIFY:** Open the dashboard in one tab. In another tab or via Supabase, insert a notification for your user. The bell counter should increment in real-time without refreshing.

**Step 3.5: Build the Admin View**

**PROMPT CLAUDE:** *"Generate an admin dashboard page that shows: a pipeline overview with counts for each estimate status (active, snoozed, won, lost, dormant) displayed as summary cards, a full estimate list (all users, not filtered by assignment) with the same columns as the comfort pro view plus an 'Assigned To' column, and a section for managing follow-up sequence templates with a form to edit the default sequence steps (day offset, channel type, template content, is\_call\_task toggle for each step). Include a settings section with inputs for auto\_decline\_days and declining\_soon\_warning\_days that save to the settings table. Only accessible to users with role \= admin."*

**VERIFY:** Log in as admin. You see all estimates across all comfort pros. Change auto\_decline\_days to 90, refresh, confirm it saved. Edit a sequence step and verify the change in Supabase.

**Step 3.6: Build the CSV Import Interface**

**PROMPT CLAUDE:** *"Generate an admin-only page at /dashboard/import with a file upload zone (drag and drop or click to browse) that accepts .csv files. When a file is selected, show a preview of the first 5 rows. Include a column mapping step where the admin can match CSV columns to system fields (customer name, email, phone, estimate number, assigned to, etc.) using dropdowns. After mapping, show a 'Start Import' button that POSTs to /api/import/csv. Display a progress indicator and the final summary (X created, Y updated, etc.). Use Tailwind CSS."*

**VERIFY:** Export a real CSV from HCP. Upload it. Map the columns. Run the import. Check Supabase for correctly populated records.

**Step 3.7: Build CSR Functionality**

**PROMPT CLAUDE:** *"Generate a CSR-specific dashboard view that shows: incoming lead list (all recent estimates), ability to create a new estimate record manually (customer name, email, phone, estimate number, select comfort pro from dropdown), ability to reassign an estimate to a different comfort pro, and a read-only view of customer records. CSR should NOT see: sequence template settings, campaign features, or system settings. Use the same component patterns as the comfort pro view but without the snooze/edit capabilities."*

**VERIFY:** Log in as a CSR user. Create a new estimate, assign it to a comfort pro. Log in as that comfort pro and confirm the estimate appears in their queue.

**Step 3.8: Flow 2 — Inbound Lead Management (Added)**

Built the Genesis-first lead ingestion flow for leads from external sources (Facebook ads, Google ads, website forms):

- **Inbound webhook** at /api/leads/inbound — accepts POST with flexible field names, secured with LEADS\_WEBHOOK\_SECRET
- **Leads tab** in dashboard — CSR view showing all leads with status badges (new/contacted/qualified/converted/closed)
- **Lead management** — create leads manually, update status, add notes
- **Move to HCP button** — creates customer + estimate in Housecall Pro via API (with required default option). Does NOT create a local estimate — the estimate enters the pipeline later when the HCP polling cron detects it has been sent (option approval\_status = "awaiting response")
- **Lead editing** — inline edit form on each lead card (PATCH /api/leads/[id]) for updating contact info, status, notes, assignment
- **HCP lead source sync** — "Sync HCP Lead Sources" button in Settings fetches lead sources from HCP API (GET /lead\_sources) and stores them. Lead source dropdowns in Create Lead and Edit Lead forms use synced HCP values
- **LeadsTabs, CreateLeadForm, LeadCard, MoveToHcpButton** components

**VERIFY:** POST a test lead to /api/leads/inbound. It appears in the Leads tab. Edit the lead to update info. Click "Move to HCP" — customer and estimate created in HCP. Lead status updates to converted. Estimate does NOT appear in pipeline yet — it appears after the comfort pro sends it in HCP and the polling cron picks it up.

**Step 3.9: Estimate Link Integration (Added)**

Integrated HCP customer-facing estimate URLs into the follow-up pipeline:

- **online\_estimate\_url** field on estimates table stores the HCP estimate URL (format: https://client.housecallpro.com/estimates/{hash})
- **{{estimate\_link}} placeholder** in sequence templates replaced with actual URL during execution
- **Email templates** use styled HTML button ("View Your Estimate") — no raw URLs
- **SMS templates** show URL on its own line (SMS can't render hyperlinks)
- **Estimate detail page** shows "View Estimate in HCP" link in actions panel
- SQL script 006\_estimate\_url.sql added the column; 007\_update\_sequence\_with\_links.sql updated templates

**VERIFY:** View an estimate with online\_estimate\_url set. The "View Estimate in HCP" link appears. Check follow-up event content — estimate link is properly inserted.

**Step 3.10: Dark Mode (Added)**

Added full dark mode support across the entire application:

- **DarkModeToggle** component in header with sun/moon icons
- **Class-based dark mode** via Tailwind v4 @variant dark
- **localStorage persistence** — remembers user's preference
- **System preference detection** on first visit via prefers-color-scheme media query
- **SSR-safe** — inline script in \<head\> prevents flash of wrong theme
- All 35+ components and pages updated with dark: Tailwind class variants

**VERIFY:** Click the moon icon in the header. Entire app switches to dark theme. Refresh — stays dark. Clear localStorage — respects system preference.

**Step 3.11: Team Management (Added)**

Built admin team management with invite-based user provisioning:

- **user\_invites table** — SQL script 008\_user\_invites.sql. Stores pending invites with email, name, phone, role. RLS: admin-only.
- **Auth callback updated** — After Google sign-in, checks for matching invite by email. If found, auto-creates `users` row and deletes invite. Uses service role client since new user has no RLS access yet.
- **Admin Team page** at /dashboard/admin/team — shows current team members with inline role editing and activate/deactivate. "Invite Member" form for pre-registering new users.
- **Pending invites section** — shows outstanding invites with revoke button.
- **API routes**: /api/admin/invites (POST create, DELETE revoke), /api/admin/users (PATCH role/is\_active)
- **Safety guard** — admin cannot deactivate their own account
- **Sidebar updated** — "Team" link added for admin role. Fixed double-highlight bug where child routes (e.g., Settings) also highlighted parent (Overview).

**VERIFY:** Go to Team page. Invite a test user with an email. Sign in with that Google account in an incognito window — user auto-provisions with correct role. Back as admin, change their role and deactivate them.

**Step 3.12: SMS Inbox for Unmatched Messages (Added)**

Added an inbox system for inbound SMS messages that don't match an active estimate:

- **SQL migration 009** — Added `phone_number` (text) and `dismissed` (boolean, default false) columns to messages table. phone_number stores the external party's number for thread grouping.
- **Twilio webhook updated** — When an inbound SMS has no assigned comfort pro (no matching customer or no active estimate), creates `unmatched_sms` notifications for all active admins and CSRs.
- **send-sms route updated** — Now logs outbound messages even without a customer_id, and stores phone_number on all messages.
- **New `/api/inbox` route** — GET returns unmatched SMS threads grouped by phone_number. POST sends a reply. PATCH dismisses a thread by phone_number. Admin + CSR only.
- **New `/dashboard/inbox` page** — Thread list on left, conversation view on right. Reply box at bottom of conversation. Action buttons: "Convert to Lead" (navigates to Leads page with phone pre-filled), "Dismiss" (soft-deletes the thread).
- **Sidebar updated** — "Inbox" link added for admin and CSR roles.
- **Notification routing** — `unmatched_sms` notifications in the bell link to the Inbox page.
- **CreateLeadForm updated** — Accepts `prefillPhone` prop to pre-populate phone from inbox conversion.

**VERIFY:** Send a text from an unknown number to the business phone. Admin/CSR should see an `unmatched_sms` notification. Click it to go to Inbox. See the message thread. Reply from inbox. Click "Convert to Lead" — goes to Leads page with phone pre-filled. Click "Dismiss" — thread disappears.

**Step 3.13: Manual Update Estimates Button (Added)**

Added an "Update Estimates" button so admin/CSR can trigger HCP polling on demand instead of waiting for the cron:

- **Shared polling module** `lib/hcp-polling.ts` — extracted from cron route. Handles pagination, new estimate detection, existing estimate updates. Returns results summary.
- **Admin route** POST /api/admin/update-estimates — session auth (admin + CSR), calls shared polling function.
- **Cron route rewritten** — thin wrapper around same shared function. ~29 lines.
- **UpdateEstimatesButton component** — loading state, result display ("Found: 3 new, 2 updated"), auto-refresh.
- Button appears on both `/dashboard/estimates` and `/dashboard/leads` (Estimates tab).

**VERIFY:** Click "Update Estimates" on the Estimates page. If estimates exist in HCP that have been sent to customers, they should appear locally.

**Step 3.14: Admin Delete for Estimates and Leads (Added)**

Admin-only delete functionality for cleaning up mistakes:

- **DELETE /api/estimates/[id]** — clears leads.estimate\_id FK first, then deletes estimate (cascades to options, events, notifications; SET NULL on messages). Admin only.
- **DELETE /api/leads/[id]** — simple delete. Admin only.
- **EstimateActions component** — "Delete Estimate" link at bottom of actions panel with confirmation dialog. Redirects to estimates list after delete.
- **LeadCard component** — red "Delete" button visible to admin only, with confirmation dialog.

**VERIFY:** As admin, open an estimate detail → click "Delete Estimate" → confirm → estimate removed, redirected to list. On Leads tab, click "Delete" on a lead → confirm → lead removed.

**Step 3.15: Lead Archiving (Added)**

Archive leads that don't convert to keep the active list clean:

- **SQL migration 010** — adds "archived" to leads status CHECK constraint.
- **LeadCard component** — "Archive" button on active leads, "Unarchive" button on archived leads.
- **ArchivedLeadsSection component** — collapsible section below active leads showing count, expands on click.
- **Leads page** — separate queries for active vs archived leads. Active leads exclude both "moved\_to\_hcp" and "archived".
- **lib/types.ts** — "archived" added to LeadStatus type.

**VERIFY:** Click "Archive" on a lead → disappears from active list, appears in collapsed "Archived" section. Click "Unarchive" → returns to active list.

**Step 3.16: Send Now Button for Due Sequence Steps (Added)**

Added a "Send Now" button on the estimate detail page for immediately sending due sequence steps:

- **API route** POST /api/estimates/[id]/send-next — validates step is due, no existing event, sends via Twilio (SMS) or Resend (email) immediately, logs to messages table, creates follow\_up\_event as "sent", advances step index. Skips gracefully if customer has no phone/email.
- **EstimateActions component** — green "Day 0 · SMS ready" banner with "Send Now" button. Shows result after sending. Hidden if step isn't due or already scheduled.
- **Estimate detail page** — joins follow\_up\_sequences to compute next due step, passes to EstimateActions.
- **Workflow**: Send estimate in HCP → click "Update Estimates" → click into estimate → click "Send Now" → customer gets Day 0 text immediately.

**VERIFY:** After pulling a new estimate via Update Estimates, open its detail page. The green "Send Now" banner should appear for the Day 0 step. Click it — step sends immediately, timeline updates.

**Step 3.17: Moved-to-HCP Leads in Archived Section (Added)**

Leads with status "moved\_to\_hcp" now appear in the archived section instead of disappearing:

- **Leads page** — archived query includes both "archived" and "moved\_to\_hcp" statuses.
- **LeadCard** — displays "Moved to HCP" as the status label (not raw "moved\_to\_hcp").
- **Status badge** — purple style for moved\_to\_hcp, visually distinct from gray archived leads.

**VERIFY:** Move a lead to HCP. It should appear in the collapsed "Archived" section with a purple "Moved to HCP" badge.

**Step 3.18: Full Sequence Timeline + Skip Step (Added)**

Rewrote the follow-up timeline on the estimate detail page to show all steps from the assigned sequence, not just events that have been created:

- **FollowUpTimeline rewrite** — merges sequence steps with follow\_up\_events. Each step shows: step number, channel icon, "Day X" label, and a status badge. Events overlay on sequence steps for executed history; steps without events show contextual status.
- **Status display logic**: Has event → show actual event status (Sent, Opened, Skipped, etc.). No event + past current index → "Skipped" (estimate imported late). No event + current index → "Current Step" (blue highlight). No event + future → "Upcoming" with projected due date. Won/lost/dormant → "Not Reached" (dimmed).
- **History preservation** — executed steps show the event's actual channel (what was really sent), not the current sequence's channel. Orphaned events (from steps removed from the sequence) still display.
- **Skip Step API** — POST /api/estimates/[id]/skip-step. Marks any pending\_review/scheduled event as skipped, or inserts a new skipped event. Advances sequence\_step\_index. Does not send anything.
- **Skip Step button** — appears in EstimateActions next to Snooze. Outlined gray style. Confirm dialog: "Skip step X of Y?"
- **Cron Phase 2 safety** — before sending pending\_review events, validates the step still exists in the current sequence and the estimate is still active. If sequence was shortened/cleared or estimate status changed, marks event as skipped.

**VERIFY:** Open an active estimate — all sequence steps show. Click "Skip Step" → current step marked skipped, sequence advances. Import a late estimate → early steps show as "Skipped". Open a won/lost estimate → remaining steps show "Not Reached".

**Step 3.19: Sequence Pause/Resume Toggle (Added)**

Added ability for admin to pause all follow-ups without deleting step configuration:

- **SQL migration 011** — `ALTER TABLE follow_up_sequences ADD COLUMN is_active boolean NOT NULL DEFAULT true;`
- **SequenceEditor updated** — "Pause Sequence" / "Resume Sequence" button next to Save. Active/Paused badge next to sequence name. Yellow banner when paused: "Sequence is paused. No new follow-ups will be sent. Your steps are saved and will resume when you reactivate."
- **API PATCH endpoint** — `/api/admin/sequences` PATCH accepts `{ id, is_active }` to toggle pause state. Admin-only.
- **Cron Phase 1** — skips estimates whose sequence has `is_active = false`. No new events created.
- **Cron Phase 2** — skips pending\_review events whose sequence has `is_active = false`. Marks as skipped.
- **Types updated** — `is_active: boolean` added to `FollowUpSequence` interface.

**VERIFY:** Go to Admin > Sequences. Click "Pause Sequence" → badge changes to "Paused", yellow banner appears. Active estimates stop receiving follow-ups. Click "Resume Sequence" → follow-ups resume from where they left off.

  **PHASE 4: Deployment & End-to-End Testing (Week 5–6)**

**Status:** In progress. Deployed to Vercel Pro. GitHub auto-deploy configured. Resend webhook configured. Non-SMS E2E tests passing. HCP polling cron and Move to HCP rewritten (v2.5 flow correction complete). Manual Update Estimates button, admin delete, lead archiving, Send Now, and moved-to-HCP archived display added. Remaining: Twilio verification, SMS tests, optional custom domain.

**Build Notes (v3.0):** SQL migrations 001-011 all run. 011 adds `is_active` to follow\_up\_sequences.

**Build Notes (v2.9):** Deployed to Vercel Pro (required for multi-daily cron jobs). Framework preset set to Next.js. Supabase auth redirect URLs configured for production. Resend webhook pointing to production. Vercel auto-deploys from GitHub pushes to main. During testing, discovered and fixed: HCP requires options array for estimate creation, HCP lead\_source must match predefined values (now synced via API), functions can't be serialized from server to client components in React 19, Vercel 504 timeout on polling routes (maxDuration bumped to 300s), React hydration error #418 in DarkModeToggle (render placeholder until mounted), total amount calculation summing alternatives instead of using HCP total, HCP GET /estimates ignores `start_date`/`end_date` and `scheduled_start` filters by appointment date not creation (now fetches newest-first with no date filter, filters by `created_at` in code). HCP sent detection uses `option.status = "submitted for signoff"` (not `approval_status`). Customer name from `customer.company` > first+last (not `company_name` which is HCP account). HCP amounts in cents (divide by 100). Sent date from `option.updated_at` or `schedule.scheduled_start`. Full refresh on existing estimates. Estimates sorted newest to oldest. HCP polling in shared `lib/hcp-polling.ts` — pre-fetched index, page-by-page, MAX\_PAGES=5, 30s timeouts. Cron is thin wrapper. SQL migrations 001-010 all run.

**Step 4.1: Deploy to Vercel**

1. Commit all code: git add . && git commit \-m "MVP ready" && git push origin main

2. In Vercel dashboard: click New Project, import your genesis-pipeline GitHub repo.

3. Add all environment variables from your .env.local into Vercel’s Environment Variables settings.

4. Add one additional variable: CRON\_SECRET with a random string (used to protect cron endpoints).

5. Deploy. Vercel will build and provide you a URL (e.g., genesis-pipeline.vercel.app).

6. Update your Supabase auth redirect URL to include the Vercel domain.

**VERIFY:** Visit your Vercel URL. The login page loads. Sign in with Google. Dashboard renders with your test data.

**Step 4.2: Configure Custom Domain (Optional)**

If you want a custom domain like pipeline.genesishvacr.com:

1. In Vercel, go to your project Settings \> Domains and add pipeline.genesishvacr.com.

2. Add the DNS records Vercel provides (CNAME or A record) to your domain’s DNS.

3. Update Supabase auth redirect URL to include the custom domain.

**Step 4.3: Configure Resend Webhook**

1. In Resend dashboard, go to Webhooks.

2. Add a new webhook pointing to: https://\[YOUR-DOMAIN\]/api/webhooks/resend

3. Select events: email.opened, email.clicked, email.bounced, email.unsubscribed.

4. Copy the webhook signing secret into your Vercel environment variables.

**Step 4.3b: Configure Twilio Webhook**

1. In Twilio Console, go to Phone Numbers > Your hosted number (425-261-9095).

2. Under Messaging, set the webhook URL for "A MESSAGE COMES IN" to: https://\[YOUR-DOMAIN\]/api/webhooks/twilio

3. Set the HTTP method to POST.

4. Verify your TWILIO\_AUTH\_TOKEN is in your Vercel environment variables (used for signature validation).

**Step 4.4: End-to-End Testing Checklist**

Run through each of these scenarios with real (but small-scale) data:

1. CSV Import: Export 10 estimates from HCP. Import via dashboard. Verify customer and estimate records created correctly with proper assignments.

2. Sequence Activation: Confirm imported estimates entered follow-up sequences. Wait for (or manually trigger) the cron job. Verify Day 0 SMS sends to the correct phone number from 425-261-9095.

3. Notification Flow: Open a follow-up email on your phone. Check the dashboard — the notification bell should update showing the email was opened.

4. Snooze: Snooze an active estimate for 1 day with a note. Verify the sequence pauses. After the snooze expires, verify it resumes.

5. Edit Before Send: When a pending\_review message appears, edit it before the 30-minute window expires. Verify the edited version sends.

6. Call Task: When a call task step is due, verify the comfort pro receives a notification. Mark it complete and verify the event logs.

7. HCP Status Sync: Approve an estimate in HCP. Manually trigger the poll cron. Verify the estimate moves to “won” in your system and the sequence stops.

8. Auto-Decline: Create a test estimate with auto\_decline\_date in the past. Run the auto-decline cron. Verify HCP receives the decline POST and local status updates.

9. Inbound SMS: Send a text from your personal phone to 425-261-9095. Verify: message appears in the messages table, notification fires for the assigned comfort pro, and the conversation thread updates in real-time on the estimate detail page.

10. SMS Reply from App: Open an estimate detail view, type a reply in the conversation thread, and send. Verify: message sends to the customer's phone, appears in the thread, and is logged in the messages table with the correct sent_by user.

11. Role Access: Log in as each role (admin, comfort pro, CSR) and confirm they only see/do what they should.

12. Mobile: Open the dashboard on your phone. Verify the estimate list and detail views are usable.

**IMPORTANT:** Do not launch to the team until every item above passes. Fix issues as you find them. This is where most of the debugging time will be spent — that’s normal.

  **PHASE 5: Team Launch**

**Status:** Not started. Depends on Phase 4 completion.

**Step 5.1: Add Team Users**

1. Go to the admin Team page (/dashboard/admin/team). Click "Invite Member" and enter each team member's name, Google Workspace email, phone, and role.

2. Have each team member sign in with Google. They will be auto-provisioned with the correct role from their invite.

3. Confirm each person sees the correct view for their role.

**Step 5.2: Initial Data Load**

1. Export your full active estimate list from HCP (all open estimates, not historical).

2. Import via the CSV upload tool. Review the results in the admin dashboard.

3. Verify assignments match HCP. Correct any mismatches manually.

4. The follow-up sequences will begin based on the original sent\_date from HCP. Estimates that are already old will quickly move through early steps — review these and snooze any that need manual attention first.

**IMPORTANT:** For the initial load, you may want to temporarily disable auto-sends and review the first batch of pending messages manually. Once you’re confident the templates and timing are correct, switch to fully automatic.

**Step 5.3: Team Training**

* Walk each comfort pro through their dashboard: how to check their queue, what the counters mean, how to snooze with a note, how to mark a call complete, how to edit a message before it sends.

* Walk the CSR through creating estimates and assigning comfort pros.

* Show everyone the notification system and how to respond when they see an email open alert.

* Create a simple 1-page reference guide in Google Docs with screenshots.

**Step 5.4: Monitor First Week**

* Check Vercel dashboard daily for any cron job failures or API errors.

* Check Resend dashboard for delivery rates and any bounces.

* Ask each comfort pro for feedback: Is the timing right? Are messages appropriate? Any leads that need different handling?

* Adjust the default sequence template based on real-world feedback.

  **FUTURE PHASES: Post-MVP Roadmap**

## **Version 0.2: Real-Time Sync & Analytics (Weeks 7–8)**

* HCP webhook for automatic new estimate ingestion (no more CSV for new records).

* Enhanced open/click tracking with real-time comfort pro notifications.

* Pipeline analytics dashboard: conversion rates, average close time, follow-up completion rates, per-salesman metrics.

## **Phase 2: Marketing Campaigns (Weeks 9–12)**

* Customer tag management and segmentation rules (equipment type, service recency, location).

* Campaign creator: audience builder, content editor, batch size slider for warm-up.

* Do-not-disturb logic: auto-exclude active pipeline leads from broadcasts.

* Not-contacted-in-X-days filter to prevent over-messaging.

* Campaign analytics: open/click rates per campaign, cost per lead by source.

* Pre-built HVAC templates: seasonal promos, maintenance reminders, rebate alerts.

## **Phase 3: Intelligence Layer (Ongoing)**

* AI content generation (Claude API) with HVAC-tailored prompts and daily token caps.

* Weather-triggered campaigns via OpenWeather API for Monroe seasonal marketing.

* Webflow website form lead capture via webhooks.

* Facebook/Google ad lead ingestion.

* A/B testing for subject lines, content, and send times.

* Advanced analytics with ROI calculations and predictive lead scoring.