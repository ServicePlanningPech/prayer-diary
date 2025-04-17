// User Profile Module

// Flag to prevent multiple simultaneous profile loads
let profileLoadInProgress = false;

// Load and display the user's profile
async function loadUserProfile() {
    if (!isLoggedIn()) return;
    
    // Prevent multiple simultaneous calls
    if (profileLoadInProgress) {
        console.log('Profile load already in progress, skipping duplicate call');
        return;
    }
    
    profileLoadInProgress = true;
    
    try {
        // Refresh user profile from database
        await fetchUserProfile();
        
        if (!userProfile) {
            showNotification('Error', 'Unable to load your profile. Please try again later.');
            return;
        }
        
        // Ensure we have the latest user metadata
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user) {
            // Update the currentUser variable with the latest data
            currentUser = data.user;
        }
        
        // Update profile images if available
        if (userProfile.profile_image_url) {
            updateAllProfileImages(userProfile.profile_image_url);
        }
        
        // Get the name from the most reliable source
        const userName = userProfile.full_name || 
                        (currentUser.user_metadata ? currentUser.user_metadata.full_name : null) || 
                        currentUser.email || 
                        "Unknown User";
        
        // Explicitly set the value
        const nameField = document.getElementById('profile-name');
        nameField.value = userName;
        
        // Force the field to update (sometimes needed for read-only fields)
        nameField.defaultValue = userName;
        document.getElementById('profile-prayer-points').value = userProfile.prayer_points || '';
        document.getElementById('profile-phone').value = userProfile.phone_number || '';
        document.getElementById('profile-whatsapp').value = userProfile.whatsapp_number || '';
        
        // Set prayer update notification radio button
        const prayerUpdateMethod = userProfile.prayer_update_notification_method || 'email';
        document.querySelector(`input[name="prayer-update-notification"][value="${prayerUpdateMethod}"]`).checked = true;
        
        // Set urgent prayer notification radio button
        const urgentPrayerMethod = userProfile.urgent_prayer_notification_method || 'email';
        document.querySelector(`input[name="urgent-prayer-notification"][value="${urgentPrayerMethod}"]`).checked = true;
        
        // Set up notification method change handlers
        setupNotificationMethodHandlers();
        
        // Initial check for which phone fields to show
        updatePhoneFieldsVisibility();
        
        // Keep push notification setting in the background
        document.getElementById('notify-push').checked = userProfile.notification_push || false;
        
        // Reset GDPR consent checkbox and button
        if (document.getElementById('gdpr-consent-check')) {
            document.getElementById('gdpr-consent-check').checked = false;
            document.getElementById('gdpr-consent-submit').disabled = true;
        }
        
        // Ensure name is visible in the form before updating preview
        setTimeout(() => {
            // Double-check name field is populated
            const nameField = document.getElementById('profile-name');
            if (!nameField.value || nameField.value.trim() === '') {
                // One last attempt to set it
                nameField.value = userProfile.full_name || 
                                 (currentUser.user_metadata ? currentUser.user_metadata.full_name : null) || 
                                 currentUser.email || 
                                 "Unknown User";
            }
            
            // Now update the preview
            updateProfilePreview();
        }, 100);
        
        // Update approval status message
        const profileStatus = document.getElementById('profile-status');
        if (userProfile.approval_state === 'Pending') {
            profileStatus.classList.remove('is-hidden');
            profileStatus.classList.add('is-warning');
            profileStatus.innerHTML = `
                <p>Your account is pending approval by an administrator. You'll receive an email when your account is approved.</p>
            `;
        } else if (userProfile.approval_state === 'Rejected') {
            profileStatus.classList.remove('is-hidden');
            profileStatus.classList.add('is-danger');
            profileStatus.innerHTML = `
                <p>Your account has been rejected by an administrator. Please contact the church office for more information.</p>
            `;
        } else {
            profileStatus.classList.add('is-hidden');
        }
        
        // Set up form submission
        document.getElementById('profile-form').addEventListener('submit', saveProfile);
        
        // Set up preview update when fields change
        document.getElementById('profile-name').addEventListener('input', updateProfilePreview);
        document.getElementById('profile-prayer-points').addEventListener('input', updateProfilePreview);
        document.getElementById('profile-image').addEventListener('change', handleProfileImageChange);
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Error', `Unable to load your profile: ${error.message}`);
    } finally {
        // Reset the flag to allow future profile loads
        profileLoadInProgress = false;
    }
}

