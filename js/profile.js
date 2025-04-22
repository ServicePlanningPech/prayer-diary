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
	
	 await window.waitForAuthStability();
    
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
            profileStatus.classList.remove('d-none');
            profileStatus.classList.remove('alert-danger');
            profileStatus.classList.add('alert-warning');
            profileStatus.innerHTML = `
                <p class="mb-0">Your account is pending approval by an administrator. You'll receive an email when your account is approved.</p>
            `;
        } else if (userProfile.approval_state === 'Rejected') {
            profileStatus.classList.remove('d-none');
            profileStatus.classList.remove('alert-warning');
            profileStatus.classList.add('alert-danger');
            profileStatus.innerHTML = `
                <p class="mb-0">Your account has been rejected by an administrator. Please contact the church office for more information.</p>
            `;
        } else {
            profileStatus.classList.add('d-none');
        }
        
        // Set up form submission
        document.getElementById('profile-form').addEventListener('submit', saveProfile);
        
        // Set up preview update when fields change
        document.getElementById('profile-name').addEventListener('input', updateProfilePreview);
        document.getElementById('profile-prayer-points').addEventListener('input', updateProfilePreview);
        
        // Set up profile image handler (we now use the same handler for all devices)
        setupProfileImageHandlers();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Error', `Unable to load your profile: ${error.message}`);
    } finally {
        // Reset the flag to allow future profile loads
        profileLoadInProgress = false;
    }
}

// Add this to profile.js

// Helper function to set up the profile image button and file input
function setupProfileImageHandlers() {
    const selectButton = document.getElementById('select-profile-image');
    const fileInput = document.getElementById('profile-image');
    
    // First add event listener to the file input
    if (fileInput) {
        fileInput.addEventListener('change', handleProfileImageChange);
    }
    
    if (selectButton && fileInput) {
        // Remove any existing event listeners first to prevent duplicates
        const newSelectButton = selectButton.cloneNode(true);
        selectButton.parentNode.replaceChild(newSelectButton, selectButton);
        
        // Check if this is an Android device
        const isAndroid = /Android/.test(navigator.userAgent);
        
        if (isAndroid) {
            // For Android, show options when the button is clicked
            newSelectButton.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent default button behavior
                showPhotoOptions();
            });
        } else {
            // For other devices, use standard behavior
            newSelectButton.addEventListener('click', function() {
                fileInput.click();
            });
        }
    }
}

