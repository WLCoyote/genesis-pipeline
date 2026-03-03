-- 032: Payment Schedules (Backlog C)
-- Configurable payment milestone schedules for proposals

CREATE TABLE payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stages JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  trigger_tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add payment_schedule_id to estimates
ALTER TABLE estimates ADD COLUMN payment_schedule_id UUID REFERENCES payment_schedules(id);

-- RLS
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read payment schedules"
  ON payment_schedules FOR SELECT
  TO authenticated
  USING (true);

-- Admin CUD
CREATE POLICY "Admins can insert payment schedules"
  ON payment_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update payment schedules"
  ON payment_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete payment schedules"
  ON payment_schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role full access
CREATE POLICY "Service role full access to payment schedules"
  ON payment_schedules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed: Standard 50/50 (default)
INSERT INTO payment_schedules (name, stages, is_default, trigger_tags) VALUES
  ('Standard 50/50', '[{"label": "Deposit", "percentage": 50, "condition": "Due when scheduled"}, {"label": "Completion", "percentage": 50, "condition": "Upon install complete"}]', true, '{}'),
  ('Large Job 4-Payment', '[{"label": "Deposit", "percentage": 50, "condition": "Due when scheduled"}, {"label": "Rough-in", "percentage": 25, "condition": "After rough-in complete"}, {"label": "Install", "percentage": 25, "condition": "After install complete"}, {"label": "Final", "percentage": 0, "condition": "After final inspection", "fixed_amount": 1000}]', false, '{Remodel,New Con}');
