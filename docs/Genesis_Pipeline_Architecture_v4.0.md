# GENESIS PIPELINE

**Estimate Pipeline, Proposal Engine & Sales Automation**

**System Architecture**

**Version 4.0 — February 2026**

Scoped for Claude Code. Covers full database schema, API routes, data flows, proposal engine, pricebook, commission, and Command Layer endpoints. Read before making any architectural decisions.

Prepared for Wylee — Genesis Refrigeration & HVAC  •  Monroe, WA  •  February 2026

---

## Section 1 — Technology Stack

*What Pipeline is built with*

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 16 (React 19) — App Router | Dashboard UI, proposal pages, quote builder. Dark mode for internal. Light mode for customer-facing proposals. |
| Language | TypeScript — strict mode | No `any` types. No unhandled promise rejections. Enforced across all components, routes, and lib functions. |
| Styling | Tailwind CSS v4 + shadcn/ui | `@theme inline` tokens. Dark mode via class toggle (internal). Proposal pages use light theme independently. |
| Database | Supabase (PostgreSQL) | All data. RLS on every table. Realtime subscriptions for live notifications and SMS threads. |
| Auth | Supabase Auth + Google SSO | Google Workspace only. No public signup. Invite-based provisioning. |
| Cron jobs | Vercel Cron (`vercel.json`) | Sequence execution 7x daily, HCP polling 3x daily, auto-decline 1x daily, commission confirmation 1x daily. |
| Email | Resend | Transactional follow-up and proposal notifications from `marketing@genesishvacr.com`. Webhooks for open/click tracking. |
| SMS | Twilio Messaging Service | Two-way SMS via 425-261-9095 hosted on Twilio. Outbound via Messaging Service SID `MGd102dd6d19268d0e867c30f9457caf2f`. A2P 10DLC registered. |
| HCP integration | Housecall Pro REST API | GET estimates (polling), POST customers, POST estimates, POST options/decline, POST options/approve. Bearer token auth. |
| QBO integration | QuickBooks Online API | Read invoice paid status for commission confirmation. OAuth 2.0 with refresh token. Tokens stored encrypted in settings table. |
| Tax lookup | WA DOR Address API | `https://webgis.dor.wa.gov/webapi/addressrates.aspx` — free, no auth. Rate fetched at proposal generation. Cached on estimate record. |
| Signatures | react-signature-canvas | Click-to-type or draw on mobile. Signature image + IP + timestamp stored. PDF generated via react-pdf. |
| PDF generation | react-pdf / @react-pdf/renderer | Signed proposal PDF. Emailed to customer on approval. Stored in Supabase Storage. |
| Hosting | Vercel | `genesis-pipeline.vercel.app`. Custom domains: `app.genesishvacr.com` (dashboard), `proposals.genesishvacr.com` (customer proposals). |

---

## Section 2 — Database Schema

*Every table, every column*

All tables have RLS enabled. All include `created_at` and `updated_at`. Supabase handles TIMESTAMPTZ automatically. API responses use ISO 8601 UTC per `GENESIS_CONVENTIONS.md`.

### 2.1 Existing Tables (Built)

These tables are live in production. Documented here for completeness — the v4.0 new tables follow in Section 2.2.

#### customers

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| hcp_customer_id | TEXT | HCP internal customer ID for API sync. |
| email | TEXT | |
| phone | TEXT | |
| name | TEXT | Customer name. Priority from HCP: `customer.company` > `first_name + last_name` > "Unknown". |
| address | TEXT | |
| equipment_type | TEXT | HVAC-specific. Enables segmentation for campaigns. |
| last_service_date | DATE | |
| lead_source | TEXT | |
| tags | TEXT[] | Text array for campaign targeting/segmentation. |
| do_not_contact | BOOLEAN | Opt-out flag. Sequences and campaigns respect this. |

#### estimate_options

Tracks individual options for HCP-imported estimates. HCP option IDs enable two-way approve/decline sync. **Note:** For estimates built in Pipeline pricebook (v4.0), `estimate_line_items` is used instead. Both tables coexist — `estimate_options` for HCP-polled estimates, `estimate_line_items` for pricebook-built estimates.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| estimate_id | UUID FK → estimates | ON DELETE CASCADE |
| hcp_option_id | TEXT | HCP option ID for approve/decline API calls. Starts with `est_`. |
| option_number | INTEGER | 1, 2, 3... |
| description | TEXT | e.g., "Furnace + HP" |
| amount | DECIMAL(10,2) | Option amount in dollars (HCP returns cents — divided by 100). |
| status | ENUM | `pending` \| `approved` \| `declined` |

#### follow_up_sequences

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT | e.g., "Default Sales Sequence" |
| is_default | BOOLEAN | Only one sequence can be default. |
| is_active | BOOLEAN | Default true. When false, cron skips all follow-ups for estimates using this sequence. Admin can pause/resume. SQL 011. |
| steps | JSONB | Array of objects: `{ day_offset, channel, template_content, is_call_task }`. Templates support placeholders: `{{customer_name}}`, `{{customer_email}}`, `{{comfort_pro_name}}`, `{{estimate_link}}`. Email templates use HTML hyperlinks; SMS templates show URL on its own line. |
| created_by | UUID FK → users | |

#### follow_up_events

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| estimate_id | UUID FK → estimates | ON DELETE CASCADE |
| sequence_step_index | INTEGER | Which step in the sequence. |
| channel | ENUM | `email` \| `sms` \| `call` |
| status | ENUM | `scheduled` \| `pending_review` \| `sent` \| `opened` \| `clicked` \| `completed` \| `skipped` \| `snoozed` |
| scheduled_at | TIMESTAMPTZ | When the step is due. |
| sent_at | TIMESTAMPTZ | When actually sent. NULL if not yet sent. |
| content | TEXT | Actual message sent (after template rendering and any comfort pro edits). |
| comfort_pro_edited | BOOLEAN | Whether the comfort pro edited the message before send. |

#### messages

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| customer_id | UUID FK → customers | |
| estimate_id | UUID FK → estimates | Nullable. NULL for general/unmatched messages. ON DELETE SET NULL. |
| direction | ENUM | `inbound` \| `outbound` |
| channel | ENUM | `sms` |
| body | TEXT | Message content. |
| twilio_message_sid | TEXT | Twilio tracking ID. |
| phone_number | TEXT | External party's phone. Used to group unmatched SMS threads in Inbox. |
| sent_by | UUID FK → users | Nullable. NULL for inbound. |
| dismissed | BOOLEAN | Default false. Soft-delete for Inbox threads. SQL 009. |

Realtime enabled for live conversation updates.

