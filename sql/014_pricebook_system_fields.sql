-- 014: Add system_type and efficiency_rating to pricebook_items
-- Enables multi-level navigation: Category → Manufacturer → System Type → Efficiency

ALTER TABLE pricebook_items ADD COLUMN IF NOT EXISTS system_type TEXT;
ALTER TABLE pricebook_items ADD COLUMN IF NOT EXISTS efficiency_rating TEXT;
