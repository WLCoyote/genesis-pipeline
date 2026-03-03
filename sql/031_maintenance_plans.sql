-- 031: Maintenance Plans (Backlog B)
-- Recurring service plans that can be added to proposals as add-ons

CREATE TABLE maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  interval TEXT NOT NULL DEFAULT 'annual' CHECK (interval IN ('annual', 'semi-annual', 'quarterly')),
  coverage_items JSONB NOT NULL DEFAULT '[]',
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  annual_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read maintenance plans"
  ON maintenance_plans FOR SELECT
  TO authenticated
  USING (true);

-- Admin CUD
CREATE POLICY "Admins can insert maintenance plans"
  ON maintenance_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update maintenance plans"
  ON maintenance_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete maintenance plans"
  ON maintenance_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role full access
CREATE POLICY "Service role full access to maintenance plans"
  ON maintenance_plans FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