#### notifications

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | Scoped per user. Realtime subscription filtered by this. |
| type | ENUM | `email_opened` \| `link_clicked` \| `call_due` \| `lead_assigned` \| `estimate_approved` \| `estimate_declined` \| `declining_soon` \| `sms_received` \| `unmatched_sms` |
| estimate_id | UUID FK → estimates | Nullable. |
| message | TEXT | Human-readable notification text. |
| read | BOOLEAN | Default false. Drives badge counter. |

#### leads

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| source | ENUM | `facebook` \| `google` \| `website` \| `manual` \| `other` \| `retell_ai` |
| customer_name | TEXT | |
| email | TEXT | |
| phone | TEXT | |
| address | TEXT | |
| notes | TEXT | CSR qualification notes. |
| status | ENUM | `new` \| `contacted` \| `qualified` \| `moved_to_hcp` \| `archived` |
| assigned_to | UUID FK → users | Nullable. Comfort pro assignment. |
| converted_estimate_id | UUID FK → estimates | Nullable. Set when HCP polling links the lead to a detected estimate. |
| hcp_customer_id | TEXT | Set by "Move to HCP" API response. |

#### campaigns *(Phase 2)*

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT | |
| type | ENUM | `email` \| `sms` |
| subject | TEXT | Email subject line. |
| content | TEXT | HTML/text body. |
| segment_filter | JSONB | Audience rules: tags, equipment type, location, etc. |
| exclude_active_pipeline | BOOLEAN | Do-not-disturb for active pipeline leads. |
| not_contacted_days | INTEGER | "Not contacted in X days" filter. |
| batch_size | INTEGER | Domain warm-up pacing. |
| batch_interval | TEXT | Time between batches. |
| status | ENUM | `draft` \| `sending` \| `sent` |
| sent_count | INTEGER | |
| created_by | UUID FK → users | |

#### campaign_events *(Phase 2)*

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| campaign_id | UUID FK → campaigns | |
| customer_id | UUID FK → customers | |
| status | ENUM | `sent` \| `opened` \| `clicked` \| `bounced` \| `unsubscribed` |

#### user_invites

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | TEXT UNIQUE | |
| name | TEXT | |
| phone | TEXT | |
| role | ENUM | `admin` \| `comfort_pro` \| `csr` |
| invited_by | UUID FK → users | |

Admin creates invites. On first Google sign-in, auth callback matches by email, auto-creates `users` row with invite's role, and deletes the invite. RLS: admin-only. SQL 008.

#### settings

| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK | e.g., `auto_decline_days`, `default_sequence_id`, `warmup_batch_size` |
| value | JSONB | Flexible value storage. |
| updated_by | UUID FK → users | |
| updated_at | TIMESTAMPTZ | |

Also stores QBO OAuth tokens (encrypted), HCP lead source cache, `company_info` (company name, phone, email, website, address, license number/state), and `proposal_terms` (authorization, labor warranty, financing, cancellation text). Seeded by `sql/022_company_settings.sql`. API uses upsert with `onConflict: "key"`.

---

### 2.2 New Tables (v4.0)

#### users

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Supabase Auth user ID. |
| email | TEXT UNIQUE | Universal identifier per GENESIS_CONVENTIONS.md. Used for cross-app identity. |
| name | TEXT | Full display name. |
| phone | TEXT | E.164 format (+1XXXXXXXXXX). Shown on proposal page footer. |
| role | ENUM | `admin` \| `comfort_pro` \| `csr` \| `senior_cp` (V2) |
| google_id | TEXT | Google OAuth subject ID. |
| is_active | BOOLEAN | Deactivated users cannot sign in. Historical data preserved. |
| avatar_url | TEXT | Professional headshot URL. Shown on proposal page. Stored in Supabase Storage. |
| manager_id | UUID FK → users | Senior CP manager. NULL until V2 role is active. Used for manager commission calculation. |
| manager_commission_pct | DECIMAL(5,2) | Default 0. Set to 1.00 when senior_cp role assigned. Admin-only field. |

#### pricebook_items

*Built in Phase 6.1. Schema adapted from original spec to support bidirectional HCP sync (materials push, services read-only).*

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| category | ENUM | `equipment` \| `labor` \| `material` \| `addon` \| `service_plan` |
| display_name | TEXT | Customer-facing name. e.g., "Mitsubishi Hyper Heat — Premium System" |
| spec_line | TEXT | Technical detail. e.g., "3 Ton SVZ \| Hyper Heat \| -13°F Rated" |
| description | TEXT | 2-sentence value statement. Default on proposal. Comfort pro can override per estimate. |
| unit_price | DECIMAL(10,2) | Installed price in USD. For equipment: full install price including labor unless separate. |
| cost | DECIMAL(10,2) | What we pay (from HCP import). Separate from unit_price for margin visibility. |
| unit_of_measure | TEXT | e.g., "each", "ft", "hr". From HCP. |
| manufacturer | TEXT | e.g., "Mitsubishi", "Carrier", "RunTru by Trane" |
| model_number | TEXT | Manufacturer model number. For HCP line item sync. |
| part_number | TEXT | Supplier part number. From HCP materials. |
| gensco_sku | TEXT | Gensco supplier SKU. NULL until Phase 2 price feed integration. |
| last_price_sync | TIMESTAMPTZ | When Gensco last updated this price. NULL until Phase 2. |
| is_addon | BOOLEAN | True = shown as checkbox on proposal. False = line item only. |
| addon_default_checked | BOOLEAN | PM Plan = true (pre-checked). All others = false. |
| applicable_system_types | TEXT[] | Which system types show this add-on. e.g., `["heat_pump","ac","furnace"]`. NULL = all. |
| is_commissionable | BOOLEAN | Default true. All items commissionable including add-ons and PM plan. |
| rebate_amount | DECIMAL(10,2) | Manufacturer rebate if applicable. NULL = no rebate. Shown as badge on proposal card. |
| taxable | BOOLEAN | Default true. From HCP. |
| is_active | BOOLEAN | Inactive items hidden from quote builder. Historical estimates unaffected. |
| hcp_uuid | TEXT UNIQUE | HCP material or service UUID. Replaces original `hcp_service_id`. Used as upsert key for import. |
| hcp_type | ENUM | `material` \| `service`. Determines sync behavior — materials can push, services read-only. |
| hcp_category_uuid | TEXT | HCP category ID for reference. |
| hcp_category_name | TEXT | HCP category display name. |
| system_type | TEXT | System type for equipment (e.g., Heat Pump, Furnace). |
| efficiency_rating | TEXT | Efficiency rating for equipment (e.g., 14 SEER2, 16 SEER2). |
| refrigerant_type | TEXT | Refrigerant type (e.g., R-410A, R-22, R-454B). Used for colored indicator dots. |
| supplier_id | UUID FK → pricebook_suppliers | Which distributor/vendor this item comes from. NULL = unassigned. |
| manual_price | BOOLEAN | Default false. When true, item is skipped by markup tier auto-fill and bulk recalculation. |
| is_favorite | BOOLEAN | Default false. When true, item appears in Quick Picks grid in the quote builder pricebook panel. Added in Phase 7.6 (sql/023). |

