// Profile Image Handler for Non-iOS Devices
// This file contains functions for handling profile image uploads using the Supabase SDK

// Set up the profile image button click handler for standard devices
function setupStandardProfileImageHandlers() {
    const selectButton = document.getElementById('select-profile-image');
    const fileInput = document.getElementById('profile-image');
    
    // First add event listener to the file input
    if (fileInput) {
        // Use a standard-specific named function to avoid collision
        fileInput.addEventListener('change', handleStandardProfileImageChange);
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

// Handle profile image selection for standard devices - renamed to avoid collision
function handleStandardProfileImageChange() {
    const fileInput = document.getElementById('profile-image');
    const previewImage = document.getElementById('profile-image-preview');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Identify if this is likely a camera photo (created in last minute)
        const isCameraPhoto = file.lastModified >= (Date.now() - 60000);
        
        // Check if it's HEIC format
        const isHEIC = file.type === 'image/heic' || 
                      file.type === 'image/heif' || 
                      /\.heic$/i.test(file.name) ||
                      /\.heif$/i.test(file.name);
        
        // Debug image characteristics - useful for troubleshooting
        console.log('Selected image details:', {
            name: file.name,
            type: file.type,
            size: Math.round(file.size/1024) + ' KB',
            lastModified: new Date(file.lastModified).toISOString(),
            likelyCameraPhoto: isCameraPhoto,
            isHEIC: isHEIC
        });
        
        if (isHEIC) {
            console.log('HEIC/HEIF format detected - will be converted during upload');
        }
        
        // For camera photos, we'll use a more lightweight preview method
        if (isCameraPhoto) {
            console.log('Likely camera photo detected - using optimized handling');
            createStandardLightweightPreview(file, previewImage);
        } else {
            // Use normal reader for gallery photos
            const reader = new FileReader();
            
            reader.onload = function(e) {
                console.log('Image loaded in memory successfully');
                previewImage.src = e.target.result;
                
                // Also update the card preview
                document.getElementById('preview-profile-image').src = e.target.result;
            };
            
            reader.onerror = function(e) {
                console.error('Error reading image file:', e);
                // Set to placeholder if there's an error
                previewImage.src = 'img/placeholder-profile.png';
                document.getElementById('preview-profile-image').src = 'img/placeholder-profile.png';
            };
            
            // Start reading the image
            try {
                console.log('Starting to read image file...');
                reader.readAsDataURL(file);
            } catch (err) {
                console.error('Exception when reading image:', err);
            }
        }
    }
}

// Create a lightweight preview that doesn't stall the browser
function createStandardLightweightPreview(file, previewImage) {
    console.log('Creating lightweight preview for camera photo');
    // Create a lightweight preview using createObjectURL instead of readAsDataURL
    try {
        const objectUrl = URL.createObjectURL(file);
        
        // Update both preview elements
        previewImage.src = objectUrl;
        document.getElementById('preview-profile-image').src = objectUrl;
        
        // Clean up the URL after the image loads to prevent memory leaks
        previewImage.onload = () => {
            console.log('Preview image loaded successfully');
            // We don't revoke immediately because we need both previews to load
            // Instead, schedule cleanup for later
            setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
                console.log('ObjectURL revoked to prevent memory leaks');
            }, 3000); // Wait 3 seconds to ensure all uses of the URL are complete
        };
        
        previewImage.onerror = () => {
            console.error('Error loading preview image');
            URL.revokeObjectURL(objectUrl);
            
            // Set to placeholder if there's an error
            previewImage.src = 'img/placeholder-profile.png';
            document.getElementById('preview-profile-image').src = 'img/placeholder-profile.png';
        };
    } catch (error) {
        console.error('Error creating lightweight preview:', error);
        // Fallback to placeholder
        previewImage.src = 'img/placeholder-profile.png';
        document.getElementById('preview-profile-image').src = 'img/placeholder-profile.png';
    }
}

