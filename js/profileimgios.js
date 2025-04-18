// Profile Image Handler for iOS Devices
// This file contains functions for handling profile image uploads using direct REST API calls
// to work around issues with the Supabase SDK on iOS

// Set up the profile image button click handler for iOS devices
function setupIosProfileImageHandlers() {
    const selectButton = document.getElementById('select-profile-image');
    const fileInput = document.getElementById('profile-image');
    
    // First add event listener to the file input
    if (fileInput) {
        // Use an iOS-specific named function to avoid collision
        fileInput.addEventListener('change', handleIosProfileImageChange);
    }
    
    if (selectButton && fileInput) {
        // Remove any existing event listeners first to prevent duplicates
        const newSelectButton = selectButton.cloneNode(true);
        selectButton.parentNode.replaceChild(newSelectButton, selectButton);
        
        // Add the event listener to the fresh button
        newSelectButton.addEventListener('click', function() {
            fileInput.click();
        });
    }
}

// Handle profile image selection for iOS devices - renamed to avoid collision
function handleIosProfileImageChange() {
    const fileInput = document.getElementById('profile-image');
    const previewImage = document.getElementById('profile-image-preview');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Debug image characteristics - useful for troubleshooting iOS issues
        console.log('iOS: Selected image details:', {
            name: file.name,
            type: file.type,
            size: Math.round(file.size/1024) + ' KB',
            lastModified: new Date(file.lastModified).toISOString()
        });
        
        // For iOS, always use the lightweight preview method to avoid memory issues
        createIosLightweightPreview(file, previewImage);
    }
}

// Create a lightweight preview for iOS that uses createObjectURL
function createIosLightweightPreview(file, previewImage) {
    console.log('iOS: Creating lightweight preview');
    
    try {
        const objectUrl = URL.createObjectURL(file);
        
        // Update both preview elements
        previewImage.src = objectUrl;
        document.getElementById('preview-profile-image').src = objectUrl;
        
        // Clean up the URL after the image loads to prevent memory leaks
        previewImage.onload = () => {
            console.log('iOS: Preview image loaded successfully');
            // Schedule cleanup for later
            setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
                console.log('iOS: ObjectURL revoked to prevent memory leaks');
            }, 3000); // Wait 3 seconds to ensure all uses of the URL are complete
        };
        
        previewImage.onerror = () => {
            console.error('iOS: Error loading preview image');
            URL.revokeObjectURL(objectUrl);
            
            // Set to placeholder if there's an error
            previewImage.src = 'img/placeholder-profile.png';
            document.getElementById('preview-profile-image').src = 'img/placeholder-profile.png';
        };
    } catch (error) {
        console.error('iOS: Error creating lightweight preview:', error);
        // Fallback to placeholder
        previewImage.src = 'img/placeholder-profile.png';
        document.getElementById('preview-profile-image').src = 'img/placeholder-profile.png';
    }
}

