-- 011: Add is_active toggle to follow_up_sequences
-- Allows pausing all follow-ups without deleting steps

ALTER TABLE follow_up_sequences
ADD COLUMN is_active boolean NOT NULL DEFAULT true;
