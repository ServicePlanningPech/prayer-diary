// Profile Update Helper
// This file contains direct REST API functions to update profiles
// when the Supabase SDK stalls after other HTTP requests

/**
 * Updates a user profile via direct REST API call to avoid Supabase SDK stalling issues
 * @param {Object} profileData - Profile data to update (must include all required fields)
 * @param {string} userId - The user ID to update
 * @returns {Promise<Object>} - Response data or error
 */
async function updateProfileDirectApi(profileData, userId) {
    console.log('Updating profile via direct REST API');
    
    try {
        // Get the auth token (use the globally stored one or fetch from Supabase)
        let authToken = window.authToken;
        
        // Fallback if token isn't available (rare case)
        if (!authToken) {
            try {
                const { data } = await supabase.auth.getSession();
                authToken = data.session?.access_token;
            } catch (tokenError) {
                console.error('Error getting auth token:', tokenError);
                throw new Error('Authentication token not available');
            }
        }
        
        // Construct the Supabase REST API URL for the profiles table
        const updateUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
        
        // Make the direct PATCH request to update the profile
        const response = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'apikey': SUPABASE_ANON_KEY,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(profileData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Profile update failed: ${response.status}`, errorText);
            throw new Error(`Profile update failed (${response.status}): ${errorText}`);
        }
        
        console.log('Profile updated successfully via direct API');
        return { success: true };
        
    } catch (error) {
        console.error('Error in updateProfileDirectApi:', error);
        throw error;
    }
}

/**
 * Complete function that updates a profile with a new image URL
 * Used after Edge Function image upload to avoid Supabase SDK stalling
 * @param {Object} profileData - The complete profile data 
 * @param {string} imageUrl - The new image URL from the Edge Function
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - Success or error result
 */
async function updateProfileWithImage(profileData, imageUrl, userId) {
    try {
        // Update the profile data with the new image URL
        const updatedProfileData = {
            ...profileData,
            profile_image_url: imageUrl,
            updated_at: new Date().toISOString()
        };
        
        // Use the direct API method to avoid stalling
        return await updateProfileDirectApi(updatedProfileData, userId);
        
    } catch (error) {
        console.error('Error updating profile with image:', error);
        throw error;
    }
}