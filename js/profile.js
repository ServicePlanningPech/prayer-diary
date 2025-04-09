// User Profile Module

// Load and display the user's profile
async function loadUserProfile() {
    if (!isLoggedIn()) return;
    
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
            console.log("Refreshed user data for profile:", currentUser.email);
        }
        
        // Debug what values we have available
        console.log("Profile data available for user:", {
            "profile.full_name": userProfile.full_name,
            "user_metadata": currentUser.user_metadata,
            "email": currentUser.email,
            "profile_image_url": userProfile.profile_image_url
        });
        
        // Initialize profile image properly with a signed URL
        if (userProfile.profile_image_url) {
            // Start with placeholder while we generate the signed URL
            const previewImage = document.getElementById('preview-profile-image');
            if (previewImage) {
                previewImage.src = 'img/placeholder-profile.png';
            }
            
            // Extract the path from the stored profile_image_url
            let imagePath = '';
            const originalUrl = userProfile.profile_image_url;
            
            if (originalUrl.includes('/storage/v1/object/public/')) {
                // It's a public URL format - extract the path
                const pathStart = originalUrl.indexOf('/prayer-diary/');
                if (pathStart > -1) {
                    imagePath = originalUrl.substring(pathStart + '/prayer-diary/'.length);
                    // Remove any query params
                    if (imagePath.includes('?')) {
                        imagePath = imagePath.split('?')[0];
                    }
                }
            } else if (originalUrl.includes('/storage/v1/object/sign/')) {
                // It's already a signed URL - extract the path
                const match = originalUrl.match(/\/prayer-diary\/([^?]+)/);
                if (match && match[1]) {
                    imagePath = match[1];
                }
            } else {
                // Try to extract from any URL format
                const match = originalUrl.match(/\/prayer-diary\/([^?]+)/);
                if (match && match[1]) {
                    imagePath = match[1];
                }
            }
            
            console.log("Extracted image path:", imagePath);
            
            if (imagePath) {
                try {
                    const { data, error } = await supabase.storage
                        .from('prayer-diary')
                        .createSignedUrl(imagePath, 3600); // 1 hour validity
                    
                    if (error) {
                        console.error('Error creating signed URL for profile image:', error);
                    } else {
                        console.log("Setting profile image to signed URL:", data.signedUrl);
                        
                        // Update all profile images with the signed URL
                        updateAllProfileImages(data.signedUrl);
                    }
                } catch (e) {
                    console.error('Exception generating signed URL:', e);
                }
            } else {
                console.warn('Could not extract image path from profile URL:', originalUrl);
            }
        }
        
        // Get the name from the most reliable source
        const userName = userProfile.full_name || 
                        (currentUser.user_metadata ? currentUser.user_metadata.full_name : null) || 
                        currentUser.email || 
                        "Unknown User";
                        
        console.log("Setting profile name field to:", userName);
        
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
        
        // Log GDPR acceptance status
        console.log('GDPR accepted:', userProfile.gdpr_accepted);
        
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
            
            // Add debugging for images
            addImageDebugHandlers();
            
            // Log profile image URL for debugging
            console.log('Profile image URL:', userProfile.profile_image_url);
            
            // Skip image validation and directly use the signed URL
            if (userProfile.profile_image_url) {
                console.log('Using signed URL directly for profile image');
                
                // Directly use the URL we got from createSignedUrl earlier
                // This is the same approach used in admin.js that works reliably
                if (data && data.signedUrl) {
                    console.log('Using verified signed URL for profile image');
                    updateAllProfileImages(data.signedUrl);
                } else if (userProfile.profile_image_url) {
                    // Fallback to the original URL if we don't have a signed URL
                    console.log('Using original profile URL');
                    updateAllProfileImages(userProfile.profile_image_url);
                }
            }
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
    }
}

// Handle profile image selection with the new button-based approach
function handleProfileImageChange() {
    const fileInput = document.getElementById('profile-image');
    const previewImage = document.getElementById('profile-image-preview');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            
            // Also update the card preview
            document.getElementById('preview-profile-image').src = e.target.result;
        };
        
        reader.readAsDataURL(fileInput.files[0]);
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
        
        console.log('Profile image button setup complete');
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
    
    // Setup the profile image button
    setupProfileImageButton();
    
    console.log('Notification method handlers setup complete');
}

