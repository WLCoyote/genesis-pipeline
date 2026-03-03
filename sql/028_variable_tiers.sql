-- Phase 8.5C: Variable tier count (1-10 options instead of 1-3)
-- Run in Supabase SQL Editor

-- Widen option_group check on estimate_line_items from 1-3 to 1-10
ALTER TABLE estimate_line_items DROP CONSTRAINT IF EXISTS estimate_line_items_option_group_check;
ALTER TABLE estimate_line_items ADD CONSTRAINT estimate_line_items_option_group_check CHECK (option_group BETWEEN 1 AND 10);

-- Widen tier_number check on quote_template_tiers from 1-3 to 1-10
ALTER TABLE quote_template_tiers DROP CONSTRAINT IF EXISTS quote_template_tiers_tier_number_check;
ALTER TABLE quote_template_tiers ADD CONSTRAINT quote_template_tiers_tier_number_check CHECK (tier_number BETWEEN 1 AND 10);
