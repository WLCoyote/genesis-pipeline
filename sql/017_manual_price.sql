-- 017: Add manual_price flag to pricebook_items
-- Items with manual_price = true are skipped during bulk recalculation from markup tiers

ALTER TABLE pricebook_items
ADD COLUMN IF NOT EXISTS manual_price BOOLEAN NOT NULL DEFAULT false;

-- Index for recalculate query (find non-manual items efficiently)
CREATE INDEX IF NOT EXISTS idx_pricebook_items_manual_price
ON pricebook_items (manual_price) WHERE manual_price = false;
