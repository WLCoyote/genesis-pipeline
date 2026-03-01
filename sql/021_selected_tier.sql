-- 021: Add selected_tier column to estimates
-- Tracks which tier (1, 2, or 3) the customer selected when signing the proposal.

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS selected_tier INTEGER
  CHECK (selected_tier IN (1, 2, 3));
