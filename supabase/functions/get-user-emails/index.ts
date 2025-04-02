// Supabase Edge Function for securely retrieving user emails
// This can access auth.users because it runs with higher privileges than client code

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get Supabase client with admin privileges
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables for Supabase connection');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request to get profile IDs
    const { profileIds } = await req.json();
    
    // Validate input
    if (!profileIds || !Array.isArray(profileIds)) {
      throw new Error('Invalid input format, expected array of profile IDs');
    }
    
    // Query auth.users to get emails for the specified IDs
    const { data: users, error } = await supabase
      .from('auth.users')
      .select('id, email')
      .in('id', profileIds);
      
    if (error) throw error;
    
    // Convert to a map of id -> email for easy use on the client
    const emailMap = {};
    if (users) {
      users.forEach(user => {
        emailMap[user.id] = user.email;
      });
    }
    
    // Return the results
    return new Response(
      JSON.stringify({
        success: true,
        emails: emailMap
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