**Form Field Visibility:** The pricebook create/edit modal in `PricebookManager.tsx` uses `getVisibleFields(category)` to show only relevant fields per category group. Equipment categories show all fields (system_type, efficiency_rating, refrigerant, manufacturer, etc.). Parts show manufacturer/supplier/part_number but not system_type. Labor/Service/Warranty/Exclusion/Rebate progressively hide spec fields. Universal fields (name, category, description, cost, price, subcategory, manual_price, push_to_hcp, active) are always visible.

#### pricebook_categories

*Built in Phase 6.5. Dynamic categories replacing hardcoded CHECK constraint. Admin can add new categories.*

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT UNIQUE | Display name (e.g., "Equipment", "Accessory"). |
| slug | TEXT UNIQUE | URL-safe key used in code (e.g., "equipment", "accessory"). |
| hcp_type | ENUM | `material` \| `service`. Determines HCP sync behavior. |
| display_order | INTEGER | Sort order for category pills. |
| is_active | BOOLEAN | Inactive categories hidden from UI. |

RLS: all authenticated can SELECT, admin only for write. Seeded with 16 categories: Equipment, Labor, Material, Add-On, Service Plan, Accessory (original 6), Indoor, Cased Coil, Outdoor, Equipment Warranty, Labor Warranty, Maintenance Plan (added in Phase 7.6 sql/023), Electrical, Exclusion, Controls (added in Phase 7.7 sql/024), Rebate (added in Phase 7.8 sql/024).

#### pricebook_suppliers

*Built in Phase 6.5. Tracks distributors/vendors for future API price feed integrations.*

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT UNIQUE | Supplier name (e.g., "Gensco", "Ferguson"). |
| slug | TEXT UNIQUE | Auto-generated URL-safe key. |
| api_type | TEXT | Identifies API client to use. `gensco`, `ferguson`, `manual`, null. |
| api_config | JSONB | Future: endpoint URL, credentials, sync schedule per supplier. |
| is_active | BOOLEAN | |

RLS: all authenticated can SELECT, admin only for write. Seeded with Gensco, Ferguson, Johnstone Supply, RE Michel, Manual Entry.

#### estimates

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| estimate_number | TEXT UNIQUE | HCP estimate number. Dedup key. |
| hcp_estimate_id | TEXT | HCP internal estimate ID. |
| customer_id | UUID FK → customers | |
| assigned_to | UUID FK → users | Comfort pro responsible for this estimate. |
| status | ENUM | `sent` \| `active` \| `snoozed` \| `won` \| `lost` \| `dormant` |
| total_amount | DECIMAL(10,2) | Pre-tax total. Always from Pipeline pricebook — never derived from HCP import. |
| tax_rate | DECIMAL(5,4) | Fetched from WA DOR API at proposal generation. Cached here. e.g., 0.092 for 9.2%. |
| tax_amount | DECIMAL(10,2) | Calculated: `total_amount * tax_rate`. Displayed on proposal page. |
| show_tax_on_proposal | BOOLEAN | Admin/comfort pro toggle. When false, proposal shows "plus applicable tax" disclaimer instead of tax line. |
| sent_date | DATE | Date estimate sent to customer. From HCP `schedule.scheduled_start` or `created_at` fallback. |
| sequence_id | UUID FK → follow_up_sequences | Active follow-up sequence. |
| sequence_step_index | INTEGER | Current position in sequence. Increments on step completion. |
| snooze_until | TIMESTAMPTZ | NULL unless snoozed. Cron skips sequence steps while snoozed. |
| snooze_note | TEXT | Required when snoozing. Reason for pause. |
| auto_decline_date | DATE | Calculated from `sent_date + auto_decline_days` setting. |
| proposal_token | TEXT UNIQUE | Secure random token for proposal URL. `/proposals/[token]` |
| proposal_sent_at | TIMESTAMPTZ | When proposal link was sent to customer. |
| proposal_signed_at | TIMESTAMPTZ | When customer signed the proposal. NULL until signed. |
| proposal_signed_name | TEXT | Customer's typed name on signature. |
| proposal_signature_data | TEXT | Base64 drawn signature canvas data. NULL if typed only. |
| proposal_signed_ip | TEXT | IP address of signing device. Legal record. |
| proposal_pdf_url | TEXT | Supabase Storage URL of signed proposal PDF. |
| selected_tier | INTEGER CHECK (1,2,3) | Which tier (1=Standard, 2=Enhanced, 3=Premium) customer selected at signing. Added in sql/021. |
| selected_financing_plan_id | UUID FK → financing_plans | Which financing plan customer selected at signing. |
| subtotal | DECIMAL(10,2) | Pre-tax total for the signed option + addons. |
| template_id | UUID FK → quote_templates | Which template was used to build this quote. NULL if built from scratch. |
| payment_schedule_type | ENUM | `standard` \| `large_job`. Determined by HCP tags at estimate creation. |
| online_estimate_url | TEXT | HCP customer-facing URL if manually set. Not auto-populated (HCP API does not expose it). |
| tier_metadata | JSONB | Stores per-tier metadata: `[{tier_number, tier_name, tagline, feature_bullets: string[], is_recommended, rebates?: [{id, name, amount}]}]`. Saved by quote builder (draft + create). Used by proposal page for tier names/taglines/features/rebates instead of hardcoded values. Added in sql/024. |

#### markup_tiers

*Built in Phase 6. Cost-based multiplier table for auto-suggesting retail price from cost on equipment, materials, and add-ons.*

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tier_number | INTEGER UNIQUE | Sort order (1–11 default). |
| min_cost | DECIMAL(10,2) NOT NULL | Range floor. |
| max_cost | DECIMAL(10,2) | NULL = no upper bound (last tier). |
| multiplier | DECIMAL(5,2) NOT NULL | e.g., 7.00, 2.25, 1.75. Markup % = (multiplier - 1) x 100. Profit % = (1 - 1/multiplier) x 100. |

RLS: all authenticated can SELECT, admin only for write. Seeded with 11 default tiers. Labor calculator inputs stored in `settings` table as JSONB (key: `labor_calculator`).

#### quote_templates

*Pre-built quote packages with 3 tiers (Good/Better/Best). Any user can create templates. Templates define equipment, labor, materials, and recommended add-ons per tier.*

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL | Template name, e.g., "Lennox Furnace + AC Replacement" |
| description | TEXT | Optional description |
| system_type | TEXT | e.g., "heat_pump", "furnace_ac", "mini_split" |
| created_by | UUID FK → users | Who created the template |
| is_shared | BOOLEAN | Default false. When true, visible to all users. |
| is_active | BOOLEAN | Default true. Soft-delete sets to false. |

