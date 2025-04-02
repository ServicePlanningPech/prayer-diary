# Gmail SMTP Setup Guide

This guide provides detailed steps to configure Gmail SMTP for use with the Prayer Diary app's email function.

## Prerequisites

- A Gmail account
- 2-Step Verification enabled on your Google account

## Step 1: Enable 2-Step Verification

Before you can create an app password, you must enable 2-Step Verification on your Google account:

1. Go to your [Google Account](https://myaccount.google.com/)
2. Select **Security** from the left menu
3. Under "Signing in to Google," select **2-Step Verification**
4. Follow the steps to turn on 2-Step Verification

## Step 2: Create an App Password

Once 2-Step Verification is enabled, you can create an app password:

1. Go to your [Google Account](https://myaccount.google.com/)
2. Select **Security** from the left menu
3. Under "Signing in to Google," select **App passwords**
   - *Note: If you don't see this option, check that 2-Step Verification is enabled*
4. At the bottom, select **Select app** and choose **Other (Custom name)**
5. Enter "Prayer Diary" and click **Generate**
6. The app password is the 16-character code shown in the yellow bar
7. Copy this password as you'll need it for the next step (it won't be shown again)

## Step 3: Configure the Supabase Edge Function

Now set the SMTP credentials in your Supabase project:

```bash
supabase secrets set SMTP_HOSTNAME=smtp.gmail.com
supabase secrets set SMTP_PORT=465
supabase secrets set SMTP_USERNAME=your-gmail-address@gmail.com
supabase secrets set SMTP_PASSWORD=your-16-character-app-password
supabase secrets set DEFAULT_FROM="Prayer Diary <your-gmail-address@gmail.com>"
```

Replace:
- `your-gmail-address@gmail.com` with your actual Gmail address
- `your-16-character-app-password` with the app password generated in Step 2

## Step 4: Redeploy the Edge Function

After setting the secrets, redeploy the function:

```bash
supabase functions deploy send-email
```

## Troubleshooting Common Gmail SMTP Issues

### "Invalid credentials" error

If you see "Invalid credentials" or "Authentication failed" errors:
- Double-check that you're using the app password, not your regular Google account password
- Ensure you've copied the 16-character app password correctly without any spaces
- Verify that 2-Step Verification is still enabled on your account

### "Invalid sender" error

If you see "Message rejected: Email address is not verified" or similar:
- Make sure the "from" address matches your Gmail address
- Check if you need to set a default sender in the Edge Function
- Verify that your Gmail account is properly configured and not restricted

### "Connection refused" error

If you're seeing connection errors:
- Verify that port 465 (SSL) is not blocked by any firewall
- Try using port 587 (TLS) instead by changing the SMTP_PORT value
- Check if Google is blocking the connection due to security settings

### Less secure app access

Note that "Less secure app access" is no longer available from Google. You must use app passwords instead.

## Verifying SMTP Settings

To verify your SMTP settings are correct, you can use the test email function in the admin panel. If it works, your SMTP settings are correctly configured.

## Gmail Sending Limits

Be aware that Gmail has sending limits:
- Free Gmail accounts: 500 emails per day
- Google Workspace accounts: varies by plan (typically 2,000+ per day)

For larger volume requirements, consider using a dedicated email service like SendGrid, Mailgun, or Amazon SES.
