-- 019: Add 'draft' status to estimates table
-- Draft = HCP estimate exists but hasn't been sent to customer yet (post-walkthrough, awaiting quote build in Pipeline)

ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_status_check;
ALTER TABLE estimates ADD CONSTRAINT estimates_status_check
  CHECK (status IN ('sent', 'active', 'snoozed', 'won', 'lost', 'dormant', 'draft'));