RLS: authenticated SELECT where `is_shared = true OR created_by = auth.uid()`. Owner + admin write.

#### quote_template_tiers

*Per-tier metadata: name, tagline, feature bullets, system image. Each template has up to 3 tiers.*

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| template_id | UUID FK → quote_templates | ON DELETE CASCADE |
| tier_number | INTEGER CHECK 1–3 | 1=Good, 2=Better, 3=Best |
| tier_name | TEXT NOT NULL | e.g., "Standard Comfort" |
| tagline | TEXT | e.g., "Reliable performance at an honest price" |
| feature_bullets | JSONB | String array of customer-facing selling points |
| is_recommended | BOOLEAN | Default false. Shows "Most Popular" badge on proposal. |
| image_url | TEXT | Supabase Storage path for system package image |

UNIQUE(template_id, tier_number). RLS mirrors parent.

#### quote_template_items

*Pricebook items assigned to each tier. Includes both tier equipment/labor and addon items.*

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| template_tier_id | UUID FK → quote_template_tiers | ON DELETE CASCADE |
| pricebook_item_id | UUID FK → pricebook_items | Source pricebook item |
| quantity | DECIMAL(10,2) | Default 1 |
| is_addon | BOOLEAN | Default false. True = shown as optional checkbox on proposal |
| addon_default_checked | BOOLEAN | Default false. Pre-checked addons on proposal |
| sort_order | INTEGER | Display order within tier |

RLS mirrors parent template.

#### estimate_line_items

Replaces the old `estimate_options` table for estimates built in Pipeline pricebook. Stores each line item selected by the comfort pro during quoting.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| estimate_id | UUID FK → estimates | ON DELETE CASCADE |
| pricebook_item_id | UUID FK → pricebook_items | Source item. NULL for manual line items. |
| option_group | INTEGER | Which proposal option card this belongs to. 1, 2, or 3. Allows multiple options per proposal. |
| display_name | TEXT | Copied from pricebook at time of quoting. Comfort pro can override. |
| spec_line | TEXT | Copied from pricebook. Comfort pro can override. |
| description | TEXT | Copied from pricebook. Comfort pro can override per estimate. |
| quantity | DECIMAL(10,2) | Default 1 for equipment. Variable for materials. |
| unit_price | DECIMAL(10,2) | Locked at time of quoting. Pricebook price changes do not affect existing estimates. |
| line_total | DECIMAL(10,2) | `quantity * unit_price`. Computed column. |
| is_addon | BOOLEAN | True = shown as optional checkbox on proposal. Customer can add/remove. |
| is_selected | BOOLEAN | For addons: whether customer checked it on the proposal. Updated at signing. |
| category | TEXT | Pricebook category slug (e.g., indoor, outdoor, labor). Added in sql/023. |
| sort_order | INTEGER | Display order within option group. Added in sql/023. |
| hcp_option_id | TEXT | HCP option ID after sync. Used for approve/decline API calls. |

#### commission_tiers

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| period | ENUM | `monthly` \| `quarterly` \| `annual`. Admin-configurable. |
| min_revenue | DECIMAL(10,2) | Minimum cumulative revenue in period to qualify for this tier. |
| max_revenue | DECIMAL(10,2) | NULL = no ceiling (top tier). |
| rate_pct | DECIMAL(5,2) | Commission percentage. e.g., 5.00, 6.00, 7.00, 8.00 |
| is_active | BOOLEAN | Inactive tiers ignored in calculations. Allows transitioning tier structures without deleting history. |

#### commission_records

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| estimate_id | UUID FK → estimates | |
| user_id | UUID FK → users | Comfort pro who earned the commission. |
| manager_id | UUID FK → users | NULL if no manager. Set from `users.manager_id` at time of calculation. |
| pre_tax_revenue | DECIMAL(10,2) | Revenue base for commission calculation. Pre-tax invoice total from QBO at confirmation. |
| tier_rate_pct | DECIMAL(5,2) | Rate applied. Locked at calculation time. Rate changes do not retroactively affect this record. |
| estimated_amount | DECIMAL(10,2) | Calculated at proposal signing. Based on proposal total. |
| confirmed_amount | DECIMAL(10,2) | Calculated at job complete + invoice paid. NULL until confirmed. |
| manager_commission_amount | DECIMAL(10,2) | Manager's 1% of pre_tax_revenue. NULL if no manager. |
| status | ENUM | `estimated` \| `confirmed` \| `paid` |
| confirmed_at | TIMESTAMPTZ | When job complete + invoice paid conditions were both met. |
| period_revenue_at_confirmation | DECIMAL(10,2) | Comfort pro's cumulative confirmed revenue in the period at time of confirmation. Used to verify tier rate. |

#### proposal_engagement

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| estimate_id | UUID FK → estimates | ON DELETE CASCADE |
| event_type | ENUM | `page_open` \| `option_view` \| `calculator_open` \| `plan_selected` \| `addon_checked` \| `addon_unchecked` \| `signature_started` \| `signed` |
| option_group | INTEGER | Which option card was viewed/interacted with. NULL for non-option events. |
| financing_plan | TEXT | e.g., "930", "980", "943", "cash". For plan_selected events. |
| session_seconds | INTEGER | Time on page for page_open events. |
| device_type | TEXT | `mobile` \| `desktop` \| `tablet`. From user agent. |
| occurred_at | TIMESTAMPTZ | |

#### financing_plans

Admin-managed. Controls what appears in the proposal financing calculator.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| plan_code | TEXT UNIQUE | Synchrony plan code. e.g., "930", "980", "943" |
| label | TEXT | Display label. e.g., "25 Months, 0% APR" |
| fee_pct | DECIMAL(5,4) | Dealer fee as decimal. e.g., 0.1160 for 11.60% |
| months | INTEGER | Term length in months. |
| apr | DECIMAL(5,4) | Annual percentage rate. 0.0000 for same-as-cash plans. |
| is_default | BOOLEAN | Only one plan can be default. Plan 930 is default. |
| is_active | BOOLEAN | Inactive plans hidden from proposal calculator. |
| synchrony_url | TEXT | Application link. `https://www.mysynchrony.com/mmc/HY223500700` |
| display_order | INTEGER | Order in calculator dropdown. Lower = first. |

#### large_job_tags

Admin-configurable. Tags that trigger the 4-payment schedule on proposals.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tag_name | TEXT UNIQUE | Exact match to HCP estimate tag. e.g., "Remodel", "New Con" |
| is_active | BOOLEAN | Inactive tags ignored during payment schedule determination. |

---

## Section 3 — API Routes

*Complete route map*

### 3.1 Externally Callable (webhooks)

