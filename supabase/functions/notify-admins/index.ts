// Supabase Edge Function for notifying administrators about new users
// This function handles the entire process of fetching admin emails and sending notifications

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Parse request body
    const { newUserName, newUserEmail, subject, notificationType } = await req.json();
    
    // Validate the request
    if (!newUserName || !newUserEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (newUserName, newUserEmail)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get environment variables
    const GMAIL_USER = Deno.env.get('GMAIL_USER');
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error('Gmail credentials are not configured');
    }
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials are not configured');
    }
    
    // Create Supabase client with service role key (has higher privileges)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Fetch all administrators from the profiles table
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('user_role', 'Administrator')
      .eq('approval_state', 'Approved');
      
    if (adminsError) {
      throw new Error(`Error fetching admins: ${adminsError.message}`);
    }
    
    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No admins found to notify' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Found ${admins.length} admin(s) to notify`);
    
    // Fetch the email addresses for each admin (we have service role access)
    const results = [];
    const client = new SmtpClient();
    
    // Connect to Google's SMTP server
    await client.connectTLS({
      hostname: 'smtp.gmail.com',
      port: 465,
      username: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
    });
    
    // Create HTML email content
    const htmlContent = `
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
          <a href="https://serviceplanningpech.github.io/prayer-diary" 
             style="background-color: #483D8B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Go to Admin Panel
          </a>
        </div>
        
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          This is an automated notification from Prayer Diary. Please do not reply to this email.
        </p>
      </div>
    `;
    
    // Plain text version
    const textContent = `
New User Registration

A new user has registered for Prayer Diary and is awaiting your approval:

Name: ${newUserName}
Email: ${newUserEmail}
Status: Pending Approval

Please log in to the admin panel to review and approve this user.

This is an automated notification from Prayer Diary. Please do not reply to this email.
    `;
    
    // Create a nice from name
    const fromName = "Prayer Diary";
    
    // For each admin, get their email and send notification
    for (const admin of admins) {
      try {
        // Get the admin's email from the auth.users table using admin ID
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(admin.id);
        
        if (userError) {
          results.push({ 
            adminId: admin.id, 
            adminName: admin.full_name, 
            success: false, 
            error: `Failed to fetch user data: ${userError.message}` 
          });
          continue;
        }
        
        const adminEmail = userData?.user?.email;
        
        if (!adminEmail) {
          results.push({ 
            adminId: admin.id, 
            adminName: admin.full_name, 
            success: false, 
            error: 'No email address found for admin' 
          });
          continue;
        }
        
        // Send the email notification
        await client.send({
          from: `${fromName} <${GMAIL_USER}>`,
          to: adminEmail,
          subject: subject || `Prayer Diary: New User Registration - ${newUserName}`,
          content: textContent,
          html: htmlContent,
        });
        
        // Log the notification
        await supabase
          .from('notification_logs')
          .insert({
            user_id: admin.id,
            notification_type: 'email',
            content_type: notificationType || 'new_user',
            content_id: newUserEmail,
            status: 'sent'
          });
        
        results.push({ 
          adminId: admin.id, 
          adminName: admin.full_name, 
          adminEmail: adminEmail, 
          success: true 
        });
        
        // Add a small delay between sending emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        results.push({ 
          adminId: admin.id, 
          adminName: admin.full_name, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    // Close SMTP connection
    await client.close();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notified ${results.filter(r => r.success).length} out of ${admins.length} admins`,
        results 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in notify-admins function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred while notifying admins' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