// Update phone fields visibility based on notification method selections
function updatePhoneFieldsVisibility() {
    const prayerUpdateMethod = document.querySelector('input[name="prayer-update-notification"]:checked').value;
    const urgentPrayerMethod = document.querySelector('input[name="urgent-prayer-notification"]:checked').value;
    
    const phoneNumbersSection = document.getElementById('phone-numbers-section');
    const smsContainer = document.getElementById('sms-phone-container');
    const whatsappContainer = document.getElementById('whatsapp-phone-container');
    const noPhoneMessage = document.getElementById('no-phone-needed-message');
    
    // Check if SMS is selected for either notification type
    const smsNeeded = (prayerUpdateMethod === 'sms' || urgentPrayerMethod === 'sms');
    
    // Check if WhatsApp is selected for either notification type
    const whatsappNeeded = (prayerUpdateMethod === 'whatsapp' || urgentPrayerMethod === 'whatsapp');
    
    // Hide the entire phone numbers section if neither SMS nor WhatsApp is needed
    if (!smsNeeded && !whatsappNeeded) {
        phoneNumbersSection.classList.add('d-none');
        return; // Exit early since the whole section is hidden
    } else {
        phoneNumbersSection.classList.remove('d-none');
    }
    
    // Update visibility of SMS container
    if (smsNeeded) {
        smsContainer.classList.remove('d-none');
    } else {
        smsContainer.classList.add('d-none');
    }
    
    // Update visibility of WhatsApp container
    if (whatsappNeeded) {
        whatsappContainer.classList.remove('d-none');
    } else {
        whatsappContainer.classList.add('d-none');
    }
    
    // Show/hide the "no phone needed" message
    if (smsNeeded || whatsappNeeded) {
        noPhoneMessage.classList.add('d-none');
    } else {
        noPhoneMessage.classList.remove('d-none');
    }
}

// Add debugging for profile image loading issues
function addImageDebugHandlers() {
    // Find all image elements that might be loading profile images
    const profileImages = [
        document.getElementById('profile-image-preview'),
        document.getElementById('preview-profile-image')
    ];
    
    profileImages.forEach(img => {
        if (img) {
            img.addEventListener('error', function(e) {
                console.error('Image load error:', e);
                console.log('Failed to load image:', this.src);
                
                // Add visual error indicator
                this.style.border = '2px dashed red';
                
                // Try to load with cache busting to see if it's a caching issue
                const originalSrc = this.src;
                if (!originalSrc.includes('?nocache=')) {
                    setTimeout(() => {
                        this.src = originalSrc + '?nocache=' + Date.now();
                        console.log('Retrying with cache busting:', this.src);
                    }, 1000);
                }
            });
            
            img.addEventListener('load', function() {
                console.log('Image loaded successfully:', this.src);
                // Clear any error indicators
                this.style.border = '';
            });
        }
    });
}