| Route | Method | Auth & Purpose |
|-------|--------|---------------|
| `/api/webhooks/twilio` | POST | Twilio signature validation. Inbound SMS from customers. |
| `/api/webhooks/resend` | POST | Resend signature validation. Email open/click/bounce events. |
| `/api/leads/inbound` | POST | Bearer `LEADS_WEBHOOK_SECRET`. Accepts leads from Retell AI, Webflow, Zapier, Facebook, Google. |
| `/proposals/[token]` | GET | Public — no auth. Customer-facing proposal page. Token-gated. |
| `/api/proposals/[token]/sign` | POST | Public — no auth. Customer submits signature. Records signature + status=won (blocking), then fire-and-forget: PDF generation, Supabase Storage upload, HCP option approve/decline + PDF attachment + note, confirmation email with PDF, notifications, skip follow-up steps. |
| `/api/proposals/[token]/engage` | POST | Public — no auth. Records `proposal_engagement` events (opens, calculator use, etc.). |
| `/api/auth/qbo` | GET | QBO OAuth callback. Exchanges code for tokens. Stores encrypted in settings. |

### 3.2 Command Layer API (app-to-app)

All `/api/v1/` routes: Bearer `GENESIS_INTERNAL_API_KEY`. Standard response envelope `{data, error, meta}`. No Supabase Auth session required. These are the only routes the Genesis AI Command Layer calls.

| Route | Method | Returns |
|-------|--------|---------|
| `/api/v1/estimates/stats` | GET | Pipeline value, count by status, close rate MTD, avg days to close, total commission estimated MTD, `total_count`. |
| `/api/v1/estimates/stale` | GET | Estimates with no engagement in 5+ days. Includes `customer_name`, `hcp_job_number`, last open, sequence step, `user_email`. |
| `/api/v1/estimates/[id]` | GET | Full detail: options, sequence state, engagement summary, customer contact, comfort pro email/name. |
| `/api/v1/estimates/[id]/snooze` | POST | Body: `{ days: number, note: string }`. Snoozes follow-up sequence. |
| `/api/v1/estimates/[id]/send-next` | POST | Sends next due sequence step immediately. |
| `/api/v1/estimates/[id]/status` | POST | Body: `{ action: "won"\|"lost", selected_option_ids: [] }` |
| `/api/v1/leads` | GET | Open leads. `status`, `source`, `customer_name`, assigned `user_email`, `days_since_created`, `total_count`. |
| `/api/v1/leads/[id]/move-to-hcp` | POST | Qualifies lead, creates customer + estimate in HCP. |
| `/api/v1/commission/summary` | GET | Commission by comfort pro. `estimated_total`, `confirmed_total`, `current_tier_rate`, `revenue_to_next_tier`. Query param: `?period=current` |

### 3.3 Internal Dashboard Routes (Supabase Auth)

