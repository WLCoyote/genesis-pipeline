-- 013_markup_tiers.sql
-- Markup tiers table for auto-suggesting retail price from cost
-- Used by equipment, material, and addon categories in pricebook

CREATE TABLE IF NOT EXISTS markup_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_number INTEGER UNIQUE NOT NULL,
  min_cost DECIMAL(10,2) NOT NULL,
  max_cost DECIMAL(10,2),  -- NULL = no upper bound (last tier)
  multiplier DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE markup_tiers ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read tiers (comfort pros need them for quote builder)
CREATE POLICY "Authenticated users can read markup tiers"
  ON markup_tiers FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert markup tiers"
  ON markup_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update markup tiers"
  ON markup_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete markup tiers"
  ON markup_tiers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Seed the 11 default tiers
INSERT INTO markup_tiers (tier_number, min_cost, max_cost, multiplier) VALUES
  (1,   0.01,    5.00,  7.00),
  (2,   5.01,   10.00,  5.50),
  (3,  10.01,   25.00,  4.50),
  (4,  25.01,   50.00,  3.75),
  (5,  50.01,  100.00,  3.25),
  (6, 100.01,  200.00,  2.75),
  (7, 200.01,  500.00,  2.50),
  (8, 500.01, 1000.00,  2.25),
  (9, 1000.01, 2500.00, 2.00),
  (10, 2500.01, 5000.00, 1.85),
  (11, 5000.01, NULL,    1.75)
ON CONFLICT (tier_number) DO NOTHING;
