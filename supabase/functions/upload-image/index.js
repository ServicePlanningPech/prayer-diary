// Supabase Edge Function for profile image uploads
// This function receives an image as base64 data, uploads it to storage,
// and returns the public URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Note: Edge Functions can access environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Serve handles HTTP requests
Deno.serve(async (req) => {
  // Enable CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body (application/json)
    const { 
      imageData, // base64 encoded image data
      userId,    // user ID for the filename
      oldImageUrl // optional URL of old image to delete
    } = await req.json();

	console.log('upload-image: Parse completed');

    // Validate required fields
    if (!imageData || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: imageData, userId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
	
	console.log('upload-image: Validation completed');

    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Decode base64 image data
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    let base64Data = imageData;
    if (base64Data.includes(';base64,')) {
      base64Data = base64Data.split(';base64,')[1];
    }
    
    // Convert base64 to binary
    const binary = atob(base64Data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
	
	console.log('upload-image: base64 converted to binary');

    // Create file path with timestamp to ensure uniqueness
    const fileName = `${userId}_${Date.now()}.jpg`;
    const filePath = `profiles/${fileName}`;
    const bucketName = 'prayer-diary';

    // Upload the file to storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, array, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${error.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create the public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
	
	console.log(`upload-image: publicUrl: ${publicUrl}`);

    // Delete old image if provided
    if (oldImageUrl) {
      try {
        // Extract the path from the URL
        const oldFilePath = extractFilenameFromURL(oldImageUrl);
        
        if (oldFilePath) {
          const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove([oldFilePath]);
            
          if (deleteError) {
            console.warn(`Could not delete old image: ${deleteError.message}`);
          }
        }
      } catch (deleteError) {
        console.warn('Error during old image cleanup:', deleteError);
        // Continue despite deletion error
      }
    }
	
	console.log('upload-image: returning success');

    // Return success response with the public URL
    return new Response(
      JSON.stringify({ 
        success: true, 
        publicUrl: publicUrl 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );

  } catch (err) {
    console.error('Server error:', err);
    return new Response(
      JSON.stringify({ error: `Server error: ${err.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to extract filename from URL
function extractFilenameFromURL(url) {
  if (!url) return null;
  
  try {
    // Extract the path component from public URL
    const publicMatches = url.match(/\/storage\/v1\/object\/public\/prayer-diary\/([^?]+)/);
    if (publicMatches && publicMatches[1]) {
      return publicMatches[1]; // This is the path relative to the bucket
    }
    
    // Alternative approach for signed URLs
    const signedMatches = url.match(/\/storage\/v1\/object\/sign\/prayer-diary\/([^?]+)/);
    if (signedMatches && signedMatches[1]) {
      return signedMatches[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting filename from URL:', error);
    return null;
  }
}