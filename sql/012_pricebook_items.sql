-- 012: Create pricebook_items table
-- Pipeline's source-of-truth pricebook. Syncs to HCP as a replica for field techs.
-- Adapts the v4.0 spec schema with HCP-specific fields for bidirectional sync.

CREATE TABLE pricebook_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  category TEXT NOT NULL CHECK (category IN ('equipment', 'labor', 'material', 'addon', 'service_plan')),
  display_name TEXT NOT NULL,
  spec_line TEXT,
  description TEXT,

  -- Pricing
  unit_price DECIMAL(10,2),
  cost DECIMAL(10,2),
  unit_of_measure TEXT,

  -- Product info
  manufacturer TEXT,
  model_number TEXT,
  part_number TEXT,

  -- Proposal behavior
  is_addon BOOLEAN NOT NULL DEFAULT false,
  addon_default_checked BOOLEAN NOT NULL DEFAULT false,
  applicable_system_types TEXT[],
  is_commissionable BOOLEAN NOT NULL DEFAULT true,
  rebate_amount DECIMAL(10,2),
  taxable BOOLEAN NOT NULL DEFAULT true,

  -- Supplier (future Gensco integration)
  gensco_sku TEXT,
  last_price_sync TIMESTAMPTZ,

  -- HCP sync
  hcp_uuid TEXT UNIQUE,
  hcp_type TEXT CHECK (hcp_type IN ('material', 'service')),
  hcp_category_uuid TEXT,
  hcp_category_name TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change (reuses existing trigger function)
CREATE TRIGGER set_pricebook_items_updated_at
  BEFORE UPDATE ON pricebook_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE pricebook_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (comfort pros need it for future quote builder)
CREATE POLICY "pricebook_items_select"
  ON pricebook_items FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "pricebook_items_insert"
  ON pricebook_items FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can update
CREATE POLICY "pricebook_items_update"
  ON pricebook_items FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can delete (soft delete preferred, but policy exists for safety)
CREATE POLICY "pricebook_items_delete"
  ON pricebook_items FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Index for common queries
CREATE INDEX idx_pricebook_items_category ON pricebook_items (category);
CREATE INDEX idx_pricebook_items_active ON pricebook_items (is_active);
CREATE INDEX idx_pricebook_items_hcp_uuid ON pricebook_items (hcp_uuid) WHERE hcp_uuid IS NOT NULL;
