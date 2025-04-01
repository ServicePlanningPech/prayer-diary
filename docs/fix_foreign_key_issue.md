# Fixing the Foreign Key Relationship in Prayer Diary Database

This guide explains how to fix the foreign key relationship issue between the `profiles` and `auth.users` tables in your Supabase database.

## The Problem

When trying to notify administrators about new user registrations, you encounter this error:

```
Object
code: "PGRST200"
details: "Searched for a foreign key relationship between 'profiles' and 'id' in the schema 'public', but no matches were found."
message: "Could not find a relationship between 'profiles' and 'id' in the schema cache"
```

This occurs because there is no properly defined foreign key relationship between the `profiles` table and the `auth.users` table where email addresses are stored.

## Solution: Creating the Required Database Table

1. **Create a Notification Queue Table**:

Instead of directly trying to join the profiles and auth tables from the client side (which is causing the error), we'll create a notification queue table to store pending notifications:

```sql
-- Run this in the Supabase SQL Editor
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

-- Add RLS policies to allow access
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert notifications
CREATE POLICY "Users can insert notifications" 
  ON notification_queue FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow admins to view and update notifications
CREATE POLICY "Admins can view and update notifications" 
  ON notification_queue FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'Administrator'
    )
  );
```

2. **Fix the Foreign Key Relationship (Optional, requires SQL admin privileges)**:

If you have admin privileges on your database, you can also fix the underlying relationship problem by running:

```sql
-- Add the correct foreign key constraint explicitly if it doesn't exist already
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    -- The constraint doesn't exist, so add it
    EXECUTE 'ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;';
  END IF;
END $$;

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Refresh the schema cache to ensure relationships are recognized
NOTIFY pgrst, 'reload schema';
```

## Modified Admin Notification Approach

The solution I've implemented takes a more robust approach:

1. Instead of trying to query the `auth.users` table directly from the client side (which causes the error), I've created a new system that:
   - Gets the list of admins from the `profiles` table (which works fine)
   - Creates a notification entry in the `notification_queue` table for each admin

2. This queue-based approach has several advantages:
   - Avoids the foreign key relationship error
   - Creates a reliable notification system that can be processed asynchronously
   - Allows retries if email sending fails
   - Provides a record of all notification attempts

## How to Implement This Solution

1. **Run the SQL command to create the notification_queue table** in your Supabase SQL Editor

2. **The updated code is already in place** in the `auth.js` file

3. **Create a background processor** to handle the notification queue:
   - This could be a Supabase Edge Function that runs on a schedule
   - Or a separate server that polls the queue periodically
   - For each pending notification:
     - Fetch the admin's email from auth.users table
     - Send the email
     - Update the notification status to 'processed'

4. For immediate testing, you can also add a simplified version of the email sending code directly in the client:

```javascript
// In your notifications.js file
async function processNotificationQueue() {
  if (!isAdmin()) return;
  
  try {
    // Get pending notifications
    const { data: notifications, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    for (const notification of notifications) {
      try {
        // Process notification based on type
        if (notification.notification_type === 'new_user_registration') {
          const content = JSON.parse(notification.content);
          
          // Create email content
          const subject = `Prayer Diary: New User Registration - ${content.userName}`;
          const htmlContent = `...email content...`;
          
          // Send email (if you have email functionality)
          // await sendEmail(adminEmail, subject, htmlContent);
          
          // Mark as processed
          await supabase
            .from('notification_queue')
            .update({
              status: 'processed',
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id);
        }
      } catch (err) {
        console.error(`Error processing notification ${notification.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error processing notification queue:', error);
  }
}
```

## Advantages of This Approach

1. **Reliability**: Even if sending an email fails, the notification is still in the queue and can be retried
2. **Debugging**: You can see all pending notifications in the database
3. **Scalability**: Can handle many notifications without blocking the user interface
4. **No Foreign Key Error**: Completely avoids the problematic query that was causing the error

This pattern is widely used in production systems for handling notifications and background tasks.
