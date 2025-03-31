# Prayer Diary - Setup Guide

This document provides step-by-step instructions for setting up the Prayer Diary Progressive Web App (PWA) with Supabase backend.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [App Configuration](#app-configuration)
4. [Storage Setup](#storage-setup)
5. [Email Notifications Setup](#email-notifications-setup)
6. [Twilio Setup for SMS and WhatsApp](#twilio-setup-for-sms-and-whatsapp)
7. [Push Notifications Setup](#push-notifications-setup)
8. [Deploying to GitHub Pages](#deploying-to-github-pages)
9. [Installing the PWA on Devices](#installing-the-pwa-on-devices)

## Prerequisites

Before you begin, make sure you have the following:
- A GitHub account (for hosting the app)
- A Supabase account (for backend services)
- A Twilio account (for SMS and WhatsApp notifications, optional)
- An email service account like SendGrid, Mailgun, or AWS SES (for email notifications, optional)
- Basic knowledge of HTML, CSS, and JavaScript
- Git installed on your computer

## Supabase Setup

1. **Create a Supabase Account**:
   - Go to [Supabase](https://supabase.com/) and sign up for an account if you don't already have one.
   - Create a new project from the Supabase dashboard.
   - Note down your project URL and anon/public key which will be needed later.

2. **Set Up Database Schema**:
   - From your Supabase project dashboard, go to the "SQL Editor" section.
   - Create a new query and paste the contents of the `db/schema.sql` file.
   - Run the SQL script to create all necessary tables, policies, and functions.

3. **Create Storage Buckets**:
   - Go to the "Storage" section in your Supabase project.
   - Create a new bucket named `prayer-diary`.
   - Inside that bucket, create the following folders:
     - `profiles` (for user profile images)
     - `calendar` (for prayer calendar images)
   - Set up public access for these buckets in the "Policies" tab:
     - Click "Add Policies"
     - Select "Create policies from templates"
     - Select "Give anonymous users access to all objects" 
     - Apply this to the `prayer-diary` bucket

4. **Enable Email Authentication**:
   - In your Supabase project, go to "Authentication" -> "Providers"
   - Make sure "Email" is enabled
   - Configure your email templates for confirmation, invite, and reset password emails

5. **Create Super Admin Account**:
   - The app is designed to create a super admin account with email `prayerdiary@pech.co.uk` and password `@Prayer@Diary@` upon first initialization.
   - Alternatively, you can manually create this account through the Supabase dashboard:
     - Go to "Authentication" -> "Users"
     - Click "Add User"
     - Enter the email and password
     - After creating the user, find their UUID in the users list
     - Go to the SQL Editor and run:
       ```sql
       INSERT INTO profiles (id, full_name, user_role, approval_state, prayer_calendar_editor, prayer_update_editor, urgent_prayer_editor)
       VALUES ('[USER_UUID]', 'Super Admin', 'Administrator', 'Approved', TRUE, TRUE, TRUE);
       ```
     - Replace `[USER_UUID]` with the actual UUID of the created user

## App Configuration

1. **Update Config File**:
   - Open the `js/config.js` file.
   - Replace the placeholder values with your actual Supabase project URL and anon key:
     ```javascript
     const SUPABASE_URL = 'https://your-project-id.supabase.co';
     const SUPABASE_ANON_KEY = 'your-anon-key';
     ```

2. **Configure Email Notifications**:
   - If you have a server-side component or serverless function for sending emails:
     ```javascript
     const EMAIL_ENABLED = true;
     ```
   - Otherwise, leave it as `false` until you implement email functionality.

3. **Configure Twilio for SMS and WhatsApp**:
   - If you have set up Twilio integration:
     ```javascript
     const TWILIO_ENABLED = true;
     ```
   - Otherwise, leave it as `false` until you implement Twilio integration.

4. **Configure Push Notifications**:
   - If you have set up push notifications with VAPID keys:
     ```javascript
     const PUSH_NOTIFICATION_ENABLED = true;
     ```
   - Otherwise, leave it as `false` until you implement push notifications.

## Storage Setup

The app uses Supabase Storage for storing profile pictures and prayer calendar images. The storage buckets should already be set up from the Supabase setup steps.

To test if storage is working:
1. Log in to the app with your admin account
2. Go to your profile and try to upload a profile image
3. If the image uploads and displays correctly, storage is working properly

## Email Notifications Setup

To enable email notifications, you'll need to create a server-side function or use a service that can send emails. Here are the steps to set up email functionality:

1. **Choose an Email Service Provider**:
   - Popular options include SendGrid, Mailgun, AWS SES, or your own SMTP server.

2. **Create Email Templates**:
   - Welcome email for newly approved users
   - Weekly prayer update notification
   - Urgent prayer request notification

3. **Implement Email Sending Function**:
   - You can implement this as a serverless function (e.g., using Supabase Edge Functions, AWS Lambda, or Vercel Serverless Functions).
   - Update the `sendEmail` function in `js/notifications.js` to call your email service.

4. **Enable Email Notifications**:
   - Set `EMAIL_ENABLED = true;` in `js/config.js` once your email service is ready.

Here's a basic implementation example using Supabase Edge Functions with SendGrid:

```javascript
// Example Supabase Edge Function (sendEmail.js)
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize SendGrid
sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY'));

export async function handler(req) {
  try {
    const { to, subject, body, userId, type } = await req.json();
    
    // Send email
    const msg = {
      to,
      from: 'prayerdiary@yourchurch.org', // Replace with your sender email
      subject,
      html: body,
    };
    
    await sgMail.send(msg);
    
    // Log notification
    if (userId) {
      await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          notification_type: 'email',
          content_type: type,
          status: 'sent'
        });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}
```

## Twilio Setup for SMS and WhatsApp

To enable SMS and WhatsApp notifications using Twilio:

1. **Create a Twilio Account**:
   - Go to [Twilio](https://www.twilio.com/) and sign up for an account.
   - Purchase a phone number that supports SMS.
   - For WhatsApp, set up the Twilio WhatsApp Business API.

2. **Create a Serverless Function for Sending Messages**:
   - Similar to email notifications, create a serverless function to send SMS and WhatsApp messages.
   - Update the `sendSms` and `sendWhatsApp` functions in `js/notifications.js` to call your serverless function.

3. **Enable Twilio Notifications**:
   - Set `TWILIO_ENABLED = true;` in `js/config.js` once your Twilio integration is ready.

Here's an example implementation using Supabase Edge Functions with Twilio:

```javascript
// Example Supabase Edge Function (sendSms.js)
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Twilio
const twilioClient = twilio(
  Deno.env.get('TWILIO_ACCOUNT_SID'),
  Deno.env.get('TWILIO_AUTH_TOKEN')
);
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

export async function handler(req) {
  try {
    const { to, message, userId, type, isWhatsApp } = await req.json();
    
    if (isWhatsApp) {
      // Send WhatsApp message
      await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${twilioPhoneNumber}`,
        to: `whatsapp:${to}`
      });
    } else {
      // Send SMS
      await twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to
      });
    }
    
    // Log notification
    if (userId) {
      await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          notification_type: isWhatsApp ? 'whatsapp' : 'sms',
          content_type: type,
          status: 'sent'
        });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}
```

## Push Notifications Setup

To set up push notifications:

1. **Generate VAPID Keys**:
   - You can use a tool like [web-push](https://www.npmjs.com/package/web-push) to generate VAPID keys.
   - Run: `npx web-push generate-vapid-keys`
   - Save the public and private keys.

2. **Update the Service Worker**:
   - In `service-worker.js`, make sure the push notification event listeners are properly configured.

3. **Implement Subscription Management**:
   - Create a system to store push notification subscriptions.
   - Update the `requestPushNotificationPermission` function in `js/notifications.js` with your VAPID public key.

4. **Create a Serverless Function for Sending Push Notifications**:
   - Create a function that can send push notifications to registered subscribers.

5. **Enable Push Notifications**:
   - Set `PUSH_NOTIFICATION_ENABLED = true;` in `js/config.js` once your push notification setup is ready.

## Deploying to GitHub Pages

To deploy the app to GitHub Pages:

1. **Create a GitHub Repository**:
   - Go to [GitHub](https://github.com/) and create a new repository.
   - Clone the repository to your local machine.

2. **Copy the App Files**:
   - Copy all files from the Prayer Diary app to your repository folder.

3. **Create App Icons**:
   - Create app icons of all sizes specified in the manifest.json file.
   - Place them in the `img/icons` directory.

4. **Make a First Commit**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

5. **Enable GitHub Pages**:
   - Go to your repository settings.
   - Scroll down to the "GitHub Pages" section.
   - Select "main" branch as the source.
   - Click "Save".

6. **Access Your App**:
   - Once GitHub Pages is enabled, your app will be available at `https://yourusername.github.io/repository-name/`

## Installing the PWA on Devices

The Prayer Diary app is designed as a Progressive Web App (PWA) which means it can be installed on various devices. Here's how to install it on different platforms:

### Android
1. Open the app in Chrome.
2. Tap the menu button (three dots).
3. Select "Add to Home screen".
4. Follow the prompts to install the app.

### iOS (iPhone/iPad)
1. Open the app in Safari.
2. Tap the share button.
3. Scroll down and select "Add to Home Screen".
4. Tap "Add" to confirm.

### Windows (Chrome/Edge)
1. Open the app in Chrome or Edge.
2. Click the install icon in the address bar (usually a plus sign or computer icon).
3. Click "Install" in the prompt.

### macOS (Chrome)
1. Open the app in Chrome.
2. Click the menu button (three dots).
3. Select "Install Prayer Diary...".
4. Click "Install" in the prompt.

## Conclusion

You've now set up the Prayer Diary app with Supabase backend. The app provides a digital prayer calendar, weekly prayer updates, and urgent prayer requests for your church community.

For any questions or issues, please contact the developer or refer to the documentation in the `docs` folder.

Happy praying!