// Function to show photo options modal for Android
function showPhotoOptions() {
    // Create modal HTML if it doesn't exist yet
    if (!document.getElementById('photo-options-modal')) {
        const modalHtml = `
        <div class="modal fade" id="photo-options-modal" tabindex="-1" aria-labelledby="photo-options-title" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="photo-options-title">Select Image Source</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="d-grid gap-3">
                            <button type="button" class="btn btn-primary" id="take-photo-btn">
                                <i class="bi bi-camera-fill me-2"></i>Take Photo
                            </button>
                            <button type="button" class="btn btn-secondary" id="choose-gallery-btn">
                                <i class="bi bi-images me-2"></i>Choose from Gallery
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // Append modal to the body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // Set up event listeners for the modal buttons
        document.getElementById('take-photo-btn').addEventListener('click', function() {
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('photo-options-modal'));
            modal.hide();
            
            // Set capture attribute and trigger camera
            triggerCameraCapture();
        });
        
        document.getElementById('choose-gallery-btn').addEventListener('click', function() {
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('photo-options-modal'));
            modal.hide();
            
            // Trigger standard file selection
            triggerGallerySelection();
        });
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('photo-options-modal'));
    modal.show();
}

// Function to trigger camera capture
function triggerCameraCapture() {
    const fileInput = document.getElementById('profile-image');
    
    // First, clone the file input to remove any existing event listeners
    const newFileInput = fileInput.cloneNode(false);
    
    // Set capture attribute to camera (this makes it use the camera on Android)
    newFileInput.setAttribute('capture', 'camera');
    newFileInput.setAttribute('accept', 'image/*');
    
    // Re-add the change event listener
    newFileInput.addEventListener('change', handleProfileImageChange);
    
    // Replace the original file input
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    // Click the file input to open the camera
    newFileInput.click();
}

// Function to trigger gallery selection
function triggerGallerySelection() {
    const fileInput = document.getElementById('profile-image');
    
    // First, clone the file input to remove any existing attributes from camera mode
    const newFileInput = fileInput.cloneNode(false);
    
    // Remove any capture attribute that might be present
    newFileInput.removeAttribute('capture');
    
    // Set accept to all images
    newFileInput.setAttribute('accept', 'image/*');
    
    // Re-add the change event listener
    newFileInput.addEventListener('change', handleProfileImageChange);
    
    // Replace the original file input
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    // Click the file input to open the gallery
    newFileInput.click();
}

// Handle profile image selection
function handleProfileImageChange() {
    const fileInput = document.getElementById('profile-image');
    const previewImage = document.getElementById('profile-image-preview');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Debug image characteristics
        console.log('Selected image details:', {
            name: file.name,
            type: file.type,
            size: Math.round(file.size/1024) + ' KB',
            lastModified: new Date(file.lastModified).toISOString()
        });
        
        // Always use the createLightweightPreview
        createLightweightPreview(file, previewImage);
    }
}

// Create a lightweight preview that uses createObjectURL
function createLightweightPreview(file, previewImage) {
    console.log('Creating lightweight preview');
    
    try {
        const objectUrl = URL.createObjectURL(file);
        
        // Update both preview elements
        previewImage.src = objectUrl;
        document.getElementById('preview-profile-image').src = objectUrl;
        
        // Clean up the URL after the image loads to prevent memory leaks
        previewImage.onload = () => {
            console.log('Preview image loaded successfully');
            // Schedule cleanup for later
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

// Set up notification method change handlers
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
                await updateProfileViaEdgeFunction(profileDataToSave);
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
        
        // Prepare profile data object
        const profileData = {
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
        
        // Check if user has accepted GDPR
        if (!userProfile.gdpr_accepted) {
            // Store the profile data and button for later
            profileDataToSave = profileData;
            
            // Store submit button for later
            profileSubmitButton = submitBtn;
            
            // Show GDPR consent modal
            showGdprConsentModal();
            return;
        }
        
        // If we get here, user has already accepted GDPR
        await updateProfileViaEdgeFunction(profileData);
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Error', `Failed to save profile: ${error.message}`);
        
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Update profile via Edge Function with universal page refresh
async function updateProfileViaEdgeFunction(data) {
    // Set a timeout to ensure button state is always restored
    const TIMEOUT_MS = 15000; // 15 seconds
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Update timeout exceeded')), TIMEOUT_MS);
    });
    
    // Create a timer to reset the button state regardless of outcome
    const buttonResetTimer = setTimeout(() => {
        console.log('⏰ Safety timer: resetting button state');
        data.submitBtn.textContent = data.originalText;
        data.submitBtn.disabled = false;
    }, TIMEOUT_MS + 1000); // 1 second after the timeout
    
    try {
        console.log('🔄 Starting profile update via Edge Function');
        
        // Get current profile image URL (fallback)
        const oldImageUrl = userProfile.profile_image_url || null;
        const profileImage = document.getElementById('profile-image').files[0];
        
        // Determine if GDPR was accepted in this save
        const gdprAccepted = data.gdprAccepted === true ? true : userProfile.gdpr_accepted || false;
        
        // Prepare profile data for the Edge Function
        const profileDataForUpdate = {
            full_name: data.fullName,
            prayer_points: data.prayerPoints,
            profile_image_url: oldImageUrl, // Will be updated by Edge Function if a new image is provided
            phone_number: data.phoneNumber,
            whatsapp_number: data.whatsappNumber || data.phoneNumber, 
            prayer_update_notification_method: data.prayerUpdateNotification,
            urgent_prayer_notification_method: data.urgentPrayerNotification,
            notification_push: data.notifyPush,
            profile_set: true, // Mark profile as completed
            gdpr_accepted: gdprAccepted, // Set GDPR acceptance status
            updated_at: new Date().toISOString()
        };
        
        // Process the image if one is selected
        let imageData = null;
        if (profileImage) {
            try {
                console.log('🖼️ Profile image detected, preparing for upload');
                // Convert to base64
                imageData = await fileToBase64(profileImage);
            } catch (imageError) {
                console.error('❌ Error preparing image:', imageError);
                // Continue without image - the Edge Function will handle profile update only
            }
        }
        
        // Define the Edge Function URL
        const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/update-profile`;
        
        // Prepare the payload for the Edge Function
        const payload = {
            profileData: profileDataForUpdate,
            imageData: imageData,
            userId: getUserId(),
            oldImageUrl: oldImageUrl
        };
        
        // Get the auth token
        const authToken = window.authToken || await getAuthToken();
        
        console.log('📡 Sending data to Edge Function...');
        
        // Use Promise.race to implement timeout
        const response = await Promise.race([
            fetch(edgeFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            }),
            timeoutPromise
        ]);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Edge Function error:', response.status, errorText);
            throw new Error(`Update failed (${response.status}): ${errorText}`);
        }
        
        // Parse the response
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error updating profile');
        }
        
        console.log('✅ Profile updated successfully via Edge Function');
        
        // If the image was updated, update the UI
        if (result.imageUrl) {
            updateAllProfileImages(result.imageUrl);
        }
        
        // Use the profile data returned from the Edge Function
        // instead of making another Supabase SDK call that could stall
        if (result.profile) {
            userProfile = result.profile;
            console.log('📊 Updated profile data from Edge Function:', userProfile);
        }
        
        // Show a success notification
        showNotification('Success', 'Profile saved successfully!');
        
        // UNIVERSAL REFRESH: Apply to all devices (no iOS check)
        console.log('📱 Applying universal page refresh after profile update');
        
        // Show a notification about the refresh
        setTimeout(() => {
            showNotification('Refreshing', 'Updating app to apply changes...', 'info');
            
            // Store a marker in sessionStorage to indicate we're coming back from a refresh
            // This allows us to restore state or show a message
            sessionStorage.setItem('profileSaved', 'true');
            
            // Save current view to restore after refresh
            const currentView = document.querySelector('.view-content:not(.d-none)')?.id || '';
            if (currentView) {
                sessionStorage.setItem('lastView', currentView);
            }
            
            // Give time for the notification to be seen, then refresh
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error in updateProfileViaEdgeFunction:', error);
        showNotification('Error', `Failed to save profile: ${error.message}`);
    } finally {
        // Clear the safety timer since we're in the finally block
        clearTimeout(buttonResetTimer);
        
        // Reset button state
        data.submitBtn.textContent = data.originalText;
        data.submitBtn.disabled = false;
        console.log('🏁 Profile update process completed');
    }
}



// Helper function to get auth token
async function getAuthToken() {
	 await window.waitForAuthStability();
    try {
        const { data } = await supabase.auth.getSession();
        return data?.session?.access_token;
    } catch (error) {
        console.error('Error getting auth token:', error);
        throw new Error('Unable to get authentication token');
    }
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}