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

// Joined types used in UI queries
export interface EstimateWithRelations extends Estimate {
  customers: Customer;
  users?: Pick<User, "id" | "name" | "email">;
  follow_up_events?: FollowUpEvent[];
  estimate_options?: EstimateOption[];
  messages?: Message[];
}
