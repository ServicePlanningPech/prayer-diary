// Improved Supabase Edge Function for sending emails with better CORS handling
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  from?: string
  testConnection?: boolean
}

// Improved CORS handling
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Consider restricting this to your specific domain in production
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info',
  'Access-Control-Max-Age': '86400', // 24 hours caching of preflight requests
}

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] ${req.method} request received`)

  // Handle CORS preflight request - very important for browser requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS (preflight) request')
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // Test connection endpoint - just return success for connectivity testing
  if (req.method === 'GET' || (req.method === 'POST' && req.headers.get('x-test-connection') === 'true')) {
    console.log('Handling test connection request')
    return new Response(JSON.stringify({ 
      status: 'ok', 
      message: 'Email function is deployed and reachable',
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
  }

  try {
    // Only allow POST requests for actual email sending
    if (req.method !== 'POST') {
      console.log(`Method ${req.method} not allowed`)
      return new Response(JSON.stringify({ 
        error: 'Method not allowed',
        allowedMethods: ['POST', 'OPTIONS', 'GET'],
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      })
    }

    // Parse request body and log it (excluding sensitive information)
    const requestData = await req.json() as EmailRequest
    console.log(`Received request:`, { 
      to: requestData.to ? 'REDACTED' : undefined,
      subject: requestData.subject,
      testConnection: requestData.testConnection,
    })

    // Handle test connection request via body parameter
    if (requestData.testConnection === true) {
      console.log('Handling test connection request (via body)')
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'Email function is deployed and reachable',
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      })
    }

    // Validate required fields
    if (!requestData.to || !requestData.subject || !requestData.html) {
      console.log('Missing required email parameters')
      return new Response(
        JSON.stringify({ 
          error: 'Missing required email parameters',
          requiredFields: ['to', 'subject', 'html'],
          receivedFields: Object.keys(requestData),
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    // Environment variables with diagnostic info if missing
    const SMTP_HOSTNAME = Deno.env.get('SMTP_HOSTNAME') || 'smtp.gmail.com'
    const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465')
    const SMTP_USERNAME = Deno.env.get('SMTP_USERNAME')
    const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD')
    const DEFAULT_FROM = Deno.env.get('DEFAULT_FROM') || 'Prayer Diary <prayerdiary@pech.co.uk>'

    // Check if credentials are set
    if (!SMTP_USERNAME || !SMTP_PASSWORD) {
      console.log('Missing SMTP credentials')
      return new Response(
        JSON.stringify({ 
          error: 'Missing SMTP credentials',
          message: 'The Edge Function is not properly configured. Run "supabase secrets set" to configure SMTP credentials.',
          missingCredentials: {
            SMTP_USERNAME: !SMTP_USERNAME,
            SMTP_PASSWORD: !SMTP_PASSWORD,
          },
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    // Log connection attempt (with sensitive info redacted)
    console.log(`Connecting to SMTP server: ${SMTP_HOSTNAME}:${SMTP_PORT}`)

    try {
      // Configure SMTP client
      const client = new SmtpClient()
      
      await client.connectTLS({
        hostname: SMTP_HOSTNAME,
        port: SMTP_PORT,
        username: SMTP_USERNAME,
        password: SMTP_PASSWORD,
      })

      console.log('Connected to SMTP server, sending email')

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
      console.log('Email sent successfully')

      // Return success response
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Email sent successfully',
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      })
    } catch (smtpError) {
      console.error('SMTP error:', smtpError)
      
      // Return detailed SMTP error
      return new Response(
        JSON.stringify({
          error: 'SMTP error',
          message: smtpError.message || 'Failed to send email through SMTP',
          details: smtpError.toString(),
          smtp: {
            hostname: SMTP_HOSTNAME,
            port: SMTP_PORT,
            username: SMTP_USERNAME ? 'PROVIDED' : 'MISSING',
          }
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }
  } catch (error) {
    console.error('General error:', error)

    // Return error response with helpful debugging info
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send email',
        details: error.toString(),
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})
