-- 018: Quote Builder & Proposal Engine schema
-- New tables: quote_templates, quote_template_tiers, quote_template_items,
--             estimate_line_items, financing_plans, proposal_engagement, large_job_tags
-- New columns on estimates for proposal/tax/financing fields

-- ============================================================
-- 0. New columns on estimates (must come first — referenced by RLS policies below)
-- ============================================================
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_token TEXT UNIQUE;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_sent_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_signed_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_signed_name TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_signature_data TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_signed_ip TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_pdf_url TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS payment_schedule_type TEXT DEFAULT 'standard'
  CHECK (payment_schedule_type IN ('standard', 'large_job'));
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);

-- Index for proposal token lookups (public proposal page)
CREATE INDEX IF NOT EXISTS idx_estimates_proposal_token ON estimates(proposal_token) WHERE proposal_token IS NOT NULL;

-- ============================================================
-- 1. quote_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  system_type TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER set_quote_templates_updated_at
  BEFORE UPDATE ON quote_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read shared or own templates"
  ON quote_templates FOR SELECT
  TO authenticated
  USING (is_active = true AND (is_shared = true OR created_by = auth.uid()));

CREATE POLICY "Users can insert own templates"
  ON quote_templates FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owner or admin can update templates"
  ON quote_templates FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Owner or admin can delete templates"
  ON quote_templates FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ============================================================
-- 2. quote_template_tiers
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_template_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES quote_templates(id) ON DELETE CASCADE,
  tier_number INTEGER NOT NULL CHECK (tier_number BETWEEN 1 AND 3),
  tier_name TEXT NOT NULL,
  tagline TEXT,
  feature_bullets JSONB NOT NULL DEFAULT '[]',
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, tier_number)
);

CREATE OR REPLACE TRIGGER set_quote_template_tiers_updated_at
  BEFORE UPDATE ON quote_template_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE quote_template_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read tiers for visible templates"
  ON quote_template_tiers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_templates t
      WHERE t.id = template_id
        AND t.is_active = true
        AND (t.is_shared = true OR t.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can insert tiers for own templates"
  ON quote_template_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quote_templates t
      WHERE t.id = template_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "Owner or admin can update tiers"
  ON quote_template_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_templates t
      WHERE t.id = template_id
        AND (t.created_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
    )
  );

CREATE POLICY "Owner or admin can delete tiers"
  ON quote_template_tiers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_templates t
      WHERE t.id = template_id
        AND (t.created_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
    )
  );

-- ============================================================
-- 3. quote_template_items
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_tier_id UUID NOT NULL REFERENCES quote_template_tiers(id) ON DELETE CASCADE,
  pricebook_item_id UUID NOT NULL REFERENCES pricebook_items(id),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  is_addon BOOLEAN NOT NULL DEFAULT false,
  addon_default_checked BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE quote_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read items for visible templates"
  ON quote_template_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_template_tiers tier
      JOIN quote_templates t ON t.id = tier.template_id
      WHERE tier.id = template_tier_id
        AND t.is_active = true
        AND (t.is_shared = true OR t.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can insert items for own templates"
  ON quote_template_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quote_template_tiers tier
      JOIN quote_templates t ON t.id = tier.template_id
      WHERE tier.id = template_tier_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "Owner or admin can update items"
  ON quote_template_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_template_tiers tier
      JOIN quote_templates t ON t.id = tier.template_id
      WHERE tier.id = template_tier_id
        AND (t.created_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
    )
  );

CREATE POLICY "Owner or admin can delete items"
  ON quote_template_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_template_tiers tier
      JOIN quote_templates t ON t.id = tier.template_id
      WHERE tier.id = template_tier_id
        AND (t.created_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
    )
  );

-- ============================================================
-- 4. estimate_line_items
-- ============================================================
CREATE TABLE IF NOT EXISTS estimate_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  pricebook_item_id UUID REFERENCES pricebook_items(id),
  option_group INTEGER NOT NULL CHECK (option_group BETWEEN 1 AND 3),
  display_name TEXT NOT NULL,
  spec_line TEXT,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  is_addon BOOLEAN NOT NULL DEFAULT false,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hcp_option_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_line_items_estimate_id ON estimate_line_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_option_group ON estimate_line_items(estimate_id, option_group);
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_pricebook_item ON estimate_line_items(pricebook_item_id);

ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read line items"
  ON estimate_line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert line items"
  ON estimate_line_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'comfort_pro'))
  );

CREATE POLICY "Admin can update line items"
  ON estimate_line_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'comfort_pro'))
  );

CREATE POLICY "Admin can delete line items"
  ON estimate_line_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ============================================================
-- 5. financing_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS financing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  fee_pct DECIMAL(5,4) NOT NULL,
  months INTEGER NOT NULL,
  apr DECIMAL(5,4) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  synchrony_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER set_financing_plans_updated_at
  BEFORE UPDATE ON financing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE financing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read financing plans"
  ON financing_plans FOR SELECT
  TO authenticated
  USING (true);

-- Also allow anonymous read so proposal page can fetch plans
CREATE POLICY "Anon can read active financing plans"
  ON financing_plans FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Admin can insert financing plans"
  ON financing_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admin can update financing plans"
  ON financing_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admin can delete financing plans"
  ON financing_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Seed default Synchrony plans
INSERT INTO financing_plans (plan_code, label, fee_pct, months, apr, is_default, display_order) VALUES
  ('930', '25 Months, 0% APR (Same-as-Cash)', 0.1160, 25, 0, true, 1),
  ('980', '37 Months, 5.99% APR', 0.0870, 37, 0.0599, false, 2),
  ('943', '132 Months, 9.99% APR', 0.0870, 132, 0.0999, false, 3)
ON CONFLICT (plan_code) DO NOTHING;

-- ============================================================
-- 6. proposal_engagement
-- ============================================================
CREATE TABLE IF NOT EXISTS proposal_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_open', 'option_view', 'calculator_open', 'plan_selected',
    'addon_checked', 'addon_unchecked', 'signature_started', 'signed'
  )),
  option_group INTEGER,
  financing_plan TEXT,
  session_seconds INTEGER,
  device_type TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_engagement_estimate_id ON proposal_engagement(estimate_id);

ALTER TABLE proposal_engagement ENABLE ROW LEVEL SECURITY;

-- Public INSERT: customer interactions from the proposal page (no auth)
CREATE POLICY "Public can insert engagement events"
  ON proposal_engagement FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_id AND estimates.proposal_token IS NOT NULL
    )
  );

-- Authenticated users can also insert (for server-side tracking)
CREATE POLICY "Authenticated can insert engagement events"
  ON proposal_engagement FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Read scoped to authenticated users
CREATE POLICY "Authenticated users can read engagement events"
  ON proposal_engagement FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 7. large_job_tags
-- ============================================================
CREATE TABLE IF NOT EXISTS large_job_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE large_job_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read large job tags"
  ON large_job_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage large job tags"
  ON large_job_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

INSERT INTO large_job_tags (tag_name) VALUES
  ('Remodel'),
  ('New Con')
ON CONFLICT (tag_name) DO NOTHING;

-- ============================================================
-- 8. FK columns on estimates (depend on tables created above)
-- ============================================================
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS selected_financing_plan_id UUID REFERENCES financing_plans(id);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES quote_templates(id);
