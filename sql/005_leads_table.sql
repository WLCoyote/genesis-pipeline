-- Leads table for Flow 2: pre-HCP leads from Facebook, Google, etc.
-- Run in Supabase SQL Editor

CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  address text,
  city text,
  state text DEFAULT 'WA',
  zip text,
  lead_source text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'moved_to_hcp')),
  assigned_to uuid REFERENCES users(id),
  notes text,
  hcp_customer_id text,
  estimate_id uuid REFERENCES estimates(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin: full access
CREATE POLICY leads_admin_all ON leads
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

-- CSR: full access (they manage leads)
CREATE POLICY leads_csr_all ON leads
  FOR ALL TO authenticated
  USING (get_user_role() = 'csr');

-- Comfort Pro: read leads assigned to them
CREATE POLICY leads_comfort_pro_read ON leads
  FOR SELECT TO authenticated
  USING (get_user_role() = 'comfort_pro' AND assigned_to = auth.uid());

-- Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
