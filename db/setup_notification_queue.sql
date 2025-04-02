-- Setup Notification Queue Table with proper RLS policies

-- Create the notification queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_id UUID REFERENCES profiles(id) NOT NULL,
  notification_type TEXT NOT NULL,
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT
);

-- Make sure RLS is enabled
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert notifications" ON notification_queue;
DROP POLICY IF EXISTS "Admins can view notifications" ON notification_queue;
DROP POLICY IF EXISTS "Admins can update notifications" ON notification_queue;

-- Create a policy that allows ALL authenticated users to insert into the notification queue
CREATE POLICY "Anyone can insert notifications" 
  ON notification_queue FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create a policy that allows only admins to view notification entries
CREATE POLICY "Admins can view notifications" 
  ON notification_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'Administrator'
    )
  );

-- Create a policy that allows only admins to update notification entries
CREATE POLICY "Admins can update notifications" 
  ON notification_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'Administrator'
    )
  );
