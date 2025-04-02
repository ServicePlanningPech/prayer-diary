// Supabase Edge Function for sending emails using Google SMTP
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'

interface EmailRequest {
  to?: string
  subject?: string
  html?: string
  text?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  from?: string
  testConnection?: boolean
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        },
      })
    }

    // Parse request body
    const requestData = await req.json() as EmailRequest

    // Handle test connection request
    if (requestData.testConnection === true) {
      console.log('Handling test connection request');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'Email function is deployed and reachable',
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        },
      });
    }

    // Validate required fields
    if (!requestData.to || !requestData.subject || !requestData.html) {
      return new Response(
        JSON.stringify({ error: 'Missing required email parameters' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
          },
        }
      )
    }

    // Environment variables with validation
    const SMTP_HOSTNAME = Deno.env.get('SMTP_HOSTNAME') || 'smtp.gmail.com'
    const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465')
    const SMTP_USERNAME = Deno.env.get('SMTP_USERNAME')
    const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD')
    const DEFAULT_FROM = Deno.env.get('DEFAULT_FROM') || 'Prayer Diary <prayerdiary@pech.co.uk>'

    // Validate SMTP credentials are set
    if (!SMTP_USERNAME || !SMTP_PASSWORD) {
      console.error('Missing SMTP credentials');
      return new Response(
        JSON.stringify({
          error: 'Missing SMTP credentials',
          message: 'The SMTP credentials are not properly configured in the Supabase environment.',
          details: {
            SMTP_HOSTNAME: SMTP_HOSTNAME,
            SMTP_PORT: SMTP_PORT,
            SMTP_USERNAME: SMTP_USERNAME ? 'PROVIDED' : 'MISSING',
            SMTP_PASSWORD: SMTP_PASSWORD ? 'PROVIDED' : 'MISSING',
            DEFAULT_FROM: DEFAULT_FROM
          }
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
          },
        }
      );
    }

    console.log(`Attempting to send email to ${requestData.to} using SMTP server ${SMTP_HOSTNAME}:${SMTP_PORT}`);
    
    try {
      // Configure SMTP client
      console.log('Initializing SMTP client');
      const client = new SmtpClient();
      
      console.log('Connecting to SMTP server...');
      await client.connectTLS({
        hostname: SMTP_HOSTNAME,
        port: SMTP_PORT,
        username: SMTP_USERNAME,
        password: SMTP_PASSWORD,
      });
      
      console.log('Connected successfully, sending email...');
      
      // Send the email
      await client.send({
        from: requestData.from || DEFAULT_FROM,
        to: requestData.to,
        subject: requestData.subject,
        content: requestData.html,
        html: requestData.html,
        cc: requestData.cc,
        bcc: requestData.bcc,
        replyTo: requestData.replyTo,
      });
      
      console.log('Email sent successfully');
      
      // Close the connection
      await client.close();
    } catch (smtpError) {
      console.error('SMTP error:', smtpError);
      return new Response(
        JSON.stringify({
          error: 'SMTP connection error',
          message: smtpError.message || 'Failed to connect to SMTP server or send email',
          details: smtpError.toString(),
          config: {
            hostname: SMTP_HOSTNAME,
            port: SMTP_PORT,
            username: SMTP_USERNAME ? 'PROVIDED' : 'MISSING',
          }
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
          },
        }
      );
    }

    // Return success response
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    })
  } catch (error) {
    console.error('Error sending email:', error)

    // Return error response
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send email',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        },
      }
    )
  }
})
