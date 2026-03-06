// Campaign & email template types

export type CampaignType = "email" | "sms";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "paused"
  | "sent"
  | "cancelled";

export type CampaignRecipientStatus =
  | "queued"
  | "sent"
  | "opened"
  | "clicked"
  | "bounced"
  | "unsubscribed"
  | "skipped";

export interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  blocks: EmailBlock[];
  is_preset: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BlockType =
  | "header"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "two-column";

export interface EmailBlock {
  id: string;
  type: BlockType;
  content: Record<string, unknown>;
}

// Block content shapes
export interface HeaderBlockContent {
  title: string;
  showLogo: boolean;
}
export interface TextBlockContent {
  html: string;
}
export interface ImageBlockContent {
  url: string;
  alt: string;
  width: number;
}
export interface ButtonBlockContent {
  text: string;
  url: string;
  color: string;
}
export interface DividerBlockContent {
  color?: string;
}
export interface SpacerBlockContent {
  height: number;
}
export interface TwoColumnBlockContent {
  left: { html: string };
  right: { html: string };
}

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  subject: string | null;
  email_template_id: string | null;
  preview_text: string | null;
  sms_body: string | null;
  segment_filter: SegmentFilter;
  exclude_active_pipeline: boolean;
  exclude_recent_contact_days: number | null;
  batch_size: number;
  batch_interval_minutes: number;
  warmup_mode: boolean;
  warmup_day: number | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  audience_count: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  customer_id: string;
  status: CampaignRecipientStatus;
  resend_message_id: string | null;
  twilio_message_sid: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  unsubscribed_at: string | null;
  batch_number: number | null;
  created_at: string;
}

export interface UnsubscribeToken {
  id: string;
  customer_id: string;
  token: string;
  created_at: string;
}

// Segment filter types
export interface SegmentFilter {
  logic?: "and" | "or";
  rules?: SegmentRule[];
  groups?: SegmentFilter[];
}

export interface SegmentRule {
  field: string;
  operator: string;
  value: unknown;
}

// Available segment fields and their operators
export const SEGMENT_FIELDS = [
  { field: "tags", label: "Tags", operators: ["contains_any", "contains_all", "not_contains"] },
  { field: "equipment_type", label: "Equipment Type", operators: ["equals", "not_equals", "is_empty", "is_not_empty"] },
  { field: "city", label: "City", operators: ["equals", "not_equals", "is_empty"] },
  { field: "zip", label: "ZIP Code", operators: ["equals", "in", "is_empty"] },
  { field: "state", label: "State", operators: ["equals", "not_equals"] },
  { field: "last_service_date", label: "Last Service", operators: ["older_than_days", "newer_than_days", "is_empty"] },
  { field: "lead_source", label: "Lead Source", operators: ["equals", "not_equals", "is_empty"] },
  { field: "has_estimate", label: "Has Estimate", operators: ["equals"] },
  { field: "estimate_status", label: "Estimate Status", operators: ["equals", "not_equals"] },
] as const;

// Campaign email variable tokens
export const CAMPAIGN_TOKENS = [
  "{{customer_name}}",
  "{{customer_email}}",
  "{{customer_city}}",
  "{{company_name}}",
  "{{unsubscribe_url}}",
] as const;

// Warmup schedule: day → max batch size
export const WARMUP_SCHEDULE: Record<number, number> = {
  0: 25,
  1: 50,
  2: 100,
  3: 200,
  4: 500,
};
