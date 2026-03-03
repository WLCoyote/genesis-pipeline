-- Phase 8.4A: Commission tracking schema
-- Run in Supabase SQL Editor
-- Depends on: users, estimates tables existing

-- ============================================
-- 1. commission_tiers — admin-configurable rate tiers
-- ============================================
CREATE TABLE commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'annual')),
  min_revenue DECIMAL(10,2) NOT NULL,
  max_revenue DECIMAL(10,2),
  rate_pct DECIMAL(5,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. commission_records — one per signed estimate
-- ============================================
CREATE TABLE commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id),
  user_id UUID NOT NULL REFERENCES users(id),
  manager_id UUID REFERENCES users(id),
  pre_tax_revenue DECIMAL(10,2),
  tier_rate_pct DECIMAL(5,2) NOT NULL,
  estimated_amount DECIMAL(10,2) NOT NULL,
  confirmed_amount DECIMAL(10,2),
  manager_commission_amount DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'estimated' CHECK (status IN ('estimated', 'confirmed', 'paid')),
  confirmed_at TIMESTAMPTZ,
  period_revenue_at_confirmation DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. Add manager fields to users
-- ============================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS manager_commission_pct DECIMAL(5,2) NOT NULL DEFAULT 0;

-- ============================================
-- 4. RLS policies
-- ============================================

-- commission_tiers: authenticated can read, admin can write
ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read commission_tiers"
  ON commission_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin full access on commission_tiers"
  ON commission_tiers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- commission_records: user sees own, admin sees all
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own commission_records"
  ON commission_records FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin full access on commission_records"
  ON commission_records FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role bypass (for cron jobs and lib functions)
CREATE POLICY "Service role full access on commission_tiers"
  ON commission_tiers FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access on commission_records"
  ON commission_records FOR ALL
  TO service_role
  USING (true);

-- ============================================
-- 5. Indexes
-- ============================================
CREATE INDEX idx_commission_records_user_id ON commission_records(user_id);
CREATE INDEX idx_commission_records_estimate_id ON commission_records(estimate_id);
CREATE INDEX idx_commission_records_status ON commission_records(status);
CREATE INDEX idx_commission_tiers_period_active ON commission_tiers(period, is_active);

-- ============================================
-- 6. Seed default tiers (monthly)
-- ============================================
INSERT INTO commission_tiers (period, min_revenue, max_revenue, rate_pct) VALUES
  ('monthly', 0,      24999.99, 5.00),
  ('monthly', 25000,  49999.99, 6.00),
  ('monthly', 50000,  99999.99, 7.00),
  ('monthly', 100000, NULL,     8.00);
