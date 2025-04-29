// Supabase Edge Function: register-email-user
// Creates an email-only user entry bypassing RLS

import { serve } from 'https://deno.land/std@0.170.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Max-Age': '86400'
};

// Interface for the registration request
interface EmailUserRequest {
  full_name: string;
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Initialize Supabase client with admin privileges (service role key)
    // This bypasses RLS policies
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get the current user's session to verify they're an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user's session
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Invalid user session')
    }

    // Check if the user is an admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    if (profile.user_role !== 'Administrator') {
      throw new Error('Only administrators can register email-only users')
    }

    // Parse the request body
    const { full_name, email }: EmailUserRequest = await req.json()

    // Validate required fields
    if (!full_name || !email) {
      throw new Error('Missing required parameters: full_name and email are required')
    }

    // Generate a unique ID for the user
    const userId = crypto.randomUUID()

    // Create the profile record with service role key (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        full_name: full_name,
        email: email,
        approval_state: 'emailonly',  // Special state for email-only users
        content_delivery_email: true, // They want to receive emails
        calendar_hide: true,          // Hide from calendar
        user_role: 'User',
        profile_set: true             // No need to set up profile
      })

    if (error) {
      throw new Error(`Failed to create email-only user: ${error.message}`)
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Email-only user '${full_name}' registered successfully`,
        userId: userId
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  } catch (error) {
    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  }
})