These routes are called by the dashboard UI. They require an authenticated Supabase session (not `GENESIS_INTERNAL_API_KEY`). They do NOT use the `/api/v1/` prefix or the conventions response envelope.

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/estimates` | GET | List estimates with filters and pagination. |
| `/api/estimates/[id]` | GET | Full estimate detail (options, events, messages). |
| `/api/estimates/[id]/status` | POST | Mark won/lost with option selection. Body: `{ action, selected_option_ids }` |
| `/api/estimates/[id]/snooze` | POST | Snooze estimate. Body: `{ days, note }` |
| `/api/estimates/[id]/send-next` | POST | Send next due sequence step immediately (bypasses edit window). |
| `/api/estimates/[id]/skip-step` | POST | Skip current sequence step without sending. |
| `/api/estimates/[id]/execute-step` | POST | Execute a previously skipped step. |
| `/api/estimates/[id]` | DELETE | Admin delete with cascade cleanup. |
| `/api/admin/update-estimates` | POST | Manual HCP polling trigger (admin/CSR). |
| `/api/send-sms` | POST | Send SMS via Twilio Messaging Service. Logs to messages table. |
| `/api/inbox` | GET | List unmatched SMS threads grouped by phone number. |
| `/api/inbox` | POST | Reply to inbox thread. Calls Twilio directly (not via `/api/send-sms` — Vercel serverless functions cannot reliably self-fetch). |
| `/api/inbox/convert` | POST | Convert inbox thread to lead (pre-fills lead form). |
| `/api/inbox/dismiss` | POST | Dismiss inbox thread (soft delete). |
| `/api/leads` | GET | List leads with status filter. |
| `/api/leads` | POST | Create lead manually (CSR). |
| `/api/leads/[id]` | PUT | Update lead (status, notes, assignment). |
| `/api/leads/[id]` | DELETE | Admin delete lead. |
| `/api/leads/[id]/move-to-hcp` | POST | Create customer + estimate in HCP via API. |
| `/api/leads/inbound` | POST | External webhook (Bearer `LEADS_WEBHOOK_SECRET`). Also listed in 3.1. |
| `/api/follow-up-events` | GET | Follow-up events for an estimate. |
| `/api/follow-up-events/[id]` | PUT | Edit pending event content (30-min edit window). |
| `/api/notifications` | GET | User notifications. |
| `/api/notifications/[id]/read` | PUT | Mark notification as read. |
| `/api/admin/settings` | GET/PUT | Read/write system settings (pipeline settings, company_info, proposal_terms). Uses upsert. Admin only. |
| `/api/admin/import-csv` | POST | CSV estimate import. Admin only. |
| `/api/admin/sequences` | GET/PUT | Read/write follow-up sequences. Admin only. |
| `/api/admin/team` | GET | List team members and invites. Admin only. |
| `/api/admin/team/invite` | POST | Create user invite. Admin only. |
| `/api/admin/team/[id]` | PUT | Update user role/status. Admin only. |

| `/api/admin/pricebook` | GET | List pricebook items (filters: `?category=`, `?search=`, `?active=`). |
| `/api/admin/pricebook` | POST | Create pricebook item. Admin only. |
| `/api/admin/pricebook/[id]` | PUT | Update item + auto-sync to HCP (materials). Rich description includes specs. Admin only. |
| `/api/admin/pricebook/[id]` | DELETE | Soft-delete (set inactive). Admin only. |
| `/api/admin/pricebook/import` | POST | Import all materials + services from HCP (additive only). Admin only. |
| `/api/admin/pricebook/bulk` | PUT | Bulk actions: `action=category\|activate\|deactivate\|price_adjust\|edit`. Admin only. |
| `/api/admin/pricebook/bulk` | POST | Bulk sync selected active materials to HCP. Admin only. |
| `/api/admin/pricebook/categories` | GET/POST | List/create dynamic pricebook categories. Admin write, any auth read. |
| `/api/admin/pricebook/suppliers` | GET/POST | List/create pricebook suppliers. Admin write, any auth read. |
| `/api/admin/markup-tiers` | GET/PUT | Read/replace markup tier table. Admin write, any auth read. |
| `/api/admin/labor-calculator` | GET/PUT | Read/save labor calculator inputs (settings JSONB). Admin write. |
| `/api/quotes/create` | POST | Create estimate from quote builder. Saves line items, tiers, HCP sync. Stores `tier_metadata` JSONB + `category` on line items. |
| `/api/quotes/draft` | POST | Save/update draft estimate. Creates/updates estimate + line items with `status=draft`. Generates `proposal_token` on new drafts (Phase 7.7). Stores `tier_metadata`. |
| `/api/quotes/templates` | GET/POST | Quote template CRUD. |
| `/api/quotes/templates/[id]` | GET/PUT/DELETE | Individual quote template management. |
| `/api/admin/financing-plans` | GET/POST | Financing plan CRUD. Admin only. |
| `/api/admin/financing-plans/[id]` | PUT/DELETE | Individual financing plan management. Admin only. |
| `/api/tax/lookup` | GET | WA DOR tax rate lookup by address. |

See `docs/API_Routes.md` for the complete route map with auth methods and additional detail.

### 3.4 Cron Jobs

| Route | Schedule (UTC) | Purpose |
|-------|---------------|---------|
| `/api/cron/execute-sequences` | 7x daily | Sends due follow-up steps. Validates sequence still active and step still exists before sending. |
| `/api/cron/poll-hcp-status` | 3x daily | Polls HCP API. Detects status changes. Updates estimate records. |
| `/api/cron/auto-decline` | 1x daily | Declines estimates past `auto_decline_date`. POSTs to HCP API. |
| `/api/cron/confirm-commission` | 1x daily | Checks won estimates for job complete + invoice paid. Fires commission confirmation when both true. |

---

## Section 4 — Data Flows

*How the key processes work end to end*

### 4.1 Quote → Proposal → Signature

| # | Actor | Action |
|---|-------|--------|
| 1 | Comfort Pro | Opens quote builder in Pipeline. Selects customer or creates new. Selects equipment, labor, materials from pricebook. Sets option groups (1, 2, or 3 options). Adds commission-eligible add-ons. |
| 2 | Pipeline | Calculates total per option group. Calls WA DOR API with job address → gets tax rate. Calculates `tax_amount`. If `show_tax_on_proposal = true`, both shown. Generates secure `proposal_token`. |
| 3 | Pipeline → HCP | POSTs to HCP API: creates estimate with line items from pricebook. Stores `hcp_estimate_id` and `hcp_option_id` per option group. HCP is now the record. |
| 4 | Pipeline → Customer | SMS sent: "Hi [name], [comfort pro] just sent your estimate. View and approve here: `proposals.genesishvacr.com/[token]`". Branded email sent with "View Your Proposal" button. |
| 5 | Customer | Opens proposal URL. All engagement events POSTed to `/api/proposals/[token]/engage`. Page open, option views, calculator interactions, plan selections all recorded to `proposal_engagement`. |
| 6 | Customer | Selects option, selects financing plan (or cash), checks/unchecks add-ons, enters name, signs. POSTs to `/api/proposals/[token]/sign`. |
| 7 | Pipeline | Records signature, IP, timestamp. Generates signed PDF via react-pdf. Stores in Supabase Storage. Updates estimate: `proposal_signed_at`, `proposal_signed_ip`, `proposal_pdf_url`, `selected_financing_plan`, status → won. |
| 8 | Pipeline → HCP | POSTs approval to HCP: selected `hcp_option_id` approved, others declined. POSTs named link to HCP estimate: "Signed Proposal — [date]" with proposal URL. |
| 9 | Pipeline → Customer | Confirmation email with signed PDF attached. Subject: "You're on the Genesis schedule." |
| 10 | Pipeline | Calculates `estimated_commission`. Creates `commission_record` with status "estimated". Notifies comfort pro and admin. Fires Command Layer event. |

### 4.2 Commission Confirmation Flow

| # | Actor | Action |
|---|-------|--------|
| 1 | Cron (daily) | `/api/cron/confirm-commission` runs. Queries all `commission_records` with status "estimated". |
| 2 | Cron → HCP | Checks each estimate's HCP job status via polling. Is the job marked complete? |
| 3 | Cron → QBO | Checks QBO invoice for the job. Is it paid in full? Uses QBO OAuth client to query invoice by `hcp_estimate_id` reference. |
| 4 | Cron | Both conditions met: pulls pre-tax invoice total from QBO (strips tax line). Calculates cumulative period revenue for comfort pro. Determines tier rate. Calculates `confirmed_amount`. |
| 5 | Cron | If `manager_id` set on user: calculates `manager_commission_amount` at `manager_commission_pct`. Updates `commission_record`: `confirmed_amount`, `manager_commission_amount`, status → confirmed, `confirmed_at`, `period_revenue_at_confirmation`. |
| 6 | Pipeline | Admin notification: "[comfort pro] commission confirmed — $[amount] on [customer] job." Comfort pro notification: "Commission confirmed — $[amount]." |

### 4.3 Tax Display Logic

| Tax Display State | Proposal Page Behavior |
|------------------|----------------------|
| Hidden (Genesis default) | Proposal shows pre-tax total only. Disclaimer shown: "Plus applicable sales tax." This is the Genesis default for all estimates. |
| Shown | Customer clicked "Show tax-inclusive total" toggle on the proposal page. Proposal shows: Subtotal + Tax line ($X at X.X%) + Total. Toggle is customer-facing only — no action required from comfort pro. |

Tax is always calculated at proposal generation via WA DOR API and cached on the estimate record regardless of display setting. Commission calculation always uses the pre-tax amount. The customer toggle is a read-only view helper — it does not affect pricing, commission, or the signed proposal total.

---

### 4.4 HCP Estimate Polling

The HCP polling cron (`/api/cron/poll-hcp-status`) and the manual "Update Estimates" button (`/api/admin/update-estimates`) both use shared polling logic in `lib/hcp-polling.ts`.

**Polling behavior:**
- Calls GET /estimates on HCP API with `page_size=200` and `sort_direction=desc` (newest first)
- **No API date filters are used** — HCP's `scheduled_start_min/max` filters by appointment date (not creation date), and `start_date/end_date` are silently ignored. Instead, estimates are filtered in code by comparing `created_at` against the `auto_decline_days` cutoff
- Pagination stops early when an entire page is older than the cutoff. Max 5 pages per poll
- Before fetching from HCP, all local estimate IDs (`hcp_estimate_id` and `estimate_number`) are pre-loaded into memory Sets for O(1) matching — no per-estimate DB query

**New estimate detection:** All HCP estimates within the cutoff window are imported:
- **Sent estimates** (option `status = "submitted for signoff"` or `approval_status = "approved"/"declined"`) → created as `status = "active"/"won"/"lost"` (enrolled in follow-up sequence if active)
- **Unsent estimates** (no options sent yet) → created as `status = "draft"`. These appear in the "Unsent" tab on the estimates page with a "Build Quote" button. When options later get sent in HCP, auto-transitions `draft → active`.
- Customer name priority: `customer.company` > `first_name + last_name` > "Unknown"
- HCP amounts are in cents — divided by 100
- Sent date: `estimate.schedule.scheduled_start` if available, else `estimate.created_at`. Do NOT use `option.updated_at` — it reflects last modification, not send date

**Existing estimate updates:** Full refresh on every poll. Customer name, email, phone updated from HCP. Total amount (cents/100), sent date, all option amounts/descriptions/statuses synced. New options added in HCP are created locally. If an option's `approval_status` changes to approved/declined, estimate status updates, sequence stops, comfort pro notified. Draft estimates auto-transition to active/won/lost when options get sent.

### 4.5 Inbound SMS (Twilio Webhook)

When a customer replies to an SMS, Twilio POSTs to `/api/webhooks/twilio`. The handler:
1. Validates the Twilio request signature (`X-Twilio-Signature`)
2. Matches incoming phone number to a customer record
3. Creates a row in `messages` with direction "inbound"
4. If the customer has an active estimate, links the message via `estimate_id`
5. Creates notification (type: `sms_received`) for the assigned comfort pro
6. Notifies all active admins and CSRs (with deduplication — an assigned user who is also admin gets only one notification)
7. Supabase Realtime pushes the new message to the frontend live

### 4.6 Outbound SMS (Manual Reply)

When a comfort pro sends a reply from the conversation thread, the frontend POSTs to `/api/send-sms` with message body, customer_id, and estimate_id. The route:
1. Sends SMS via Twilio Messaging Service (`messagingServiceSid` parameter, not `from` phone number) for A2P 10DLC compliance
2. Logs the message to `messages` with direction "outbound" and `sent_by` = comfort pro's user_id
3. Returns the Twilio message SID for tracking

**Critical constraint:** The inbox reply route (`/api/inbox` POST) calls Twilio directly rather than proxying through `/api/send-sms`. Vercel serverless functions cannot reliably fetch their own API routes (server-to-server self-calls fail). Any future SMS-sending route must call Twilio directly, not proxy through another internal route.

### 4.7 Follow-Up Sequence Execution

The sequence execution cron (`/api/cron/execute-sequences`) runs 7x daily (approximately every 2 hours during business hours). For each active estimate, it checks:
1. Is the sequence active (`is_active = true`)?
2. Is a step due (based on `sent_date + step.day_offset`)?
3. Is the estimate snoozed (skip if `snooze_until` is in the future)?
4. Has the estimate been won/lost/dormant (stop if so)?

For auto-send steps: creates a `follow_up_event` with status "pending_review" and `scheduled_at` 30 minutes in the future. Before sending, validates the step still exists in the current sequence and the sequence is still active — if edited or paused between scheduling and sending, the event is marked "skipped". If valid, sends via Resend (email) or Twilio (SMS), updates status to "sent". Outbound SMS also logged to `messages`.

For call tasks: creates a `follow_up_event` with status "scheduled" and a notification for the comfort pro. Comfort pro marks it "completed" or snoozes the sequence.

### 4.8 Campaign Broadcasting *(Phase 2)*

Admin creates campaign, selects audience via tag/segment filters, sets "not contacted in X days" threshold, optionally excludes active pipeline leads. System calculates eligible recipients. Admin sets batch size for warm-up pacing. Cron sends batches at configured interval. Resend webhooks log per-recipient events.

---

## Section 5 — File Structure

*Codebase organization*

| Path | Purpose |
|------|---------|
| `/app/(auth)/login` | Google SSO login page. |
| `/app/(dashboard)/layout.tsx` | Authenticated shell. Dark theme. Nav: Pipeline, Leads, Inbox, Commission, Settings. |
| `/app/(dashboard)/page.tsx` | Comfort pro pipeline dashboard. Estimate list, counters, sequence status. |
| `/app/(dashboard)/quotes/new` | Quote builder. Pricebook item selection, option groups, add-ons, customer lookup. |
| `/app/(dashboard)/estimates/[id]` | Estimate detail. Sequence timeline, engagement data, SMS thread, actions. |
| `/app/(dashboard)/commission` | Commission dashboard. Comfort pro sees own history. Admin sees all. |
| `/app/(dashboard)/leads` | CSR lead management. List, edit, move to HCP, archive. |
| `/app/(dashboard)/inbox` | Unmatched SMS threads. Reply, convert to lead, dismiss. |
| `/app/(dashboard)/settings` | Admin settings: sequences, pricebook, financing plans, large-job tags, commission tiers, team, QBO connection. |
| `/app/proposals/[token]/layout.tsx` | Standalone dark layout for proposals. Barlow Condensed + Lato fonts. No dashboard chrome. |
| `/app/proposals/[token]/page.tsx` | Server component. Fetches estimate by token, handles signed/expired/inactive states. No auth — token-gated. |
| `/app/components/pricebook/` | Pricebook UI components (Phase 7.9 decomposition). 8 files: PricebookStats, PricebookMarginAlert, PricebookToolbar, PricebookCategoryTabs, PricebookTable, PricebookTableRow, PricebookItemModal, PricebookBulkEditModal. Orchestrated by `PricebookManager.tsx`. |
| `/app/components/estimates/` | Estimates page UI components (Phase 8.0). 4 files: EstimateStats, EstimateToolbar, EstimateTable (grid + pagination), EstimateTableRow (pipeline + unsent rows with avatars, urgency chips, hover actions). Orchestrated by `EstimateTable.tsx` (parent). |
| `/app/components/sequences/` | Sequences page UI components (Phase 8.1B). 4 files: SequenceHeader, SequenceTokenBar, SequenceStepCard (timeline connectors + channel-colored cards), SequenceAddStep. Orchestrated by `SequenceEditor.tsx` (parent). |
| `/app/components/quote-builder/` | Quote builder UI (Phase 7.6 overhaul). 12 files: types.ts, utils.ts, QuoteBuilder.tsx (parent state), Topbar, Steps, TotalsBar, CustomerStep, TiersStep (3-column), AddonsStep, FinancingStep, ReviewStep, PricebookPanel (right sidebar). |
| `/app/components/proposal/` | 8 client components: ProposalPage (state), ProposalHeader, TierCards, AddonCards, FinancingCalculator, PaymentSchedule, SignatureBlock, StickyBottomBar, WhyGenesis. |
| `/app/components/ProposalEngagementPanel.tsx` | Shows proposal engagement stats on estimate detail: opens, time on page, most viewed tier, device, financing/addon interactions, signature status, event timeline. |
| `/app/components/LineItemsView.tsx` | Displays estimate_line_items grouped by tier for Pipeline-built estimates (replaces OptionsList). Shows addons, subtotal/tax/total breakdown. |
| `/app/api/v1/` | Command Layer endpoints. `GENESIS_INTERNAL_API_KEY` auth. Standard response envelope. |
| `/app/api/cron/` | All cron job routes. `CRON_SECRET` auth. |
| `/app/api/webhooks/` | Twilio and Resend inbound webhooks. |
| `/app/api/proposals/` | Sign and engage routes. Public — token-gated only. |
| `/lib/hcp-pricebook.ts` | HCP Pricebook API client. `fetchAllHcpMaterials()`, `fetchAllHcpServices()`, `createHcpMaterial()`, `updateHcpMaterial()`, `buildHcpDescription()`. |
| `/lib/hcp-estimate.ts` | HCP Estimate API client. `createHcpCustomer()`, `createHcpEstimate()`, `syncEstimateToHcp()`. Maps Pipeline tiers → HCP options, converts $ → cents. |
| `/lib/hcp.ts` | HCP API client (planned). `getEstimates()`, `declineOptions()`, `approveOption()`, `postNamedLink()`. Reusable by Command Layer. |
| `/lib/qbo.ts` | QBO client. `refreshToken()`, `getInvoiceByReference()`, `getInvoicePaidStatus()`, `getPreTaxTotal()`. Reusable by Command Layer. |
| `/lib/tax.ts` | WA DOR API wrapper. `getTaxRate({address, city?, zip?})` → `{rate, source}`. 5s timeout, falls back to 0.092 (Monroe default). Built. |
| `/lib/company-settings.ts` | `getCompanyInfo()` and `getProposalTerms()` — reads company info and proposal terms from settings table with hardcoded defaults as fallback. Used by sign endpoint, PDF generation, and confirmation email. Built. |
| `/lib/commission.ts` | Commission calculation logic. `getTierRate(userId, periodRevenue)`, `calculateEstimated()`, `calculateConfirmed()`. |
| `/lib/proposal.ts` | Proposal generation. `generateToken()`, `buildProposalData()`, `generateSignedPdf()`. |
| `/lib/supabase.ts` | Supabase client (anon + service role). Pipeline-specific query helpers. |
| `/types/pipeline.ts` | TypeScript types: Estimate, LineItem, CommissionRecord, ProposalEngagement, FinancingPlan, PricebookItem, Lead. |
| `/privacy`, `/terms` | Twilio A2P compliance pages. Required for carrier approval. |

---

## Section 6 — Environment Variables

*Required for deployment*

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service role — never expose to client |
| `NEXT_PUBLIC_SITE_URL` | Client + Server | `https://app.genesishvacr.com` |
| `GENESIS_INTERNAL_API_KEY` | Server only | 64-char shared secret. Command Layer auth for `/api/v1/` routes. |
| `CRON_SECRET` | Server only | Vercel cron job authentication |
| `LEADS_WEBHOOK_SECRET` | Server only | Bearer token for `/api/leads/inbound` |
| `HCP_API_KEY` | Server only | Housecall Pro Bearer token |
| `TWILIO_ACCOUNT_SID` | Server only | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Server only | Twilio webhook signature validation |
| `TWILIO_MESSAGING_SERVICE_SID` | Server only | `MGd102dd6d19268d0e867c30f9457caf2f` |
| `TWILIO_PHONE_NUMBER` | Server only | `+14252619095` |
| `RESEND_API_KEY` | Server only | Resend transactional email API |
| `RESEND_WEBHOOK_SECRET` | Server only | Resend webhook signature validation. Set from Resend dashboard. |
| `QBO_CLIENT_ID` | Server only | QuickBooks OAuth client ID |
| `QBO_CLIENT_SECRET` | Server only | QuickBooks OAuth client secret |

