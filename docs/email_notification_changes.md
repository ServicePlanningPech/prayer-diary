# Email Notification System Changes

This document outlines the changes made to the Prayer Diary app's email notification system.

## Summary of Changes

We have simplified the email notification system by:

1. Removing the queue-based notification system that used the `notification_queue` table
2. Implementing a direct email sending mechanism using a Supabase Edge Function with Google SMTP
3. Creating a versatile `sendEmail()` function that can be reused throughout the application

## Implementation Details

### 1. Updated sendEmail Function

The `sendEmail()` function in `js/notifications.js` has been updated to:
- Accept a single options object instead of multiple parameters
- Support more email features (CC, BCC, Reply-To, etc.)
- Handle logging and error tracking consistently
- Invoke the Supabase Edge Function directly

### 2. New User Registration Notifications

The `notifyAdminsAboutNewUser()` function in `js/auth.js` has been updated to:
- Fetch admin emails directly from profiles
- Send emails directly to each admin instead of queuing notifications
- Use the new sendEmail function with proper parameters
- Provide better error handling and logging

### 3. Supabase Edge Function

A new Edge Function `send-email` has been created that:
- Uses Google SMTP to send emails
- Handles various email parameters
- Includes proper error handling and CORS support
- Can be easily configured with environment variables

### 4. Database Changes

The `notification_queue` table is no longer needed and has been dropped:
- SQL migration script added to remove the table
- The `notification_logs` table is still maintained for audit purposes

## How to Use the New Email Function

You can now send emails from anywhere in the application using:

```javascript
await sendEmail({
    to: 'recipient@example.com',
    subject: 'Email Subject',
    html: '<p>HTML email content</p>',
    // Optional parameters
    cc: 'cc@example.com',
    bcc: 'bcc@example.com',
    replyTo: 'reply@example.com',
    userId: 'user-uuid',           // For logging purposes
    contentType: 'email_type'      // For logging purposes
});
```

## Deployment Steps

1. Run the `db/drop_notification_queue.sql` script in your Supabase SQL editor
2. Deploy the Edge Function following the instructions in the README
3. Set the required environment variables for the Edge Function
4. Update your codebase with the modified JavaScript files

## Benefits of This Approach

- Simpler architecture with fewer moving parts
- Direct feedback on email sending success/failure
- No need for background processing of the queue
- More flexibility in email formatting and options
- Better error handling and visibility