// Helper function to update all profile images in the UI
function updateAllProfileImages(imageUrl) {
    console.log('Updating all profile images to:', imageUrl);
    
    // List of all elements that should show the profile image
    const imageElements = [
        document.getElementById('preview-profile-image'),       // Prayer card preview
        document.getElementById('profile-image-preview')        // Upload preview
    ];
    
    // Update each element if it exists
    imageElements.forEach(img => {
        if (img) {
            console.log('Updating image element:', img.id);
            img.src = imageUrl;
            img.style.border = ''; // Clear any error borders
            
            // Force browser to reload the image
            img.setAttribute('data-timestamp', Date.now());
        }
    });
    
    // Also store this URL for future use
    if (userProfile && imageUrl !== 'img/placeholder-profile.png') {
        // Update the working URL in memory
        userProfile._workingImageUrl = imageUrl;
    }
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

// Save the user's profile
async function saveProfile(e) {
    e.preventDefault();
    
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

// Complete profile save after GDPR check
async function completeProfileSave(data) {
    try {
        // Handle profile image upload
        let profileImageUrl = userProfile.profile_image_url;
        const profileImage = document.getElementById('profile-image').files[0];
        
        if (profileImage) {
            try {
                console.log('Uploading profile image...');
                const fileExt = profileImage.name.split('.').pop();
                const fileName = `${getUserId()}_${Date.now()}.${fileExt}`;
                const filePath = `profiles/${fileName}`;
                
                console.log('Storage upload parameters:', {
                    userId: getUserId(),
                    fileName: fileName,
                    filePath: filePath,
                    fileSize: profileImage.size,
                    fileType: profileImage.type
                });
                
                // Detailed logging for debugging
                console.log('Current user:', currentUser);
                console.log('Auth JWT:', await supabase.auth.getSession().then(d => d.data.session?.access_token?.substring(0, 20) + '...'));
                
                // First check if bucket exists and is accessible
                try {
                    const { data: bucketData, error: bucketError } = await supabase.storage
                        .getBucket('prayer-diary');
                    
                    console.log('Bucket check result:', bucketError ? 'Error' : 'Success', 
                        bucketError ? bucketError : bucketData);
                } catch (bucketCheckError) {
                    console.error('Error checking bucket:', bucketCheckError);
                }
                
                // Attempt upload with detailed error handling
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('prayer-diary')
                    .upload(filePath, profileImage, {
                        cacheControl: 'no-cache',
                        upsert: true
                    });
                    
                if (uploadError) {
                    console.error('Profile image upload error:', uploadError);
                    console.error('Error details:', {
                        message: uploadError.message,
                        statusCode: uploadError.statusCode,
                        error: uploadError.error
                    });
                    
                    // Provide a user-friendly error message based on the error type
                    if (uploadError.statusCode === 403) {
                        throw new Error('Permission denied when uploading image. Your account may need approval first.');
                    } else {
                        throw uploadError;
                    }
                }
                
                console.log('Profile image uploaded successfully:', uploadData);
                
                // Get public URL - try using createSignedUrl instead since we're having issues with getPublicUrl
                try {
                    // Only use signed URLs for authenticated-only access
                    // This ensures the images are only accessible to logged-in users
                    const { data: signedData, error: signedError } = await supabase.storage
                        .from('prayer-diary')
                        .createSignedUrl(filePath, 86400); // 24-hour expiry - balance between security and convenience
                    
                    if (signedError) {
                        console.error('Error creating signed URL:', signedError);
                        throw signedError;
                    }
                    
                    profileImageUrl = signedData.signedUrl;
                    console.log('Using signed URL (24-hour validity):', profileImageUrl);
                    
                    // Immediately test if this URL works
                    const testImg = new Image();
                    testImg.onload = function() {
                        console.log('✅ Upload image URL works immediately:', profileImageUrl);
                        // Immediately update all profile images in the UI with working URL
                        updateAllProfileImages(profileImageUrl);
                    };
                    testImg.onerror = function() {
                        console.log('❌ Upload image URL failed immediate test, trying cleaned version');
                        // Try without query parameters
                        if (profileImageUrl.includes('?')) {
                            const cleanUrl = profileImageUrl.split('?')[0];
                            updateAllProfileImages(cleanUrl);
                        }
                    };
                    testImg.src = profileImageUrl;
                    
                } catch (urlError) {
                    console.error('Error getting URLs:', urlError);
                    
                    // Last resort - manually construct URL
                    profileImageUrl = `${supabase.storageUrl}/object/public/prayer-diary/${filePath}`;
                    console.log('Using manually constructed URL (last resort):', profileImageUrl);
                }
                
                // Test the URL before using it
                try {
                    const testResult = await fetch(profileImageUrl, { method: 'HEAD' });
                    console.log('URL test result:', testResult.status, testResult.ok);
                } catch (urlTestError) {
                    console.error('Error testing URL:', urlTestError);
                }
            } catch (uploadErr) {
                console.error('Error in image upload process:', uploadErr);
                // Continue with profile update even if image upload fails
                showNotification('Warning', `Profile saved, but image upload failed: ${uploadErr.message}`);
            }
        }
        
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
                whatsapp_number: data.whatsappNumber || data.phoneNumber, // Use phone number as default if WhatsApp not provided
                prayer_update_notification_method: data.prayerUpdateNotification,
                urgent_prayer_notification_method: data.urgentPrayerNotification,
                notification_push: data.notifyPush,
                profile_set: true, // Mark profile as completed
                gdpr_accepted: gdprAccepted, // Set GDPR acceptance status
                updated_at: new Date().toISOString()
            })
            .eq('id', getUserId());
            
        if (error) throw error;
        
        console.log('Profile updated successfully and marked as set');
        
        // Refresh user profile
        await fetchUserProfile();
        
        showNotification('Success', 'Profile saved successfully!');
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Error', `Failed to save profile: ${error.message}`);
    } finally {
        data.submitBtn.textContent = data.originalText;
        data.submitBtn.disabled = false;
    }
}