---

## Section 7 — Cost Projections

*Monthly operating costs*

| Service | Tier | Estimated Monthly Cost |
|---------|------|----------------------|
| Supabase | Free → Pro | $0 initially (500MB DB, 50k auth). Pro $25/mo when approaching limits. |
| Vercel | Pro | $20/mo (required for multi-daily cron jobs). |
| Resend | Free → Starter | $0 for first 3,000 emails/mo. $20/mo for up to 50,000. |
| Twilio | Pay-as-you-go | $1/mo number hosting + ~$0.0079/outbound + ~$0.004/inbound. ~$4/mo at 300 SMS/mo. One-time 10DLC registration $4–15. |
| Housecall Pro | Existing plan | Already paid. API access included in business tier. |
| GitHub | Free | Private repos. |
| QuickBooks Online | Existing plan | Already paid. API access for commission confirmation. |

**MVP monthly total:** $20–$45 (Vercel Pro + email volume).
**At scale with campaigns:** $65–$85/month.
**Phase 3 with AI:** Add $5–10/month for Claude API with daily token caps.

---

## Section 8 — Scalability

- **More comfort pros:** No architecture changes needed. Add users, RLS handles data scoping automatically.
- **Higher estimate volume:** Cron job frequency can increase. Supabase handles concurrent writes well.
- **Larger customer base:** Supabase free tier supports 500MB. At 5,000 customers with full history, well within limits. Pro tier (8GB) handles 50,000+.
- **Higher email volume:** Resend scales to millions. Batch size controls prevent deliverability issues.
- **Current scale:** ~60 estimates/month, 1 comfort pro (growing), 5,000-customer base.

