-- ============================================
-- Genesis HVAC Pipeline — User Invites Table
-- Version 2.2
-- Run this in the Supabase SQL Editor
-- ============================================

-- Pre-register team members so they auto-provision on first Google sign-in
CREATE TABLE user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('admin', 'comfort_pro', 'csr')),
  invited_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for email lookup during auth callback
CREATE INDEX idx_user_invites_email ON user_invites(email);

-- RLS: only admins can manage invites
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_invites_select"
  ON user_invites FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "user_invites_insert"
  ON user_invites FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "user_invites_delete"
  ON user_invites FOR DELETE
  USING (get_user_role() = 'admin');
