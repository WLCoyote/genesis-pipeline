-- 025: Add HCP category path for hierarchical organization
-- Stores the full path like "Heat Pump > American Standard > 14 SEER2"
ALTER TABLE pricebook_items ADD COLUMN IF NOT EXISTS hcp_category_path text;
