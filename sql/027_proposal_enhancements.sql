-- 027: Proposal enhancements — payment method + item visibility
-- Phase 8.5B

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS payment_method TEXT
  CHECK (payment_method IN ('cash', 'financing'));

ALTER TABLE estimate_line_items ADD COLUMN IF NOT EXISTS show_on_proposal BOOLEAN NOT NULL DEFAULT true;
