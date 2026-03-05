-- 034: Add job-related fields to estimates for HCP webhook integration
-- Supports estimate.copy_to_job (hcp_job_id) and job.paid (payment tracking)

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS hcp_job_id TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS job_paid_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS job_paid_amount DECIMAL(10,2);
