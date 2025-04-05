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
        
        // Populate form fields - full_name comes from auth user metadata and is read-only
        document.getElementById('profile-name').value = userProfile.full_name || currentUser.user_metadata?.full_name || currentUser.email || '';
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
        
        // Set profile preview
        updateProfilePreview();
        
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
            
            // Also update the card preview
            document.getElementById('preview-profile-image').src = e.target.result;
        };
        
        reader.readAsDataURL(fileInput.files[0]);
        previewName.textContent = fileInput.files[0].name;
    } else {
        previewImage.classList.add('is-hidden');
        previewName.textContent = 'No file selected';
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
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('prayer-diary')
                    .upload(filePath, profileImage);
                    
                if (uploadError) {
                    console.error('Profile image upload error:', uploadError);
                    
                    // Provide a user-friendly error message based on the error type
                    if (uploadError.statusCode === 403) {
                        throw new Error('Permission denied when uploading image. Your account may need approval first.');
                    } else {
                        throw uploadError;
                    }
                }
                
                console.log('Profile image uploaded successfully');
                
                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('prayer-diary')
                    .getPublicUrl(filePath);
                    
                profileImageUrl = publicUrl;
                console.log('Profile image URL:', profileImageUrl);
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