-- 024_qb_qa_fixes.sql
-- Phase 7.7: Quote Builder QA Fixes + Proposal Polish
-- Adds tier_metadata JSONB on estimates, 3 new pricebook categories

-- 1. Store tier-level metadata (names, taglines, feature_bullets, is_recommended) with estimates
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS tier_metadata JSONB;

-- 2. New pricebook categories
INSERT INTO pricebook_categories (name, slug, hcp_type, display_order) VALUES
  ('Electrical',  'electrical', 'material', 13),
  ('Exclusion',   'exclusion',  'service',  14),
  ('Controls',    'controls',   'material', 15)
ON CONFLICT (slug) DO NOTHING;
