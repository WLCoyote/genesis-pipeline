-- 009: Add columns to messages table for SMS inbox management
-- dismissed: allows admins/CSRs to soft-delete unmatched SMS threads
-- phone_number: stores the external party's phone number for thread grouping
--   (inbound = sender's number, outbound = recipient's number)

ALTER TABLE messages ADD COLUMN IF NOT EXISTS dismissed boolean NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS phone_number text;

-- Index for efficient inbox queries (non-dismissed, no-estimate messages)
CREATE INDEX IF NOT EXISTS idx_messages_inbox
  ON messages (dismissed, estimate_id, channel, created_at DESC)
  WHERE dismissed = false AND estimate_id IS NULL;
