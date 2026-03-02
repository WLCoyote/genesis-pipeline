-- Notification preferences: per-user email notification toggles
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  email_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can read own notification prefs"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own notification prefs"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification prefs"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all (for admin endpoints)
CREATE POLICY "Service role manages notification prefs"
  ON notification_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- Add marketing email to settings table (global notification config)
INSERT INTO settings (key, value)
VALUES ('notification_marketing_email', '"marketing@genesishvacr.com"')
ON CONFLICT (key) DO NOTHING;
