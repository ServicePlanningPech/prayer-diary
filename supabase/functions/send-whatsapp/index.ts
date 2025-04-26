// supabase/functions/send-whatsapp/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers to allow requests from your app domain
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Replace with your domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { phoneNumber, message, templateName, templateParams } = await req.json();
    
    // Validate input
    if (!phoneNumber || (!message && !templateName)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number and either message or template are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Format the phone number (remove + if present)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
    
    // WhatsApp API credentials
    const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN');
    const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID');
    
    let requestBody;
    let apiUrl = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`;
    
    // Check if we're using a template or a direct message
    if (templateName) {
      // Template message format
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: templateParams || []
        }
      };
    } else {
      // Text message format (only for 24-hour window)
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { body: message }
      };
    }
    
    // Send the message to WhatsApp API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    // Return the result
    return new Response(
      JSON.stringify({ success: response.ok, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.ok ? 200 : 400 }
    );
    
  } catch (error) {
    // Handle any errors
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});