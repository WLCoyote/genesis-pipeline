-- Add "archived" status to leads table
-- Run in Supabase SQL Editor

ALTER TABLE leads DROP CONSTRAINT leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'qualified', 'moved_to_hcp', 'archived'));
