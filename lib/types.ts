// Shared TypeScript types for all database tables

export type UserRole = "admin" | "comfort_pro" | "csr";

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  google_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  hcp_customer_id: string | null;
  email: string | null;
  phone: string | null;
  name: string;
  address: string | null;
  equipment_type: string | null;
  last_service_date: string | null;
  lead_source: string | null;
  tags: string[];
  do_not_contact: boolean;
  created_at: string;
  updated_at: string;
}

export type EstimateStatus =
  | "sent"
  | "active"
  | "snoozed"
  | "won"
  | "lost"
  | "dormant";

export interface Estimate {
  id: string;
  estimate_number: string;
  hcp_estimate_id: string | null;
  customer_id: string;
  assigned_to: string | null;
  status: EstimateStatus;
  total_amount: number | null;
  sent_date: string | null;
  sequence_id: string | null;
  sequence_step_index: number;
  snooze_until: string | null;
  snooze_note: string | null;
  auto_decline_date: string | null;
  online_estimate_url: string | null;
  proposal_token: string | null;
  proposal_sent_at: string | null;
  proposal_signed_at: string | null;
  proposal_signed_name: string | null;
  proposal_signature_data: string | null;
  proposal_signed_ip: string | null;
  proposal_pdf_url: string | null;
  selected_financing_plan_id: string | null;
  payment_schedule_type: "standard" | "large_job";
  tax_rate: number | null;
  tax_amount: number | null;
  subtotal: number | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export type OptionStatus = "pending" | "approved" | "declined";

export interface EstimateOption {
  id: string;
  estimate_id: string;
  hcp_option_id: string | null;
  option_number: number;
  description: string | null;
  amount: number | null;
  status: OptionStatus;
}

export type FollowUpChannel = "email" | "sms" | "call";

export type FollowUpEventStatus =
  | "scheduled"
  | "pending_review"
  | "sent"
  | "opened"
  | "clicked"
  | "completed"
  | "skipped"
  | "snoozed";

export interface FollowUpEvent {
  id: string;
  estimate_id: string;
  sequence_step_index: number;
  channel: FollowUpChannel;
  status: FollowUpEventStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  content: string | null;
  comfort_pro_edited: boolean;
  created_at: string;
}

export type NotificationType =
  | "email_opened"
  | "link_clicked"
  | "call_due"
  | "lead_assigned"
  | "estimate_approved"
  | "estimate_declined"
  | "declining_soon"
  | "sms_received"
  | "unmatched_sms";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  estimate_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export type MessageDirection = "inbound" | "outbound";

export interface Message {
  id: string;
  customer_id: string | null;
  estimate_id: string | null;
  direction: MessageDirection;
  channel: string;
  body: string;
  twilio_message_sid: string | null;
  phone_number: string | null;
  sent_by: string | null;
  dismissed: boolean;
  created_at: string;
}

export interface FollowUpSequence {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  steps: SequenceStep[];
  created_by: string | null;
  created_at: string;
}

export interface SequenceStep {
  day_offset: number;
  channel: FollowUpChannel;
  template: string;
  is_call_task: boolean;
}

export interface Setting {
  key: string;
  value: number | string | boolean;
  updated_by: string | null;
  updated_at: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "moved_to_hcp" | "archived";

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lead_source: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  notes: string | null;
  hcp_customer_id: string | null;
  estimate_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserInvite {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  invited_by: string | null;
  created_at: string;
}

// Pricebook types
export type PricebookCategory = string;

export type HcpEntityType = "material" | "service";

export interface PricebookCategoryRow {
  id: string;
  name: string;
  slug: string;
  hcp_type: "material" | "service";
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RefrigerantType = "R-410A" | "R-22" | "R-454B" | "R-32" | "R-134A" | "R-404A" | "R-290";

export interface PricebookSupplier {
  id: string;
  name: string;
  slug: string;
  api_type: string | null;
  api_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricebookItem {
  id: string;
  category: PricebookCategory;
  display_name: string;
  spec_line: string | null;
  description: string | null;
  unit_price: number | null;
  cost: number | null;
  unit_of_measure: string | null;
  manufacturer: string | null;
  model_number: string | null;
  part_number: string | null;
  is_addon: boolean;
  addon_default_checked: boolean;
  applicable_system_types: string[] | null;
  is_commissionable: boolean;
  rebate_amount: number | null;
  taxable: boolean;
  gensco_sku: string | null;
  last_price_sync: string | null;
  hcp_uuid: string | null;
  hcp_type: HcpEntityType | null;
  hcp_category_uuid: string | null;
  hcp_category_name: string | null;
  system_type: string | null;
  efficiency_rating: string | null;
  refrigerant_type: string | null;
  supplier_id: string | null;
  manual_price: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Markup tier for auto-suggesting retail price from cost
export interface MarkupTier {
  id: string;
  tier_number: number;
  min_cost: number;
  max_cost: number | null;
  multiplier: number;
  created_at: string;
  updated_at: string;
}

// Labor calculator inputs (stored as JSONB in settings table, key: "labor_calculator")
export interface LaborCalculatorInputs {
  annual_overhead: number;
  num_installers: number;
  num_service_techs: number;
  highest_tech_wage: number;
  tax_benefits_multiplier: number;
  days_per_month: number;
  desired_profit_pct: number;
}

// Quote templates — pre-built packages with 3 tiers (Good/Better/Best)
export interface QuoteTemplate {
  id: string;
  name: string;
  description: string | null;
  system_type: string | null;
  created_by: string;
  is_shared: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuoteTemplateTier {
  id: string;
  template_id: string;
  tier_number: number;
  tier_name: string;
  tagline: string | null;
  feature_bullets: string[];
  is_recommended: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteTemplateItem {
  id: string;
  template_tier_id: string;
  pricebook_item_id: string;
  quantity: number;
  is_addon: boolean;
  addon_default_checked: boolean;
  sort_order: number;
}

// Estimate line items — replaces estimate_options for Pipeline-built quotes
export interface EstimateLineItem {
  id: string;
  estimate_id: string;
  pricebook_item_id: string | null;
  option_group: number;
  display_name: string;
  spec_line: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  is_addon: boolean;
  is_selected: boolean;
  sort_order: number;
  hcp_option_id: string | null;
  created_at: string;
}

// Financing plans — admin-managed, used by proposal calculator
export interface FinancingPlan {
  id: string;
  plan_code: string;
  label: string;
  fee_pct: number;
  months: number;
  apr: number;
  is_default: boolean;
  is_active: boolean;
  synchrony_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Proposal engagement — tracks customer interactions on proposal page
export interface ProposalEngagement {
  id: string;
  estimate_id: string;
  event_type: string;
  option_group: number | null;
  financing_plan: string | null;
  session_seconds: number | null;
  device_type: string | null;
  occurred_at: string;
}

// Large job tags — trigger 4-payment schedule on proposal
export interface LargeJobTag {
  id: string;
  tag_name: string;
  is_active: boolean;
}

// Joined types used in UI queries
export interface EstimateWithRelations extends Estimate {
  customers: Customer;
  users?: Pick<User, "id" | "name" | "email">;
  follow_up_events?: FollowUpEvent[];
  estimate_options?: EstimateOption[];
  estimate_line_items?: EstimateLineItem[];
  messages?: Message[];
}
