// Supabase Edge Function for managing prayer topics
// This function handles adding, editing, and deleting topics, including image handling

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get Supabase admin URL and key from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  try {
    // CORS headers to allow requests from any origin
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json'
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers, status: 204 })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { headers, status: 405 }
      )
    }

    // Parse the request body
    const requestData = await req.json()
    const { action, userId, topicData, topicId } = requestData

    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user has permission to manage topics
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('user_role, prayer_calendar_editor')
      .eq('id', userId)
      .single()

    if (userError) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify user permissions', details: userError.message }),
        { headers, status: 403 }
      )
    }

    // User must be an admin or have prayer_calendar_editor permission
    const hasPermission = userData.user_role === 'Administrator' || userData.prayer_calendar_editor === true
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'User does not have permission to manage topics' }),
        { headers, status: 403 }
      )
    }

    // Process the request based on the action
    let result = {}

    switch (action) {
      case 'add':
        // Add a new topic
        topicData.created_by = userId
        
        const { data: insertData, error: insertError } = await supabase
          .from('prayer_topics')
          .insert(topicData)
          .select()

        if (insertError) {
          return new Response(
            JSON.stringify({ error: 'Failed to add topic', details: insertError.message }),
            { headers, status: 500 }
          )
        }

        result = { success: true, message: 'Topic added successfully', data: insertData }
        break

      case 'update':
        // Update an existing topic
        topicData.updated_at = new Date().toISOString()
        
        const { data: updateData, error: updateError } = await supabase
          .from('prayer_topics')
          .update(topicData)
          .eq('id', topicId)
          .select()

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to update topic', details: updateError.message }),
            { headers, status: 500 }
          )
        }

        result = { success: true, message: 'Topic updated successfully', data: updateData }
        break

      case 'delete':
        // Delete a topic
        const { data: deleteData, error: deleteError } = await supabase
          .from('prayer_topics')
          .delete()
          .eq('id', topicId)

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: 'Failed to delete topic', details: deleteError.message }),
            { headers, status: 500 }
          )
        }

        result = { success: true, message: 'Topic deleted successfully' }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers, status: 400 }
        )
    }

    // Return the result
    return new Response(
      JSON.stringify(result),
      { headers, status: 200 }
    )
  } catch (error) {
    // Handle any unexpected errors
    console.error('Error in manage-topics function:', error)
    
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details: error.message
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500
      }
    )
  }
})