---

## Section 9 — Monitoring & Observability

- **Supabase Dashboard:** Database size, query performance, auth events, real-time connection count.
- **Vercel Dashboard:** API route execution times, error rates, cron job success/failure, bandwidth usage.
- **Resend Dashboard:** Email delivery rates, bounce rates, spam complaints, domain reputation score.
- **Twilio Console:** SMS delivery status, A2P campaign status, carrier errors.
- **In-App (Phase 2):** Pipeline conversion metrics, follow-up completion rates, per-salesman performance, campaign engagement.

For MVP, the built-in dashboards of Supabase, Vercel, Resend, and Twilio provide sufficient monitoring. Custom alerting (e.g., email on cron job failure) can be added via Vercel's monitoring integrations.

---

## Section 10 — Future Architecture Considerations

- **Service Titan migration:** If Genesis moves from HCP to Service Titan, the integration layer is modular. Replace the HCP API routes with Service Titan equivalents; the rest of the system is unaffected.
- **Mobile app:** The Supabase backend and Vercel API routes can serve a React Native mobile app with no backend changes.
- **Multi-location:** The data model supports adding a `location_id` to estimates and users for multi-branch operations.
- **Advanced AI:** The Phase 3 AI layer can expand to predictive lead scoring, optimal send-time analysis, and automated A/B testing recommendations.
- **Gensco price feed:** Phase 2 integration to auto-update equipment costs from supplier pricing. Schema ready (`gensco_sku`, `last_price_sync` on `pricebook_items`).

---

*Genesis Refrigeration & HVAC  •  Genesis Pipeline  •  Architecture v4.0  •  February 2026  •  CONFIDENTIAL*