// Handle profile image selection with enhanced handling for camera photos
function handleProfileImageChange() {
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
        
        // Debug image characteristics - useful for troubleshooting iOS issues
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
            createLightweightPreview(file, previewImage);
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
function createLightweightPreview(file, previewImage) {
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

// Set up the profile image button click handler
function setupProfileImageButton() {
    const selectButton = document.getElementById('select-profile-image');
    const fileInput = document.getElementById('profile-image');
    
    if (selectButton && fileInput) {
        // Remove any existing event listeners first to prevent duplicates
        const newSelectButton = selectButton.cloneNode(true);
        selectButton.parentNode.replaceChild(newSelectButton, selectButton);
        
        // Add the event listener to the fresh button
        newSelectButton.addEventListener('click', function() {
            fileInput.click();
        });
        
        // Button setup complete
    }
}

// Set up handlers for notification method changes
function setupNotificationMethodHandlers() {
    // First remove any existing event listeners by cloning and replacing the radio buttons
    const replaceRadioListeners = (name) => {
        const radios = document.querySelectorAll(`input[name="${name}"]`);
        radios.forEach(radio => {
            const newRadio = radio.cloneNode(true);
            radio.parentNode.replaceChild(newRadio, radio);
        });
        
        // Now add fresh event listeners
        document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
            radio.addEventListener('change', updatePhoneFieldsVisibility);
        });
    };
    
    // Apply to both sets of radio buttons
    replaceRadioListeners('prayer-update-notification');
    replaceRadioListeners('urgent-prayer-notification');
    
    // Setup real-time validation for phone number fields
    const phoneInput = document.getElementById('profile-phone');
    const whatsappInput = document.getElementById('profile-whatsapp');
    
    if (phoneInput) {
        const newPhoneInput = phoneInput.cloneNode(true);
        phoneInput.parentNode.replaceChild(newPhoneInput, phoneInput);
        newPhoneInput.addEventListener('input', function() {
            if (this.hasAttribute('required') && this.value.trim() === '') {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    }
    
    if (whatsappInput) {
        const newWhatsappInput = whatsappInput.cloneNode(true);
        whatsappInput.parentNode.replaceChild(newWhatsappInput, whatsappInput);
        newWhatsappInput.addEventListener('input', function() {
            if (this.hasAttribute('required') && this.value.trim() === '') {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    }
    
    // Setup the profile image button
    setupProfileImageButton();
    
    // Notification handlers are now set up
}

// Helper function to ensure no hidden fields have required attribute
function disableHiddenRequiredFields() {
    // Get all required inputs
    const requiredInputs = document.querySelectorAll('input[required], select[required], textarea[required]');
    
    requiredInputs.forEach(input => {
        // Check if the input is hidden (either directly or inside a hidden container)
        if (isHidden(input)) {
            // Temporarily remove required attribute to prevent validation errors
            input.removeAttribute('required');
            // Flag it so we can restore later if needed
            input.dataset.wasRequired = 'true';
        }
    });
    
    // Helper to check if an element is hidden
    function isHidden(el) {
        // Check if the element itself is hidden
        if (el.style.display === 'none' || el.classList.contains('d-none')) return true;
        
        // Check if any parent container is hidden (recursive check up the DOM)
        let parent = el.parentElement;
        while (parent) {
            if (parent.style.display === 'none' || parent.classList.contains('d-none')) {
                return true;
            }
            parent = parent.parentElement;
        }
        
        return false;
    }
}

// Update phone fields visibility based on notification method selections
function updatePhoneFieldsVisibility() {
    // Get selected notification methods (with null checks)
    const prayerUpdateRadio = document.querySelector('input[name="prayer-update-notification"]:checked');
    const urgentPrayerRadio = document.querySelector('input[name="urgent-prayer-notification"]:checked');
    
    if (!prayerUpdateRadio || !urgentPrayerRadio) {
        console.warn('Radio buttons for notification preferences not found');
        return; // Exit if elements don't exist
    }
    
    const prayerUpdateMethod = prayerUpdateRadio.value;
    const urgentPrayerMethod = urgentPrayerRadio.value;
    
    // Get container elements (with null checks)
    const phoneNumbersSection = document.getElementById('phone-numbers-section');
    const smsContainer = document.getElementById('sms-phone-container');
    const whatsappContainer = document.getElementById('whatsapp-phone-container');
    const noPhoneMessage = document.getElementById('no-phone-needed-message');
    
    // Exit if any required container is missing
    if (!phoneNumbersSection) {
        console.warn('phone-numbers-section element not found');
        return;
    }
    
    // Check if SMS is selected for either notification type
    const smsNeeded = (prayerUpdateMethod === 'sms' || urgentPrayerMethod === 'sms');
    
    // Check if WhatsApp is selected for either notification type
    const whatsappNeeded = (prayerUpdateMethod === 'whatsapp' || urgentPrayerMethod === 'whatsapp');
    
    // Hide the entire phone numbers section if neither SMS nor WhatsApp is needed
    if (!smsNeeded && !whatsappNeeded) {
        phoneNumbersSection.classList.add('d-none');
        // Make sure to remove required from fields when hiding the section
        const phoneInput = document.getElementById('profile-phone');
        const whatsappInput = document.getElementById('profile-whatsapp');
        if (phoneInput) phoneInput.removeAttribute('required');
        if (whatsappInput) whatsappInput.removeAttribute('required');
        return; // Exit early since the whole section is hidden
    } else {
        phoneNumbersSection.classList.remove('d-none');
    }
    
    // Update visibility of SMS container
    const phoneInput = document.getElementById('profile-phone');
    if (smsNeeded && smsContainer) {
        smsContainer.classList.remove('d-none');
        if (phoneInput) phoneInput.setAttribute('required', '');
    } else if (smsContainer) {
        smsContainer.classList.add('d-none');
        if (phoneInput) {
            phoneInput.removeAttribute('required');
            // Clear validation state when hiding
            phoneInput.classList.remove('is-invalid');
        }
    }
    
    // Update visibility of WhatsApp container
    const whatsappInput = document.getElementById('profile-whatsapp');
    if (whatsappNeeded && whatsappContainer) {
        whatsappContainer.classList.remove('d-none');
        if (whatsappInput) whatsappInput.setAttribute('required', '');
    } else if (whatsappContainer) {
        whatsappContainer.classList.add('d-none');
        if (whatsappInput) {
            whatsappInput.removeAttribute('required');
            // Clear validation state when hiding
            whatsappInput.classList.remove('is-invalid');
        }
    }
    
    // Show/hide the "no phone needed" message
    if (noPhoneMessage) {
        if (smsNeeded || whatsappNeeded) {
            noPhoneMessage.classList.add('d-none');
        } else {
            noPhoneMessage.classList.remove('d-none');
        }
    }
    
    // Run this directly after changing visibility
    disableHiddenRequiredFields();
}



// Helper function to update all profile images in the UI
function updateAllProfileImages(imageUrl) {
    // List of all elements that should show the profile image
    const imageElements = [
        document.getElementById('preview-profile-image'),       // Prayer card preview
        document.getElementById('profile-image-preview')        // Upload preview
    ];
    
    // Update each element if it exists
    imageElements.forEach(img => {
        if (img) {
            img.src = imageUrl;
        }
    });
}

// Update the profile preview card
function updateProfilePreview() {
    const nameInput = document.getElementById('profile-name');
    const prayerPointsInput = document.getElementById('profile-prayer-points');
    
    const previewName = document.getElementById('preview-name');
    const previewPrayerPoints = document.getElementById('preview-prayer-points');
    
    // Update preview values
    previewName.textContent = nameInput.value || 'Your Name';
    
    if (prayerPointsInput.value) {
        previewPrayerPoints.innerHTML = `<p>${prayerPointsInput.value.replace(/\n/g, '</p><p>')}</p>`;
    } else {
        previewPrayerPoints.innerHTML = '<p>Your prayer points will appear here.</p>';
    }
}

// Variables for GDPR consent
let profileDataToSave = null;
let profileSubmitButton = null;
let gdprModal = null;

// Simple function to upload a profile image to Supabase with automatic compression
async function uploadProfileImage(imageFile, userId) {
    console.log('Starting profile image upload with size handling');
    console.log(`Original image details: ${imageFile.name}, ${Math.round(imageFile.size / 1024)} KB, type: ${imageFile.type}`);
    
    try {
        // Define the path for storage
        const fileName = `${userId}_${Date.now()}.jpg`;
        const filePath = `profiles/${fileName}`;
        
        // Check if we're on an iOS device
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        
        // Check if we're on an older iOS version (iOS 15 or lower)
        const isOldIOS = isIOS && (/OS 1[0-5]_/.test(navigator.userAgent) || 
                                   /Version\/1[0-5]/.test(navigator.userAgent));
        
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
        
        // Determine if we need processing
        // Process if:
        // - It's a HEIC file, OR
        // - It's on older iOS and large, OR
        // - It's very large (over 4MB)
        const needsProcessing = isHEIC || 
                              (isOldIOS && isLargeFile) || 
                              imageFile.size > 4 * 1024 * 1024;
        
        // The file we'll actually upload (original or processed)
        let fileToUpload = imageFile;
        
        // If processing is needed, convert/compress the image
        if (needsProcessing) {
            console.log(`Processing image: ${isHEIC ? 'HEIC conversion' : ''} ${isOldIOS ? 'older iOS device' : ''} ${isLargeFile ? 'large file' : ''}`);
            
            try {
                // Determine target size based on device
                const maxWidth = isOldIOS ? 1200 : 1800; // Smaller size for older iOS
                const quality = isOldIOS ? 0.7 : 0.8;    // Lower quality for older iOS
                
                // Process the image (handles both HEIC conversion and compression)
                fileToUpload = await compressImage(imageFile, maxWidth, quality);
                console.log(`Processed image size: ${Math.round(fileToUpload.size / 1024)} KB`);
                
                // If still too large for older iOS, compress further
                if (isOldIOS && fileToUpload.size > 1.5 * 1024 * 1024) {
                    console.log('Image still large, applying second-stage compression');
                    fileToUpload = await compressImage(fileToUpload, 900, 0.6);
                    console.log(`Final processed size: ${Math.round(fileToUpload.size / 1024)} KB`);
                }
            } catch (processingError) {
                console.error('Image processing failed, will try with original file:', processingError);
                // Fall back to original file if processing fails
                fileToUpload = imageFile;
            }
        }
        
        // Proceed with upload using the processed image
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
        
        // Generate URL with a 5-year expiry
        console.log("Generating permanent URL for the uploaded image");
        const { data: urlData, error: urlError } = await supabase.storage
            .from('prayer-diary')
            .createSignedUrl(filePath, 157680000); // 5-year expiry
        
        if (urlError) {
            console.error("URL generation failed:", urlError);
            throw urlError;
        }
        
        console.log('URL generated successfully');
        return urlData.signedUrl;
        
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

// Save the user's profile
async function saveProfile(e) {
    e.preventDefault();
    
    console.log('🔄 Profile save started');
    
    // Ensure no hidden form fields have required attribute
    disableHiddenRequiredFields();
    
    const submitBtn = e.submitter;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        // Get name from profile as it's now read-only
        const fullName = userProfile.full_name || currentUser.user_metadata?.full_name || currentUser.email || '';
        const prayerPoints = document.getElementById('profile-prayer-points').value.trim();
        const phoneNumber = document.getElementById('profile-phone').value.trim();
        const whatsappNumber = document.getElementById('profile-whatsapp').value.trim();
        
        // Get notification preferences
        const prayerUpdateNotification = document.querySelector('input[name="prayer-update-notification"]:checked').value;
        const urgentPrayerNotification = document.querySelector('input[name="urgent-prayer-notification"]:checked').value;
        
        // Keep push notification setting (hidden in UI)
        const notifyPush = document.getElementById('notify-push').checked;
        
        // Check if phone numbers are required but missing
        const phoneInput = document.getElementById('profile-phone');
        const whatsappInput = document.getElementById('profile-whatsapp');
        
        // Clear previous validation states
        phoneInput.classList.remove('is-invalid');
        whatsappInput.classList.remove('is-invalid');
        
        // Check SMS requirements
        const smsNeeded = (prayerUpdateNotification === 'sms' || urgentPrayerNotification === 'sms');
        if (smsNeeded && !phoneNumber) {
            phoneInput.classList.add('is-invalid');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return; // Stop form submission
        }
        
        // Check WhatsApp requirements
        const whatsappNeeded = (prayerUpdateNotification === 'whatsapp' || urgentPrayerNotification === 'whatsapp');
        if (whatsappNeeded && !whatsappNumber) {
            whatsappInput.classList.add('is-invalid');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return; // Stop form submission
        }
        
        // Check if user has accepted GDPR
        if (!userProfile.gdpr_accepted) {
            // Store the profile data and button for later
            profileDataToSave = {
                fullName,
                prayerPoints,
                phoneNumber,
                whatsappNumber,
                prayerUpdateNotification,
                urgentPrayerNotification,
                notifyPush,
                submitBtn,
                originalText
            };
            
            // Store submit button for later
            profileSubmitButton = submitBtn;
            
            // Show GDPR consent modal
            showGdprConsentModal();
            return;
        }
        
        // If we get here, user has already accepted GDPR
        await completeProfileSave({
            fullName,
            prayerPoints,
            phoneNumber,
            whatsappNumber,
            prayerUpdateNotification,
            urgentPrayerNotification,
            notifyPush,
            submitBtn,
            originalText
        });
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Error', `Failed to save profile: ${error.message}`);
        
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Show GDPR consent modal
function showGdprConsentModal() {
    // Get the modal element
    const modalElement = document.getElementById('gdpr-consent-modal');
    gdprModal = new bootstrap.Modal(modalElement);
    
    // Set up the event listeners
    document.getElementById('gdpr-consent-check').addEventListener('change', function() {
        document.getElementById('gdpr-consent-submit').disabled = !this.checked;
    });
    
    // Handle modal hidden event - ensure we clean up backdrop
    modalElement.addEventListener('hidden.bs.modal', function() {
        // Remove the backdrop manually if it's still present
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.parentNode.removeChild(backdrop);
        }
        // Restore body classes
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // Reset button state if user canceled
        if (profileDataToSave && profileDataToSave.submitBtn) {
            profileDataToSave.submitBtn.textContent = profileDataToSave.originalText;
            profileDataToSave.submitBtn.disabled = false;
        }
    });
    
    // Handle cancel button
    document.getElementById('gdpr-consent-cancel').addEventListener('click', function() {
        gdprModal.hide();
        // Reset button state
        if (profileDataToSave && profileDataToSave.submitBtn) {
            profileDataToSave.submitBtn.textContent = profileDataToSave.originalText;
            profileDataToSave.submitBtn.disabled = false;
            showNotification('Info', 'Profile save canceled. You must accept the data privacy notice to save your profile.');
        }
    });
    
    document.getElementById('gdpr-consent-submit').addEventListener('click', async function() {
        try {
            // Complete the profile save with GDPR consent
            if (profileDataToSave) {
                profileDataToSave.gdprAccepted = true;
                await completeProfileSave(profileDataToSave);
            }
        } finally {
            // Ensure modal is properly disposed
            gdprModal.hide();
            setTimeout(() => {
                gdprModal.dispose();
            }, 500);
        }
    });
    
    // Show the modal
    gdprModal.show();
}

// Function to extract filename from a Supabase storage URL
function extractFilenameFromURL(url) {
    if (!url) return null;
    
    try {
        // Extract the path component after the bucket name
        const matches = url.match(/\/storage\/v1\/object\/public\/prayer-diary\/([^?]+)/);
        if (matches && matches[1]) {
            return matches[1]; // This is the path relative to the bucket
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

// Complete profile save after GDPR check
async function completeProfileSave(data) {
    try {
        console.log('🔄 Starting profile save process');
        
        // Get current profile image URL (fallback)
        let profileImageUrl = userProfile.profile_image_url;
        const oldImageUrl = profileImageUrl; // Store the old URL for deletion later
        const profileImage = document.getElementById('profile-image').files[0];
        
        // Only process image upload if a new image was selected
        if (profileImage) {
            try {
                console.log('🖼️ Profile image detected, starting upload process');
                console.log(`📊 Image: ${profileImage.name}, ${profileImage.size} bytes, type: ${profileImage.type}`);
                
                // Use our simplified upload function
                profileImageUrl = await uploadProfileImage(profileImage, getUserId());
                
                // Update UI with the new image URL
                updateAllProfileImages(profileImageUrl);
                
            } catch (uploadError) {
                console.error('❌ Error in image upload process:', uploadError);
                showNotification('Warning', `Profile will be saved without the new image. Error: ${uploadError.message}`);
                // Keep using the existing image URL if upload failed
            }
        }
        
        // Save profile data regardless of image upload success
        console.log('📝 Saving profile data to database...');
        
        // Determine if GDPR was accepted in this save
        const gdprAccepted = data.gdprAccepted === true ? true : userProfile.gdpr_accepted || false;
        
        // Update the profile
        const { data: updateData, error } = await supabase
            .from('profiles')
            .update({
                full_name: data.fullName,
                prayer_points: data.prayerPoints,
                profile_image_url: profileImageUrl,
                phone_number: data.phoneNumber,
                whatsapp_number: data.whatsappNumber || data.phoneNumber, 
                prayer_update_notification_method: data.prayerUpdateNotification,
                urgent_prayer_notification_method: data.urgentPrayerNotification,
                notification_push: data.notifyPush,
                profile_set: true, // Mark profile as completed
                gdpr_accepted: gdprAccepted, // Set GDPR acceptance status
                updated_at: new Date().toISOString()
            })
            .eq('id', getUserId());
            
        if (error) {
            console.error('❌ Database update error:', error);
            throw error;
        }
        
        console.log('✅ Profile updated successfully and marked as set');
        
        // If we uploaded a new image successfully and we had an old image, delete the old one
        if (profileImage && oldImageUrl && profileImageUrl !== oldImageUrl) {
            try {
                const oldFilePath = extractFilenameFromURL(oldImageUrl);
                if (oldFilePath) {
                    console.log(`🗑️ Attempting to delete old profile image: ${oldFilePath}`);
                    
                    const { error: deleteError } = await supabase.storage
                        .from('prayer-diary')
                        .remove([oldFilePath]);
                    
                    if (deleteError) {
                        console.warn(`⚠️ Could not delete old profile image: ${deleteError.message}`);
                    } else {
                        console.log('✅ Old profile image deleted successfully');
                    }
                }
            } catch (deleteError) {
                console.warn('⚠️ Error during old image cleanup:', deleteError);
                // Don't throw this error - just log it since the profile was already saved
            }
        }
        
        // Refresh user profile
        await fetchUserProfile();
        
        showNotification('Success', 'Profile saved successfully!');
        
    } catch (error) {
        console.error('❌ Error saving profile:', error);
        showNotification('Error', `Failed to save profile: ${error.message}`);
    } finally {
        data.submitBtn.textContent = data.originalText;
        data.submitBtn.disabled = false;
        console.log('🏁 Profile save process completed');
    }
}