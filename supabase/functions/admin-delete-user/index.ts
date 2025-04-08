// Supabase Edge Function for deleting users (admin function)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';

// CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Max-Age': '86400'
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Only allow POST for this function
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Parse request body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({
        error: 'User ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Get JWT token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Authorization header is required'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with server-side admin rights
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Create standard client to check the caller's permissions
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Verify the caller is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized - authentication failed',
        details: userError?.message
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Check if user is an admin
    const { data: caller, error: callerError } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();
      
    if (callerError || caller?.user_role !== 'Administrator') {
      return new Response(JSON.stringify({
        error: 'Forbidden - admin privileges required'
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return new Response(JSON.stringify({
        error: 'Failed to delete user',
        details: deleteError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'User deleted successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Server error',
      message: error.message || 'An unknown error occurred'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
