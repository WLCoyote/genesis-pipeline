-- 015: Dynamic pricebook categories + refrigerant type
-- Creates pricebook_categories table, seeds defaults, drops hardcoded CHECK,
-- adds refrigerant_type to pricebook_items.

-- 1. Create pricebook_categories table
CREATE TABLE IF NOT EXISTS pricebook_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  hcp_type TEXT NOT NULL CHECK (hcp_type IN ('material', 'service')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_pricebook_categories_updated_at
  BEFORE UPDATE ON pricebook_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE pricebook_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read categories"
  ON pricebook_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert categories"
  ON pricebook_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admin can update categories"
  ON pricebook_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admin can delete categories"
  ON pricebook_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 2. Seed default categories
INSERT INTO pricebook_categories (name, slug, hcp_type, display_order) VALUES
  ('Equipment',    'equipment',    'material', 1),
  ('Labor',        'labor',        'service',  2),
  ('Material',     'material',     'material', 3),
  ('Add-On',       'addon',        'material', 4),
  ('Service Plan', 'service_plan', 'service',  5),
  ('Accessory',    'accessory',    'material', 6)
ON CONFLICT (slug) DO NOTHING;

-- 3. Drop the hardcoded CHECK constraint on pricebook_items.category
-- The constraint name may vary — try the standard naming convention
ALTER TABLE pricebook_items DROP CONSTRAINT IF EXISTS pricebook_items_category_check;

-- 4. Add refrigerant_type to pricebook_items
ALTER TABLE pricebook_items ADD COLUMN IF NOT EXISTS refrigerant_type TEXT;
