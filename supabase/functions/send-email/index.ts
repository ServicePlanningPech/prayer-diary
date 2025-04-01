// Supabase Edge Function for sending emails via Google SMTP

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Parse request body
    const { to, subject, html, text, userId, type, contentId } = await req.json();
    
    // Validate the request
    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (to, subject, and either html or text)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get environment variables
    const GMAIL_USER = Deno.env.get('GMAIL_USER');
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error('Gmail credentials are not configured');
    }
    
    // Create SMTP client 
    const client = new SmtpClient();
    
    // Connect to Google's SMTP server
    await client.connectTLS({
      hostname: 'smtp.gmail.com',
      port: 465,
      username: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
    });
    
    // Create a nice from name
    const fromName = "Prayer Diary";
    
    // Send email
    await client.send({
      from: `${fromName} <${GMAIL_USER}>`,
      to: to,
      subject: subject,
      content: text || '',
      html: html || '',
    });
    
    // Close connection
    await client.close();
    
    // Log to notification_logs table if userId is provided
    if (userId && SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          notification_type: 'email',
          content_type: type || 'general',
          content_id: contentId || null,
          status: 'sent'
        });
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error sending email:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred while sending the email' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
