# Email Notification Setup Guide for Prayer Diary

This guide explains how to set up email notifications in the Prayer Diary app, specifically for admin notifications when a new user registers.

## Overview

The Prayer Diary app now includes functionality to send email notifications to admin users when a new user registers. These emails contain information about the new user and provide a link for admins to review and approve or reject the registration.

## Prerequisites

Before you begin, you'll need:

1. A Google account with Gmail
2. Supabase CLI installed on your computer
3. Access to your Supabase project
4. 2-Step Verification enabled on your Google account (for creating App Password)

## Step 1: Create a Google App Password

Since Google doesn't allow regular passwords for SMTP access, you'll need to create an App Password:

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to "Security" and ensure 2-Step Verification is enabled
3. Under "Security," find and click on "App passwords"
4. Select "Other (Custom name)" from the dropdown and enter "Prayer Diary"
5. Click "Generate" and note down the 16-character password that appears
   - **Important**: Save this password securely as it will only be shown once!

## Step 2: Deploy the Edge Functions

1. Open a command prompt/terminal
2. Navigate to your Prayer Diary project directory:
   ```bash
   cd D:\prayer-diary
   ```

3. Initialize Supabase (if not already done):
   ```bash
   supabase init
   ```

4. Deploy the Edge Functions (we need both):
   ```bash
   supabase functions deploy send-email --project-ref your-project-ref
   supabase functions deploy notify-admins --project-ref your-project-ref
   ```
   (Replace `your-project-ref` with your actual Supabase project reference)

## Step 3: Set Environment Variables

Set up the necessary environment variables for the Edge Functions:

```bash
# Gmail credentials for sending emails
supabase secrets set GMAIL_USER=your-gmail@gmail.com --project-ref your-project-ref
supabase secrets set GMAIL_APP_PASSWORD=your-app-password --project-ref your-project-ref

# Supabase connection details
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co --project-ref your-project-ref
supabase secrets set SUPABASE_ANON_KEY=your-anon-key --project-ref your-project-ref

# Service role key for admin functions (needed to fetch emails from auth.users)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key --project-ref your-project-ref
```

The Service Role Key can be found in your Supabase dashboard under Project Settings > API > Project API keys.
⚠️ **WARNING**: The service role key has admin privileges, so keep it secure!

Replace the values with your actual information:
- `your-gmail@gmail.com`: Your Gmail address
- `your-app-password`: The 16-character App Password you generated
- `your-project-ref`: Your Supabase project reference
- `your-anon-key`: Your Supabase anon/public key

## Step 4: Update Configuration

In the `config.js` file of your Prayer Diary app, set:

```javascript
// Email configuration
const EMAIL_ENABLED = true;
```

## Testing the Setup

To test if your email setup is working:

1. Register a new user account in the Prayer Diary app
2. Check the admin user's email inbox for a notification about the new user
3. The email should contain details about the new user and a link to approve/reject them

## Troubleshooting

If emails are not being sent properly:

1. **Check Edge Function Logs**: View the logs in the Supabase dashboard
   - Go to Functions > send-email > Logs
   - Go to Functions > notify-admins > Logs

2. **Verify Environment Variables**: Make sure all secrets are set correctly
   - You can check this in the Supabase dashboard under each function's Settings
   - The notify-admins function requires the `SUPABASE_SERVICE_ROLE_KEY` variable to be set

3. **Service Role Permission**: Make sure the service role key has the necessary permissions
   - This key is required to access auth.users table to get admin email addresses
   - If you're getting "service role key" errors, verify it in your Supabase dashboard

4. **Gmail Settings**: Make sure your Gmail account doesn't have security settings blocking the app
   - Check if less secure app access might be affecting it (though App Passwords should bypass this)
   - Check your Gmail account for any security alerts about blocked sign-in attempts

5. **CORS Issues**: If you're experiencing CORS problems:
   - Make sure your app's domain is added to the allowed origins in your Supabase project settings
   - For local testing, you might need to add http://localhost:XXXX to allowed origins

6. **Database Structure**: The app expects a specific database structure
   - Admin detection is based on profiles with user_role = 'Administrator'
   - The client doesn't have direct access to the auth.users table (where emails are stored)

7. **Rate Limiting**: Gmail has rate limits for sending emails
   - The Edge Function adds a 500ms delay between sending multiple emails
   - If you have many admins, some emails might fail due to rate limiting

8. **Function Errors**: Common errors and solutions:
   - "column profiles.email does not exist" - Fixed by using the server-side admin notification function
   - "relationship between profiles and auth not found" - Fixed by using service role to separately query auth.users

## Security Considerations

- The App Password has the same access as your Google account password, so keep it secure
- Consider using a dedicated Gmail account for your Prayer Diary app, not your personal account
- For production use, consider using a professional email service like SendGrid or Mailgun

## Email Limits

Be aware that Gmail has the following sending limits:
- 500 emails per day for regular Gmail accounts
- 2,000 emails per day for Google Workspace accounts

For larger churches or organizations, consider upgrading to a professional email service.
