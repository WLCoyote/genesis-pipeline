-- ============================================
-- Genesis HVAC Pipeline — Row Level Security Policies
-- Version 2.1
-- Run this in the Supabase SQL Editor AFTER 001_create_schema.sql
-- ============================================


-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Look up the current user's role from the users table.
-- SECURITY DEFINER so it can read the users table even with RLS enabled.
-- STABLE so PostgreSQL caches the result within a single query.
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;


-- ============================================
-- USERS
-- All authenticated users can read (needed for assignment dropdowns, names).
-- Only admin can create/update/delete users.
-- ============================================

CREATE POLICY "users_select"
  ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "users_insert"
  ON users FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "users_update"
  ON users FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "users_delete"
  ON users FOR DELETE
  USING (get_user_role() = 'admin');


-- ============================================
-- CUSTOMERS
-- All authenticated users can read (comfort pro sees customer info, CSR sees customers).
-- Only admin can write (CSV import runs server-side with service role).
-- ============================================

CREATE POLICY "customers_select"
  ON customers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "customers_insert"
  ON customers FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "customers_update"
  ON customers FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "customers_delete"
  ON customers FOR DELETE
  USING (get_user_role() = 'admin');


-- ============================================
-- ESTIMATES
-- Admin/CSR see all. Comfort pro sees only assigned estimates.
-- Admin/CSR can create. Comfort pro can update own (snooze, etc.).
-- Only admin can delete.
-- ============================================

CREATE POLICY "estimates_select"
  ON estimates FOR SELECT
  USING (
    get_user_role() IN ('admin', 'csr')
    OR assigned_to = auth.uid()
  );

CREATE POLICY "estimates_insert"
  ON estimates FOR INSERT
  WITH CHECK (
    get_user_role() IN ('admin', 'csr')
  );

CREATE POLICY "estimates_update"
  ON estimates FOR UPDATE
  USING (
    get_user_role() IN ('admin', 'csr')
    OR assigned_to = auth.uid()
  );

CREATE POLICY "estimates_delete"
  ON estimates FOR DELETE
  USING (get_user_role() = 'admin');


-- ============================================
-- ESTIMATE OPTIONS
-- Visible if user can see the parent estimate.
-- Admin and comfort pro (own estimates) can update.
-- Only admin can delete.
-- ============================================

CREATE POLICY "estimate_options_select"
  ON estimate_options FOR SELECT
  USING (
    get_user_role() IN ('admin', 'csr')
    OR EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_options.estimate_id
        AND estimates.assigned_to = auth.uid()
    )
  );

CREATE POLICY "estimate_options_insert"
  ON estimate_options FOR INSERT
  WITH CHECK (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_options.estimate_id
        AND estimates.assigned_to = auth.uid()
    )
  );

CREATE POLICY "estimate_options_update"
  ON estimate_options FOR UPDATE
  USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_options.estimate_id
        AND estimates.assigned_to = auth.uid()
    )
  );

CREATE POLICY "estimate_options_delete"
  ON estimate_options FOR DELETE
  USING (get_user_role() = 'admin');


-- ============================================
-- FOLLOW-UP SEQUENCES
-- Admin can do everything. Comfort pro and CSR can read only.
-- ============================================

CREATE POLICY "follow_up_sequences_select"
  ON follow_up_sequences FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "follow_up_sequences_insert"
  ON follow_up_sequences FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "follow_up_sequences_update"
  ON follow_up_sequences FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "follow_up_sequences_delete"
  ON follow_up_sequences FOR DELETE
  USING (get_user_role() = 'admin');


-- ============================================
-- FOLLOW-UP EVENTS
-- Visible if user can see the parent estimate.
-- Comfort pro can update own (mark calls complete, edit messages).
-- Only admin can delete.
-- ============================================

CREATE POLICY "follow_up_events_select"
  ON follow_up_events FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = follow_up_events.estimate_id
        AND estimates.assigned_to = auth.uid()
    )
  );

CREATE POLICY "follow_up_events_insert"
  ON follow_up_events FOR INSERT
  WITH CHECK (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = follow_up_events.estimate_id
        AND estimates.assigned_to = auth.uid()
    )
  );

CREATE POLICY "follow_up_events_update"
  ON follow_up_events FOR UPDATE
  USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = follow_up_events.estimate_id
        AND estimates.assigned_to = auth.uid()
    )
  );

CREATE POLICY "follow_up_events_delete"
  ON follow_up_events FOR DELETE
  USING (get_user_role() = 'admin');


-- ============================================
-- NOTIFICATIONS
-- Users see only their own notifications.
-- Users can update their own (mark as read).
-- Server-side (service role) handles creation.
-- ============================================

CREATE POLICY "notifications_select"
  ON notifications FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR user_id = auth.uid()
  );

CREATE POLICY "notifications_update"
  ON notifications FOR UPDATE
  USING (
    user_id = auth.uid()
    OR get_user_role() = 'admin'
  );

CREATE POLICY "notifications_insert"
  ON notifications FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "notifications_delete"
  ON notifications FOR DELETE
  USING (get_user_role() = 'admin');


-- ============================================
-- MESSAGES
-- Admin sees all. Comfort pro sees messages for their estimates.
-- Writes happen server-side (service role) via API routes.
-- ============================================

CREATE POLICY "messages_select"
  ON messages FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = messages.estimate_id
        AND estimates.assigned_to = auth.uid()
    )
  );

CREATE POLICY "messages_insert"
  ON messages FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "messages_update"
  ON messages FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "messages_delete"
  ON messages FOR DELETE
  USING (get_user_role() = 'admin');


-- ============================================
-- CAMPAIGNS (Phase 2 — admin only)
-- ============================================

CREATE POLICY "campaigns_select"
  ON campaigns FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "campaigns_insert"
  ON campaigns FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "campaigns_update"
  ON campaigns FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "campaigns_delete"
  ON campaigns FOR DELETE
  USING (get_user_role() = 'admin');


-- ============================================
-- CAMPAIGN EVENTS (Phase 2 — admin only)
-- ============================================

CREATE POLICY "campaign_events_select"
  ON campaign_events FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "campaign_events_insert"
  ON campaign_events FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "campaign_events_update"
  ON campaign_events FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "campaign_events_delete"
  ON campaign_events FOR DELETE
  USING (get_user_role() = 'admin');


-- ============================================
-- SETTINGS
-- Admin can do everything. Comfort pro can read.
-- CSR has no access.
-- ============================================

CREATE POLICY "settings_select"
  ON settings FOR SELECT
  USING (
    get_user_role() IN ('admin', 'comfort_pro')
  );

CREATE POLICY "settings_insert"
  ON settings FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "settings_update"
  ON settings FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "settings_delete"
  ON settings FOR DELETE
  USING (get_user_role() = 'admin');
