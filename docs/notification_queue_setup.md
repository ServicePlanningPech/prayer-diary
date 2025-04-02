# Setting Up the Notification Queue in Supabase

This guide provides instructions for setting up the notification queue table in your Supabase database.

## Step 1: Access the SQL Editor

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your Prayer Diary project
3. Go to the SQL Editor section in the left sidebar

## Step 2: Create the Notification Queue Table

Copy and paste the following SQL into the SQL Editor, then run it:

```sql
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
DROP POLICY IF EXISTS "Anyone can insert notifications" ON notification_queue;
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
```

## Step 3: Verify the Table Was Created

1. Go to the Table Editor section in the left sidebar
2. Look for the `notification_queue` table in the list of tables
3. If you don't see it, refresh the page

## Step 4: Test Inserting a Notification

You can test the RLS policies by inserting a notification manually:

```sql
INSERT INTO notification_queue (admin_id, notification_type, content)
VALUES 
('YOUR_ADMIN_ID', 'test_notification', '{"message": "This is a test notification"}');
```

Replace `YOUR_ADMIN_ID` with the UUID of an admin user in your system.

## Troubleshooting

### Error: "new row violates row-level security policy"

If you see this error when inserting from your app, it means:
1. You haven't run the SQL script yet, or
2. The RLS policies aren't set up correctly, or
3. You're not authenticated when trying to insert

Solutions:
- Make sure you've run the SQL script exactly as shown above
- Check that you're logged in when testing the app
- Verify the RLS policies in the Auth > Policies section of your Supabase dashboard

### Error: "relation 'notification_queue' does not exist"

If you see this error, it means the table hasn't been created yet. Run the SQL script from Step 2.

### Error: "null value in column admin_id violates not-null constraint"

This means you're trying to insert a notification without specifying an admin ID. Make sure you're providing an admin_id value.

## Next Steps

After setting up the notification queue, the app will automatically queue notifications when new users register. To process these notifications:

1. Log in as an admin user
2. You'll see a "Process Notification Queue" button in the admin section
3. Clicking this button will process all pending notifications
