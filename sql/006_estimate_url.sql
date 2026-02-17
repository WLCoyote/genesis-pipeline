-- Add online_estimate_url to estimates table for customer-facing HCP link
-- Run in Supabase SQL Editor

ALTER TABLE estimates
ADD COLUMN online_estimate_url text;

COMMENT ON COLUMN estimates.online_estimate_url IS 'Customer-facing HCP estimate URL (e.g. https://client.housecallpro.com/estimates/...)';
