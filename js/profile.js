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
        
        // Populate form fields
        document.getElementById('profile-name').value = userProfile.full_name || '';
        document.getElementById('profile-prayer-points').value = userProfile.prayer_points || '';
        document.getElementById('profile-phone').value = userProfile.phone_number || '';
        document.getElementById('profile-whatsapp').value = userProfile.whatsapp_number || '';
        
        // Set notification checkboxes
        document.getElementById('notify-email').checked = userProfile.notification_email;
        document.getElementById('notify-sms').checked = userProfile.notification_sms;
        document.getElementById('notify-whatsapp').checked = userProfile.notification_whatsapp;
        document.getElementById('notify-push').checked = userProfile.notification_push;
        
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

// Save the user's profile
async function saveProfile(e) {
    e.preventDefault();
    
    const submitBtn = e.submitter;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        const fullName = document.getElementById('profile-name').value.trim();
        const prayerPoints = document.getElementById('profile-prayer-points').value.trim();
        const phoneNumber = document.getElementById('profile-phone').value.trim();
        const whatsappNumber = document.getElementById('profile-whatsapp').value.trim();
        
        const notifyEmail = document.getElementById('notify-email').checked;
        const notifySms = document.getElementById('notify-sms').checked;
        const notifyWhatsapp = document.getElementById('notify-whatsapp').checked;
        const notifyPush = document.getElementById('notify-push').checked;
        
        if (!fullName) {
            throw new Error('Please enter your full name');
        }
        
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
        
        // Update the profile
        const { data, error } = await supabase
            .from('profiles')
            .update({
                full_name: fullName,
                prayer_points: prayerPoints,
                profile_image_url: profileImageUrl,
                phone_number: phoneNumber,
                whatsapp_number: whatsappNumber || phoneNumber, // Use phone number as default if WhatsApp not provided
                notification_email: notifyEmail,
                notification_sms: notifySms,
                notification_whatsapp: notifyWhatsapp,
                notification_push: notifyPush,
                profile_set: true, // Mark profile as completed
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
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}