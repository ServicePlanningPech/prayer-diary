# Email Function Upgrade Guide

This guide explains how to upgrade the email functionality to fix the issues you're experiencing with the test email feature.

## Issues Identified

1. **Edge Function not deployed or not responding**: The test feature is hanging at "Checking email configuration..." with no error messages
2. **Missing timeout handling**: No timeout for requests, causing indefinite waiting
3. **CORS configuration issues**: Cross-Origin Resource Sharing needs to be properly configured
4. **Insufficient error feedback**: No detailed diagnostic information

## Files Included in the Upgrade

1. `js/email-test-improved.js` - Enhanced email testing module with better error handling
2. `supabase/functions/send-email/index-improved.ts` - Improved Edge Function with better CORS support
3. `supabase/functions/send-email/README-improved.md` - Detailed deployment instructions

## Implementation Steps

### 1. Replace the Email Test JavaScript

Replace the existing email test file with the improved version:

```bash
# Rename the improved file to replace the current one
mv D:\prayer-diary\js\email-test-improved.js D:\prayer-diary\js\email-test.js
```

### 2. Update the Edge Function

Replace the Edge Function with the improved version:

```bash
# Rename the improved file to replace the current one
mv D:\prayer-diary\supabase\functions\send-email\index-improved.ts D:\prayer-diary\supabase\functions\send-email\index.ts
```

### 3. Update the Deployment Instructions

Replace the README with the improved version:

```bash
# Rename the improved README to replace the current one
mv D:\prayer-diary\supabase\functions\send-email\README-improved.md D:\prayer-diary\supabase\functions\send-email\README.md
```

## Deploy the Edge Function

Follow these steps to deploy the improved Edge Function:

1. Make sure you have the Supabase CLI installed:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your local project:
   ```bash
   supabase link --project-ref ozwcgtfoyfvwlgjokrix
   ```

4. Deploy the Edge Function:
   ```bash
   supabase functions deploy send-email
   ```

5. Configure CORS for your domain:
   ```bash
   # Add your domain to allowed origins
   supabase functions update-cors send-email --add-origins="https://serviceplanningpech.github.io"
   
   # Allow specific headers including the critical 'apikey' header
   supabase functions update-cors send-email --add-headers="apikey,Authorization,x-client-info,Content-Type"
   ```
   
   **Important**: The `apikey` header must be explicitly allowed for Supabase client requests to work.

6. Allow anonymous access (if your app doesn't require authentication):
   ```bash
   supabase functions update-permissions send-email --no-verify-jwt
   ```

## Configure Google SMTP

Set up the required environment variables for the Edge Function:

```bash
supabase secrets set SMTP_HOSTNAME=smtp.gmail.com
supabase secrets set SMTP_PORT=465
supabase secrets set SMTP_USERNAME=your-email@gmail.com
supabase secrets set SMTP_PASSWORD=your-app-password
supabase secrets set DEFAULT_FROM="Prayer Diary <prayerdiary@pech.co.uk>"
```

**Note**: For Gmail, you need to create an app-specific password:
1. Go to your Google Account → Security
2. Make sure 2-Step Verification is enabled
3. Go to "App passwords" under "Signing in to Google"
4. Select "Other" from the dropdown and name it "Prayer Diary"
5. Use the generated 16-character password as your SMTP_PASSWORD

## Key Improvements in This Upgrade

### Email Test Module Improvements
- Added timeout handling to prevent indefinite hanging
- Added a bypass button that appears after 5 seconds if the check is taking too long
- Improved error reporting with detailed diagnostic information
- Added troubleshooting guidance for deployment issues
- Added console logging for better debugging

### Edge Function Improvements
- Enhanced CORS handling with proper preflight request support
- Added dedicated test endpoints that don't require actual email sending
- Improved error handling and reporting
- Added detailed logging for better diagnostics
- Added environment variable validation

## Testing the Upgrade

1. Navigate to the email testing page in the admin panel
2. The configuration check should either succeed or provide detailed error information
3. If the check takes too long, a bypass button will appear
4. When sending a test email, you'll get more detailed error information if it fails
5. Troubleshooting information is now available directly in the interface

## Troubleshooting

If you still experience issues after implementing these changes:

1. Check the browser console for error messages
2. View the Edge Function logs using: 
   ```bash
   supabase functions logs send-email
   ```
3. Try testing the Edge Function directly using curl (see README for examples)
4. Verify that all environment variables are set correctly

For more detailed instructions, refer to the updated README in the `supabase/functions/send-email` directory.