// Upload profile image using direct REST API calls for iOS
async function uploadProfileImageIOS(imageFile, userId, oldImageUrl = null) {
    console.log('iOS: Starting profile image upload using REST API');
    console.log(`iOS: Original image details: ${imageFile.name}, ${Math.round(imageFile.size / 1024)} KB, type: ${imageFile.type}`);
    
    try {
        // Define the path for storage
        const fileName = `${userId}_${Date.now()}.jpg`;
        const filePath = `profiles/${fileName}`;
        
        // First compress the image to make it smaller for iOS
        console.log('iOS: Compressing image before upload');
        let fileToUpload;
        
        try {
            // Use a smaller size for iOS devices to ensure better performance
            fileToUpload = await compressImageIOS(imageFile, 1200, 0.7);
            console.log(`iOS: Compressed image size: ${Math.round(fileToUpload.size / 1024)} KB`);
        } catch (processingError) {
            console.error('iOS: Image processing failed, will try with original file:', processingError);
            fileToUpload = imageFile;
        }
        
        // Use the globally stored auth token instead of making a new request
        let authToken = window.authToken;
        
        // Fallback only if token isn't available
        if (!authToken) {
            console.log('iOS: No stored auth token found, fetching new one');
            try {
                const { data } = await supabase.auth.getUser();
                if (data && data.user) {
                    authToken = data.user.session?.access_token;
                    if (authToken) {
                        // Store it for future use
                        window.authToken = authToken;
                    }
                }
            } catch (tokenError) {
                console.warn('iOS: Error getting user:', tokenError);
            }
            
            // Last resort fallback
            if (!authToken) {
                console.warn('iOS: Still could not get token, falling back to getSession()');
                const { data: { session } } = await supabase.auth.getSession();
                authToken = session.access_token;
                
                // Store it for future use
                window.authToken = authToken;
            }
        }
                
        // Always use prayer-diary bucket - no need to check available buckets
        console.log('iOS: Using prayer-diary bucket');
        const bucketName = 'prayer-diary';
        
        
        // Calculate bucket path explicitly with the correct bucket
        const fullPath = `${bucketName}/${filePath}`;
        console.log(`iOS: Will upload to path: ${fullPath}`);
        
        // API endpoint for direct upload with the correct bucket
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;
        
        // Upload directly using fetch API
        console.log('iOS: Uploading file with fetch API...');
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-upsert': 'true'
            },
            body: fileToUpload
        });
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('iOS: Upload failed with status:', uploadResponse.status);
            console.error('iOS: Error response:', errorText);
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }
        
        console.log('iOS: Upload successful!');
        
        // Simply create a direct public URL without any signing
        console.log('iOS: Creating public URL for the uploaded file...');
        
        // Construct the public URL directly
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
        console.log('iOS: Created public URL for the image:', publicUrl);
        
        // If we've uploaded a new image successfully and had an old image, try to delete the old one
        if (oldImageUrl) {
            await deleteOldImageIOS(oldImageUrl, authToken);
        }
        
        return publicUrl;
        
    } catch (error) {
        console.error('iOS: Error in profile image upload:', error);
        throw error;
    }
}

// Delete an old image using REST API for iOS
async function deleteOldImageIOS(oldImageUrl, authToken) {
    try {
        const oldFilePath = extractFilenameFromURL(oldImageUrl);
        
        if (oldFilePath) {
            console.log(`iOS: Attempting to delete old profile image: ${oldFilePath}`);
            
            // API endpoint for deletion
            const deleteUrl = `${SUPABASE_URL}/storage/v1/object/prayer-diary/${oldFilePath}`;
            
            // Delete using fetch API
            const deleteResponse = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (!deleteResponse.ok) {
                console.warn(`iOS: Could not delete old profile image. Status: ${deleteResponse.status}`);
            } else {
                console.log('iOS: Old profile image deleted successfully');
            }
        }
    } catch (deleteError) {
        console.warn('iOS: Error during old image cleanup:', deleteError);
        // Don't throw this error - just log it
    }
}

// Helper function to compress images for iOS
function compressImageIOS(file, maxWidth, quality = 0.7) {
    return new Promise((resolve, reject) => {
        try {
            // Create an image element to load the file
            const img = new Image();
            
            img.onload = () => {
                // Calculate dimensions
                let width = img.width;
                let height = img.height;
                
                // Resize if larger than maxWidth while maintaining aspect ratio
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                
                // Create a canvas for the resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                // Draw the image to the canvas
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'white'; // Use white background to ensure JPEG quality
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to a blob with specified quality
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("iOS: Failed to create image blob"));
                        return;
                    }
                    
                    // Clean up to prevent memory leaks
                    URL.revokeObjectURL(img.src);
                    
                    resolve(blob); // Just return the blob, not a File object
                }, 'image/jpeg', quality);
            };
            
            img.onerror = (e) => {
                URL.revokeObjectURL(img.src);
                reject(new Error("iOS: Failed to load image for compression: " + e.message));
            };
            
            // Load the image using an object URL
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            
        } catch (err) {
            reject(new Error("iOS: Image compression error: " + err.message));
        }
    });
}

// Function to extract filename from a Supabase storage URL - same as in profileimg.js
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
        console.error('iOS: Error extracting filename from URL:', error);
        return null;
    }
}