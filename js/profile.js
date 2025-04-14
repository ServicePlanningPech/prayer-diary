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

// Handle profile image selection with the new button-based approach
function handleProfileImageChange() {
    const fileInput = document.getElementById('profile-image');
    const previewImage = document.getElementById('profile-image-preview');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Debug image characteristics - useful for troubleshooting iOS issues
        console.log('Selected image details:', {
            name: file.name,
            type: file.type,
            size: file.size + ' bytes (' + Math.round(file.size/1024) + ' KB)',
            lastModified: new Date(file.lastModified).toISOString()
        });
        
        // Check if it's potentially from an iOS device camera
        const isIOSCamera = /iPhone|iPad|iPod/i.test(navigator.userAgent) && 
                            (file.type === 'image/heic' || 
                             file.type === 'image/heif' || 
                             file.size > 5000000); // Over 5MB is suspicious
        
        if (isIOSCamera) {
            console.warn('⚠️ Detected likely iOS camera image. These can cause issues due to size/format.');
            console.log('Consider adding image resizing for iOS camera photos');
        }
        
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

// Image processing utilities for iOS
function createImageProcessingStatus() {
    // Create a temporary processing indicator for slow operations
    const statusDiv = document.createElement('div');
    statusDiv.id = 'image-processing-status';
    statusDiv.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 9999;
        font-size: 14px;
        text-align: center;
        max-width: 90%;
    `;
    
    // Add it to the document
    document.body.appendChild(statusDiv);
    
    return {
        update: (message) => {
            console.log('Image processing status:', message);
            statusDiv.textContent = message;
            statusDiv.style.display = 'block';
        },
        remove: () => {
            statusDiv.style.display = 'none';
            if (statusDiv.parentNode) {
                statusDiv.parentNode.removeChild(statusDiv);
            }
        }
    };
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

// Complete profile save after GDPR check
async function completeProfileSave(data) {
    try {
        console.log('🔄 Starting profile save process');
        
        // Handle profile image upload
        let profileImageUrl = userProfile.profile_image_url;
        const profileImage = document.getElementById('profile-image').files[0];
        
        if (profileImage) {
            try {
                console.log('🖼️ Profile image detected, starting upload process');
                console.log(`📊 Image: ${profileImage.name}, ${profileImage.size} bytes, type: ${profileImage.type}`);
                
                // Delete the old profile image if it exists
                if (profileImageUrl) {
                    try {
                        console.log('🗑️ Attempting to delete old profile image');
                        
                        // Extract the filepath from the URL
                        // The URL format is typically like: https://xxx.supabase.co/storage/v1/object/public/prayer-diary/profiles/filename.jpg
                        // Or with a signed URL: https://xxx.supabase.co/storage/v1/object/sign/prayer-diary/profiles/filename.jpg?token=xxx
                        let oldFilePath = '';
                        
                        // First check if it's a signed URL (contains 'sign' in the path)
                        if (profileImageUrl.includes('/sign/')) {
                            // Extract path between '/sign/prayer-diary/' and the query string
                            const pathMatch = profileImageUrl.match(/\/sign\/prayer-diary\/([^?]+)/);
                            if (pathMatch && pathMatch[1]) {
                                oldFilePath = pathMatch[1];
                            }
                        } else if (profileImageUrl.includes('/public/prayer-diary/')) {
                            // Extract path between '/public/prayer-diary/' and the end or query string
                            const pathMatch = profileImageUrl.match(/\/public\/prayer-diary\/([^?]+)/);
                            if (pathMatch && pathMatch[1]) {
                                oldFilePath = pathMatch[1];
                            }
                        }
                        
                        // If we found a valid path, delete the file
                        if (oldFilePath) {
                            console.log(`🗑️ Deleting old profile image: ${oldFilePath}`);
                            const { error: deleteError } = await supabase.storage
                                .from('prayer-diary')
                                .remove([oldFilePath]);
                                
                            if (deleteError) {
                                console.warn('⚠️ Could not delete old profile image:', deleteError);
                                // Continue with upload even if delete fails
                            } else {
                                console.log('✅ Old profile image deleted successfully');
                            }
                        } else {
                            console.warn('⚠️ Could not parse old image URL for deletion:', profileImageUrl);
                        }
                    } catch (deleteError) {
                        console.warn('⚠️ Error deleting old profile image:', deleteError);
                        // Continue with upload even if delete fails
                    }
                }
                
                // Create an indicator for long-running operations
                const status = createImageProcessingStatus();
                status.update("Preparing image for upload...");
                
                // Check for large iOS images that might need special handling
                const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                const needsResizing = profileImage.size > 1000000; // > 1MB
                
                let imageToUpload = profileImage;
                let resizedSuccessfully = false;
                
                // For iOS or large images, try to resize to reduce issues
                if (isIOSDevice || needsResizing) {
                    status.update("Processing large image... (iOS resizing)");
                    console.log(`⚠️ Large image detected (${Math.round(profileImage.size/1024)} KB), attempting to resize`);
                    
                    try {
                        // Use a more robust approach for image loading and resizing
                        status.update("Loading image for resizing...");
                        
                        // Create an offscreen canvas to resize the image
                        const img = new Image();
                        
                        // Create a promise with timeout to handle the image loading
                        const imageLoaded = new Promise((resolve, reject) => {
                            // Set a timeout to catch hanging loads
                            const timeout = setTimeout(() => {
                                reject(new Error("Image load timeout - taking too long"));
                            }, 15000); // 15 second timeout
                            
                            img.onload = () => {
                                clearTimeout(timeout);
                                resolve();
                            };
                            
                            img.onerror = (e) => {
                                clearTimeout(timeout);
                                console.error("Image load error:", e);
                                reject(new Error("Failed to load image for resizing"));
                            };
                            
                            // Try to read the image using a safe approach
                            try {
                                const objectUrl = URL.createObjectURL(profileImage);
                                img.src = objectUrl;
                                console.log("Created object URL for image:", objectUrl);
                            } catch (urlError) {
                                clearTimeout(timeout);
                                console.error("Error creating object URL:", urlError);
                                reject(urlError);
                            }
                        });
                        
                        try {
                            // Wait for image to load with timeout protection
                            await Promise.race([
                                imageLoaded,
                                new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error("Image load timed out")), 20000)
                                )
                            ]);
                            
                            status.update("Resizing image...");
                            console.log(`Image loaded successfully. Original dimensions: ${img.width}x${img.height}`);
                            
                            // Calculate new dimensions - max 1200px width/height
                            const MAX_SIZE = 1200;
                            let width = img.width;
                            let height = img.height;
                            
                            if (width > MAX_SIZE || height > MAX_SIZE) {
                                if (width > height) {
                                    height = Math.round(height * (MAX_SIZE / width));
                                    width = MAX_SIZE;
                                } else {
                                    width = Math.round(width * (MAX_SIZE / height));
                                    height = MAX_SIZE;
                                }
                            }
                            
                            // Create canvas for resizing
                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            status.update("Converting image...");
                            
                            // Convert to a reasonable quality JPEG
                            const resizedBlob = await new Promise(resolve => {
                                canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85);
                            });
                            
                            if (resizedBlob) {
                                console.log(`✅ Image resized successfully: ${Math.round(resizedBlob.size/1024)} KB (was ${Math.round(profileImage.size/1024)} KB)`);
                                
                                // Create a File object from the Blob
                                imageToUpload = new File([resizedBlob], profileImage.name.replace(/\.[^.]+$/, '.jpg'), {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                
                                resizedSuccessfully = true;
                            } else {
                                console.error('❌ Resizing failed: Could not create blob');
                            }
                        } catch (resizeError) {
                            console.error('❌ Error during image resize:', resizeError);
                        } finally {
                            // Clean up object URL
                            URL.revokeObjectURL(img.src);
                        }
                    } catch (err) {
                        console.error('❌ Exception during image processing:', err);
                    }
                }
                
                // Update status
                status.update(resizedSuccessfully ? 
                    "Image processed, uploading..." :
                    "Uploading original image...");
                
                // Prepare file name and path
                const fileExt = resizedSuccessfully ? 'jpg' : imageToUpload.name.split('.').pop();
                const fileName = `${getUserId()}_${Date.now()}.${fileExt}`;
                const filePath = `profiles/${fileName}`;
                
                // Log upload details
                console.log('📤 Storage upload parameters:', {
                    userId: getUserId(),
                    fileName: fileName,
                    filePath: filePath,
                    fileSize: imageToUpload.size,
                    fileType: imageToUpload.type,
                    resized: resizedSuccessfully
                });
                
                try {
                    // Attempt upload with retry logic and better error handling
                    status.update("Uploading image to server...");

                    let uploadAttempts = 0;
                    const maxAttempts = 3;
                    let uploadData = null;
                    let uploadError = null;
                    let uploadDuration = 0;

                    while (uploadAttempts < maxAttempts) {
                        uploadAttempts++;
                        
                        try {
                            console.log(`📤 Upload attempt ${uploadAttempts} of ${maxAttempts}...`);
                            status.update(`Uploading image to server (attempt ${uploadAttempts})...`);
                            
                            const uploadStartTime = Date.now();
                            
                            // Set a timeout to detect stalled uploads
                            const uploadPromise = supabase.storage
                                .from('prayer-diary')
                                .upload(filePath, imageToUpload, {
                                    cacheControl: 'no-cache',
                                    upsert: true
                                });
                                
                            // Race the upload against a timeout
                            const uploadResult = await Promise.race([
                                uploadPromise,
                                new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error('Upload timeout - server not responding')), 30000)
                                )
                            ]);
                            
                            uploadData = uploadResult.data;
                            uploadError = uploadResult.error;
                            uploadDuration = Date.now() - uploadStartTime;
                            
                            console.log(`⏱️ Upload attempt ${uploadAttempts} took ${uploadDuration}ms`);
                            
                            if (!uploadError) {
                                console.log('✅ Profile image uploaded successfully:', uploadData);
                                status.update("Upload successful! Generating URL...");
                                break; // Success - exit the retry loop
                            } else {
                                console.error(`❌ Upload attempt ${uploadAttempts} failed:`, uploadError);
                                
                                if (uploadAttempts < maxAttempts) {
                                    // Wait before retrying (500ms, then 1500ms, then more if we add more retries)
                                    const delay = Math.min(500 * Math.pow(3, uploadAttempts - 1), 10000);
                                    status.update(`Upload failed, retrying in ${delay/1000} seconds...`);
                                    await new Promise(resolve => setTimeout(resolve, delay));
                                }
                            }
                        } catch (e) {
                            console.error(`❌ Exception during upload attempt ${uploadAttempts}:`, e);
                            uploadError = e;
                            
                            if (uploadAttempts < maxAttempts) {
                                // Wait before retrying
                                const delay = Math.min(500 * Math.pow(2, uploadAttempts - 1), 10000);
                                status.update(`Upload error, retrying in ${delay/1000} seconds...`);
                                await new Promise(resolve => setTimeout(resolve, delay));
                            }
                        }
                    }

                    // After all attempts, check if we succeeded
                    if (uploadError) {
                        console.error('❌ All upload attempts failed:', uploadError);
                        status.update("Upload failed after multiple attempts!");
                        
                        // Instead of throwing, we'll show a warning and continue with profile update
                        showNotification('Warning', `Could not upload profile image after ${maxAttempts} attempts. Your profile will still be saved without the new image.`);
                    } else {
                        console.log('✅ Profile image uploaded successfully:', uploadData);
                        status.update("Upload complete! Generating permanent URL...");
                        
                        // Generate a permanent signed URL with 20-year expiry
                        try {
                            const { data: signedData, error: signedError } = await supabase.storage
                                .from('prayer-diary')
                                .createSignedUrl(filePath, 630720000); // 20 year expiry
                            
                            if (signedError) {
                                console.error('❌ Error creating signed URL:', signedError);
                                status.update("Error creating signed URL.");
                                throw signedError;
                            }
                            
                            // Store this final URL - this will be the permanent link used everywhere
                            profileImageUrl = signedData.signedUrl;
                            console.log('✅ Generated permanent signed URL with long expiry:', profileImageUrl);
                            status.update("URL generated successfully!");
                            
                            // Update UI with the new URL
                            updateAllProfileImages(profileImageUrl);
                            
                        } catch (urlError) {
                            console.error('❌ Error generating signed URL:', urlError);
                            throw new Error('Failed to generate image URL. Please try again.');
                        }
                    }
                } catch (uploadErr) {
                    console.error('❌ Error in image upload process:', uploadErr);
                    status.update("Upload failed: " + uploadErr.message);
                    
                    // Continue with profile update even if image upload fails
                    showNotification('Warning', `Profile saved, but image upload failed: ${uploadErr.message}`);
                } finally {
                    // Remove status indicator
                    status.remove();
                }
            } catch (uploadErr) {
                console.error('❌ Error in image upload process:', uploadErr);
                // Continue with profile update even if image upload fails
                showNotification('Warning', `Profile saved, but image upload failed: ${uploadErr.message}`);
            }
        }
        
        // Determine if GDPR was accepted in this save
        const gdprAccepted = data.gdprAccepted === true ? true : userProfile.gdpr_accepted || false;
        
        console.log('📝 Saving profile data to database...');
        
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
            
        if (error) {
            console.error('❌ Database update error:', error);
            throw error;
        }
        
        console.log('✅ Profile updated successfully and marked as set');
        
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