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
        console.log("Profile data available for name:", {
            "profile.full_name": userProfile.full_name,
            "user_metadata": currentUser.user_metadata,
            "email": currentUser.email
        });
        
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
            
            // Test direct image access with GET instead of HEAD
            if (userProfile.profile_image_url) {
                // DO NOT use HEAD requests - they often fail with Supabase storage
                // Instead use a GET with proper credentials and no-cors mode
                fetch(userProfile.profile_image_url, { 
                    method: 'GET',
                    mode: 'no-cors', // This is crucial for avoiding CORS issues
                    cache: 'no-store',
                    credentials: 'omit'
                })
                .then(response => {
                    console.log('Image fetch seems successful (no-cors mode)');
                    // Note: With no-cors mode, we can't check status, but if it didn't throw, it's likely OK
                })
                .catch(error => {
                    console.error('Error testing image URL:', error);
                    
                    // If original URL fails, try without query parameters
                    if (userProfile.profile_image_url.includes('?')) {
                        const cleanUrl = userProfile.profile_image_url.split('?')[0];
                        console.log('Trying clean URL without parameters:', cleanUrl);
                        
                        // Update the user's profile image in the UI with this cleaned URL
                        const previewImage = document.getElementById('preview-profile-image');
                        if (previewImage) {
                            previewImage.src = cleanUrl;
                        }
                    }
                });
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

// Handle profile image selection
function handleProfileImageChange() {
    const fileInput = document.getElementById('profile-image');
    const previewImage = document.getElementById('profile-image-preview');
    const previewName = document.getElementById('profile-image-name');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.classList.remove('is-hidden');
            previewImage.classList.remove('d-none');
            
            // Also update the card preview
            document.getElementById('preview-profile-image').src = e.target.result;
        };
        
        reader.readAsDataURL(fileInput.files[0]);
        previewName.textContent = fileInput.files[0].name;
    } else {
        previewImage.classList.add('is-hidden');
        previewImage.classList.add('d-none');
        previewName.textContent = 'No file selected';
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
            });
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
                    // Try signed URL first as it's more reliable
                    const { data: signedData, error: signedError } = await supabase.storage
                        .from('prayer-diary')
                        .createSignedUrl(filePath, 31536000); // 1 year expiry
                    
                    if (signedError) {
                        console.error('Error creating signed URL:', signedError);
                        
                        // Fall back to public URL
                        const { data: urlData } = supabase.storage
                            .from('prayer-diary')
                            .getPublicUrl(filePath);
                        
                        profileImageUrl = urlData.publicUrl;
                        console.log('Using public URL (fallback):', profileImageUrl);
                    } else {
                        profileImageUrl = signedData.signedUrl;
                        console.log('Using signed URL (1 year validity):', profileImageUrl);
                    }
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