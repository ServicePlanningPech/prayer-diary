// Profile Image Handler for iOS Devices
// This file handles profile image uploads for iOS devices using a Supabase Edge Function

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

// Handle profile image selection for iOS devices
function handleIosProfileImageChange() {
    const fileInput = document.getElementById('profile-image');
    const previewImage = document.getElementById('profile-image-preview');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Debug image characteristics
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

// Upload profile image using the Edge Function
async function uploadProfileImageIOS(imageFile, userId, oldImageUrl = null) {
    console.log('iOS: Starting profile image upload using Edge Function');
    console.log(`iOS: Original image details: ${imageFile.name}, ${Math.round(imageFile.size / 1024)} KB, type: ${imageFile.type}`);
    
    try {
        // First compress the image to make it smaller for iOS
        console.log('iOS: Compressing image before upload');
        let compressedImage;
        
        try {
            // Use a smaller size for iOS devices to ensure better performance
            compressedImage = await compressImageIOS(imageFile, 1200, 0.7);
            console.log(`iOS: Compressed image size: ${Math.round(compressedImage.size / 1024)} KB`);
        } catch (processingError) {
            console.error('iOS: Image processing failed, will use original:', processingError);
            // Create a blob copy of the original file to use the same approach
            compressedImage = await imageFile.arrayBuffer().then(buffer => new Blob([buffer], { type: 'image/jpeg' }));
        }
        
        // Convert the compressed image to base64
        const base64Data = await blobToBase64(compressedImage);
        
        // Define the Edge Function URL - replace with your actual function URL
        const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/upload-image`;
        
        // Prepare the request payload
        const payload = {
            imageData: base64Data,
            userId: userId,
            oldImageUrl: oldImageUrl
        };
        
        console.log('iOS: Sending image to Edge Function...');
        
        // Post to the Edge Function
        const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.authToken || ''}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('iOS: Edge Function request failed:', response.status, errorText);
            throw new Error(`Edge Function failed: ${response.status} - ${errorText}`);
        }
        
        // Parse the response to get the public URL
        const result = await response.json();
        
        if (!result.success || !result.publicUrl) {
            throw new Error('Edge Function did not return a valid URL');
        }
        
        console.log('iOS: Upload via Edge Function successful!');
        console.log('iOS: Received public URL:', result.publicUrl);
        
        return result.publicUrl;
        
    } catch (error) {
        console.error('iOS: Error in profile image upload:', error);
        throw error;
    }
}

// Helper function to convert Blob to base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
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
                    
                    resolve(blob);
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

// Function to extract filename from a Supabase storage URL - kept for reference
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