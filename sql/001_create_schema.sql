-- ============================================
-- Genesis HVAC Pipeline — Complete Database Schema
-- Version 2.1
-- Run this in the Supabase SQL Editor
-- ============================================


-- ============================================
-- HELPER: auto-update updated_at on row changes
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- TABLES
-- ============================================

-- Team members with role-based access
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('admin', 'comfort_pro', 'csr')),
  google_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Customer records synced from HCP
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hcp_customer_id text UNIQUE,
  email text,
  phone text,
  name text NOT NULL,
  address text,
  equipment_type text,
  last_service_date date,
  lead_source text,
  tags text[] DEFAULT '{}',
  do_not_contact boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Company-level follow-up sequence templates
CREATE TABLE follow_up_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  steps jsonb NOT NULL DEFAULT '[]',
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Parent estimate record — central pipeline object
CREATE TABLE estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_number text NOT NULL UNIQUE,
  hcp_estimate_id text,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'active', 'snoozed', 'won', 'lost', 'dormant')),
  total_amount numeric(10, 2),
  sent_date date,
  sequence_id uuid REFERENCES follow_up_sequences(id),
  sequence_step_index integer NOT NULL DEFAULT 0,
  snooze_until timestamptz,
  snooze_note text,
  auto_decline_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Individual options within an estimate
CREATE TABLE estimate_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  hcp_option_id text,
  option_number integer NOT NULL,
  description text,
  amount numeric(10, 2),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined'))
);

-- Execution log for each follow-up sequence step
CREATE TABLE follow_up_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  sequence_step_index integer NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'call')),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'pending_review', 'sent', 'opened', 'clicked', 'completed', 'skipped', 'snoozed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  content text,
  comfort_pro_edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Real-time alerts for team members
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('email_opened', 'link_clicked', 'call_due', 'lead_assigned', 'estimate_approved', 'estimate_declined', 'declining_soon', 'sms_received')),
  estimate_id uuid REFERENCES estimates(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SMS conversation history (inbound + outbound)
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  estimate_id uuid REFERENCES estimates(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel text NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms')),
  body text NOT NULL,
  twilio_message_sid text,
  sent_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Phase 2: Broadcast marketing campaigns
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'sms')),
  subject text,
  content text,
  segment_filter jsonb DEFAULT '{}',
  exclude_active_pipeline boolean NOT NULL DEFAULT true,
  not_contacted_days integer,
  batch_size integer,
  batch_interval integer,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sending', 'sent')),
  sent_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Phase 2: Per-recipient campaign tracking
CREATE TABLE campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status text NOT NULL
    CHECK (status IN ('sent', 'opened', 'clicked', 'bounced', 'unsubscribed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- System configuration (key-value)
CREATE TABLE settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_role ON users(role);

-- Customers
CREATE INDEX idx_customers_hcp_id ON customers(hcp_customer_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Estimates
CREATE INDEX idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX idx_estimates_assigned_to ON estimates(assigned_to);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_hcp_id ON estimates(hcp_estimate_id);
CREATE INDEX idx_estimates_auto_decline ON estimates(auto_decline_date);
CREATE INDEX idx_estimates_sent_date ON estimates(sent_date);

-- Estimate options
CREATE INDEX idx_estimate_options_estimate_id ON estimate_options(estimate_id);
CREATE INDEX idx_estimate_options_hcp_id ON estimate_options(hcp_option_id);

-- Follow-up events
CREATE INDEX idx_follow_up_events_estimate_id ON follow_up_events(estimate_id);
CREATE INDEX idx_follow_up_events_status ON follow_up_events(status);
CREATE INDEX idx_follow_up_events_scheduled_at ON follow_up_events(scheduled_at);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_estimate_id ON notifications(estimate_id);

-- Messages
CREATE INDEX idx_messages_customer_id ON messages(customer_id);
CREATE INDEX idx_messages_estimate_id ON messages(estimate_id);

-- Campaign events (Phase 2)
CREATE INDEX idx_campaign_events_campaign_id ON campaign_events(campaign_id);
CREATE INDEX idx_campaign_events_customer_id ON campaign_events(customer_id);


-- ============================================
-- ROW LEVEL SECURITY (enabled, policies added in Step 1.3)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;


-- ============================================
-- DEFAULT DATA
-- ============================================

INSERT INTO settings (key, value) VALUES
  ('auto_decline_days', '60'::jsonb),
  ('declining_soon_warning_days', '3'::jsonb);