// Upload profile image to Supabase storage using the SDK
async function uploadProfileImage(imageFile, userId, oldImageUrl = null) {
    console.log('Starting standard profile image upload');
    console.log(`Original image details: ${imageFile.name}, ${Math.round(imageFile.size / 1024)} KB, type: ${imageFile.type}`);
    
    try {
        // Define the path for storage
        const fileName = `${userId}_${Date.now()}.jpg`;
        const filePath = `profiles/${fileName}`;
        
        // Check if the file is in HEIC format (common on iOS devices)
        const isHEIC = imageFile.type === 'image/heic' || 
                      imageFile.type === 'image/heif' || 
                      /\.heic$/i.test(imageFile.name) ||
                      /\.heif$/i.test(imageFile.name);
                      
        if (isHEIC) {
            console.log('HEIC/HEIF format detected, will convert to JPEG');
        }
        
        // Check if the file is large (over 2MB)
        const isLargeFile = imageFile.size > 2 * 1024 * 1024; // 2MB threshold
        
        // The file we'll actually upload (original or processed)
        let fileToUpload = imageFile;
        
        // If file is HEIC or very large, compress/convert it
        if (isHEIC || isLargeFile) {
            console.log('Processing image before upload (conversion or compression)');
            
            try {
                // Process the image (handles both HEIC conversion and compression)
                fileToUpload = await compressImage(imageFile, 1800, 0.8);
                console.log(`Processed image size: ${Math.round(fileToUpload.size / 1024)} KB`);
            } catch (processingError) {
                console.error('Image processing failed, will try with original file:', processingError);
                // Fall back to original file if processing fails
                fileToUpload = imageFile;
            }
        }
        
        // Proceed with upload using the standard Supabase SDK
        console.log(`Uploading image to path: ${filePath}`);
        
        // Upload the file (compressed or original)
        const { data, error } = await supabase.storage
            .from('prayer-diary')
            .upload(filePath, fileToUpload, {
                contentType: 'image/jpeg',
                upsert: true
            });
        
        if (error) {
            console.error('Profile image upload failed:', error);
            console.error('Upload error details:', {
                message: error.message || "Unknown error",
                status: error.status || "No status",
                statusCode: error.statusCode || "No code"
            });
            throw error;
        }
        
        console.log('Image uploaded successfully');
        
        // Create a public URL instead of a signed URL
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/prayer-diary/${filePath}`;
        console.log('Created public URL for the image:', publicUrl);
        
        // If we've successfully uploaded a new image and we had an old image, delete the old one
        if (oldImageUrl) {
            try {
                const oldFilePath = extractFilenameFromURL(oldImageUrl);
                if (oldFilePath) {
                    console.log(`Attempting to delete old profile image: ${oldFilePath}`);
                    
                    const { error: deleteError } = await supabase.storage
                        .from('prayer-diary')
                        .remove([oldFilePath]);
                    
                    if (deleteError) {
                        console.warn(`Could not delete old profile image: ${deleteError.message}`);
                    } else {
                        console.log('Old profile image deleted successfully');
                    }
                }
            } catch (deleteError) {
                console.warn('Error during old image cleanup:', deleteError);
                // Don't throw this error - just log it
            }
        }
        
        return publicUrl;
        
    } catch (error) {
        console.error('Error in profile image upload:', error);
        throw error;
    }
}

// Helper function to compress images and convert HEIC to JPEG
function compressImage(file, maxWidth, quality = 0.8) {
    return new Promise((resolve, reject) => {
        try {
            // Create an image element to load the file
            const img = new Image();
            
            img.onload = () => {
                // Handle EXIF orientation (common issue with iOS photos)
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
                
                // Convert to a JPEG blob with specified quality
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Failed to create image blob"));
                        return;
                    }
                    
                    // Create a new File object with the right name and type
                    const compressedFile = new File(
                        [blob],
                        file.name, 
                        { type: 'image/jpeg', lastModified: Date.now() }
                    );
                    
                    // Clean up to prevent memory leaks
                    URL.revokeObjectURL(img.src);
                    
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            
            img.onerror = (e) => {
                URL.revokeObjectURL(img.src);
                reject(new Error("Failed to load image for compression: " + e.message));
            };
            
            // Load the image using an object URL
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            
        } catch (err) {
            reject(new Error("Image compression error: " + err.message));
        }
    });
}

// Function to extract filename from a Supabase storage URL
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