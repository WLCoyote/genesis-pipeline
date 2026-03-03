-- 030: Install Kits (Backlog A)
-- Pre-built material bundles that expand into individual pricebook items in the quote builder

-- Install kits (bundles of pricebook items)
CREATE TABLE install_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  system_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kit items (references pricebook_items with quantity)
CREATE TABLE install_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES install_kits(id) ON DELETE CASCADE,
  pricebook_item_id UUID NOT NULL REFERENCES pricebook_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_install_kit_items_kit ON install_kit_items(kit_id);
CREATE INDEX idx_install_kit_items_pricebook ON install_kit_items(pricebook_item_id);

-- RLS
ALTER TABLE install_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE install_kit_items ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read kits
CREATE POLICY "Authenticated users can read kits"
  ON install_kits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read kit items"
  ON install_kit_items FOR SELECT
  TO authenticated
  USING (true);

-- Admin CUD for kits
CREATE POLICY "Admins can insert kits"
  ON install_kits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update kits"
  ON install_kits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete kits"
  ON install_kits FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin CUD for kit items
CREATE POLICY "Admins can insert kit items"
  ON install_kit_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update kit items"
  ON install_kit_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete kit items"
  ON install_kit_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role full access (for API routes)
CREATE POLICY "Service role full access to kits"
  ON install_kits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to kit items"
  ON install_kit_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
