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

    // Environment variables
    const SMTP_HOSTNAME = Deno.env.get('SMTP_HOSTNAME') || 'smtp.gmail.com'
    const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465')
    const SMTP_USERNAME = Deno.env.get('SMTP_USERNAME') || 'your-email@gmail.com'
    const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD') || 'your-app-password'
    const DEFAULT_FROM = Deno.env.get('DEFAULT_FROM') || 'Prayer Diary <prayerdiary@pech.co.uk>'

    // Configure SMTP client
    const client = new SmtpClient()
    await client.connectTLS({
      hostname: SMTP_HOSTNAME,
      port: SMTP_PORT,
      username: SMTP_USERNAME,
      password: SMTP_PASSWORD,
    })

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
    })

    // Close the connection
    await client.close()

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
