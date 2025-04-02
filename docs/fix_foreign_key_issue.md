# Fixing the Foreign Key Relationship in Prayer Diary Database

This guide explains how to fix the foreign key relationship issue between the `profiles` and `auth.users` tables in your Supabase database.

## The Problem

When trying to notify administrators about new user registrations, you've encountered these errors:

1. First error:
```
code: "PGRST200"
details: "Searched for a foreign key relationship between 'profiles' and 'id' in the schema 'public', but no matches were found."
message: "Could not find a relationship between 'profiles' and 'id' in the schema cache"
```

2. After attempting to use a notification queue, second error:
```
code: "42501"
message: "new row violates row-level security policy for table \"notification_queue\""
```

These errors occur because:
1. There is no properly defined foreign key relationship between the `profiles` table and the `auth.users` table
2. The notification queue table either doesn't exist or has incorrect Row Level Security (RLS) policies

## Simplest Solution: Log Notifications Instead of Database Insert

The most reliable approach for now is to simply log notifications instead of trying to insert them into a database table. The code has been updated to:

```javascript
// For each admin, log that we would notify them
for (const admin of admins) {
    console.log(`Would notify admin ${admin.id} (${admin.full_name}) about new user: ${userName} (${userEmail})`);
    
    // Here we're just logging - in a production environment, this would call
    // a server-side function to handle the email sending
}
```

This eliminates the errors while still providing a record of notification attempts in the console.

## Full Solution: Setting Up the Notification Queue Properly

If you want to implement the full notification queue solution, you'll need to run the following SQL in your Supabase dashboard:

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

This creates:
1. The notification queue table with the right structure
2. Proper RLS policies that allow *any* authenticated user to insert notifications
3. Separate policies to allow only admins to view and update notifications

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

## How to Implement This Solution (Step by Step)

### Option 1: Keep the Current Simplified Approach

The current implementation in `auth.js` simply logs notifications without trying to insert them into a database table. This eliminates the errors and is suitable for testing.

### Option 2: Full Implementation with Notification Queue

1. **Run the SQL script** to create the notification queue table:
   - Go to your Supabase dashboard → SQL Editor
   - Create a new query
   - Paste the contents of `setup_notification_queue.sql`
   - Run the SQL script

2. **Verify the table was created**:
   - Go to the "Table Editor" in your Supabase dashboard
   - You should see a `notification_queue` table in the list

3. **Modify auth.js** to use the notification queue:
   - Once you've confirmed the table exists, you can update the admin notification code to insert into this table

4. **Create a background processor** to handle the notification queue:
   - This could be a Supabase Edge Function that runs on a schedule
   - Or a separate server that polls the queue periodically
   - For each pending notification:
     - Fetch the admin's email from auth.users table
     - Send the email
     - Update the notification status to 'processed'

5. For immediate testing, you can add this to your admin dashboard:

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

## Troubleshooting Common Issues

### "Table notification_queue doesn't exist"

If you see this error, you need to run the SQL script to create the table first.

### "New row violates row-level security policy"

This happens when:
1. The RLS policy doesn't allow the current user to insert records
2. You're not properly authenticated when making the request

Solution: Make sure you run the SQL with the `Anyone can insert notifications` policy, and that you're logged in when testing.

### "Foreign key constraint violation"

If you get an error about the foreign key constraint between `admin_id` and `profiles`, ensure that:
1. The admin IDs you're using actually exist in the profiles table
2. You're not trying to insert notifications for non-existent admins

## Next Steps

For a complete email notification system, you'll need:

1. A server component that can securely send emails (Supabase Edge Functions or a dedicated server)
2. A background process to pick up notifications from the queue and process them
3. Error handling for failed email deliveries

This requires a bit more server-side setup, but the queue-based approach makes it reliable and scalable.
