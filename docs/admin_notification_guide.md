# Admin Email Notification Setup Guide

This guide explains how to implement email notifications to admins when new users register with the Prayer Diary app.

## Overview

When a new user registers for the app, admin users should receive an email notification about the pending registration. This document outlines two approaches to implement this feature.

## Method 1: Backend Server Integration (Recommended)

For production use, we recommend implementing admin notifications through a backend server:

1. **Set up a server endpoint** that receives registration notifications
2. **Create a server-side script** that:
   - Queries the Supabase database for all users with the 'Administrator' role
   - Sends emails to these users using a service like Nodemailer, SendGrid, or AWS SES
   - Logs notification attempts in the Supabase database

**Example Server Implementation (Node.js with Express):**

```javascript
// Example server endpoint for handling admin notifications
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());

app.post('/api/notify-admins', async (req, res) => {
  try {
    const { newUserName, newUserEmail } = req.body;
    
    // Initialize Supabase with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Get all admin users
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('user_role', 'Administrator')
      .eq('approval_state', 'Approved');
      
    if (error) throw error;
    
    // Get email addresses for each admin
    const adminEmails = [];
    for (const admin of admins) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(admin.id);
      
      if (userError || !userData?.user?.email) continue;
      
      adminEmails.push({
        id: admin.id,
        name: admin.full_name,
        email: userData.user.email
      });
    }
    
    // Configure email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
    
    // Send email to each admin
    const results = [];
    for (const admin of adminEmails) {
      try {
        await transporter.sendMail({
          from: '"Prayer Diary" <your-email@gmail.com>',
          to: admin.email,
          subject: `Prayer Diary: New User Registration - ${newUserName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #483D8B;">New User Registration</h2>
              <p>A new user has registered for Prayer Diary and is awaiting your approval:</p>
              
              <div style="background-color: #f5f5f5; border-left: 4px solid #483D8B; padding: 15px; margin: 15px 0;">
                <p><strong>Name:</strong> ${newUserName}</p>
                <p><strong>Email:</strong> ${newUserEmail}</p>
                <p><strong>Status:</strong> Pending Approval</p>
              </div>
              
              <p>Please log in to the admin panel to review and approve this user.</p>
              
              <div style="margin: 25px 0;">
                <a href="https://your-app-url.com" 
                   style="background-color: #483D8B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                  Go to Admin Panel
                </a>
              </div>
            </div>
          `
        });
        
        // Log successful notification
        await supabase
          .from('notification_logs')
          .insert({
            user_id: admin.id,
            notification_type: 'email',
            content_type: 'new_user',
            content_id: newUserEmail,
            status: 'sent'
          });
          
        results.push({ admin: admin.email, success: true });
      } catch (error) {
        console.error(`Failed to notify admin ${admin.email}:`, error);
        results.push({ admin: admin.email, success: false, error: error.message });
      }
    }
    
    res.json({ success: true, results });
    
  } catch (error) {
    console.error('Error in notify-admins endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Method 2: Supabase Edge Functions (Advanced)

Supabase Edge Functions can be used to implement admin notifications directly within Supabase:

1. Create a new Edge Function called `notify-admins`
2. Use the Supabase Service Role key to access admin emails
3. Send emails directly from the Edge Function

This method requires more advanced setup and troubleshooting. See our `email_setup_guide.md` for detailed instructions.

## Method 3: Manual Admin Checks (Simple)

For smaller groups or lower-traffic apps, a simpler approach is practical:

1. Admins regularly check the Admin section of the app
2. Review the "Pending Approval" tab for new users
3. Approve or reject users manually

This doesn't require any additional setup but relies on admins regularly checking the system.

## Current Implementation

The current implementation in the app simply logs new user registrations to the console:

```javascript
console.log(`New user registered: ${fullName} (${email}). Would notify admins in production.`);
```

To implement full admin notifications:

1. Choose one of the methods above
2. Modify the `handleAuth` function in `auth.js` to call your notification endpoint
3. Test the implementation thoroughly
4. Monitor for any errors in the notification process

## Considerations

- Email delivery is never guaranteed
- Always implement backup methods for admins to discover pending users
- Consider adding a dashboard notification within the app
- For data protection compliance, ensure users consent to their data being processed

For any questions or assistance with implementation, please reach out to the app developer.