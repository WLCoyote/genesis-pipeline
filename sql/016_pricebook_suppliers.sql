-- 016: Pricebook suppliers — track which distributor/vendor an item comes from
-- Enables future API integrations (Gensco, Ferguson, etc.) to auto-update pricing.

-- 1. Create pricebook_suppliers table
CREATE TABLE IF NOT EXISTS pricebook_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  api_type TEXT,  -- 'gensco', 'ferguson', 'manual', null — identifies which API client to use
  api_config JSONB DEFAULT '{}',  -- future: endpoint, credentials, sync schedule
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_pricebook_suppliers_updated_at
  BEFORE UPDATE ON pricebook_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE pricebook_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read suppliers"
  ON pricebook_suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert suppliers"
  ON pricebook_suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admin can update suppliers"
  ON pricebook_suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admin can delete suppliers"
  ON pricebook_suppliers FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 2. Seed common HVAC distributors
INSERT INTO pricebook_suppliers (name, slug, api_type) VALUES
  ('Gensco',           'gensco',           'gensco'),
  ('Ferguson',         'ferguson',          null),
  ('Johnstone Supply', 'johnstone_supply',  null),
  ('RE Michel',        're_michel',         null),
  ('Manual Entry',     'manual',            'manual')
ON CONFLICT (slug) DO NOTHING;

-- 3. Add supplier_id to pricebook_items
ALTER TABLE pricebook_items ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES pricebook_suppliers(id);
