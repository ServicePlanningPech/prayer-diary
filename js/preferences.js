// Preferences Module

// Variables
let userPreferences = {
    darkMode: false,
    smallPhoto: false
};

// Load user preferences from profile
async function loadUserPreferences() {
    if (!isLoggedIn()) return;
    
    await window.waitForAuthStability();
    
    try {
        // Refresh user profile from database
        await fetchUserProfile();
        
        if (!userProfile) {
            console.error("Unable to load user profile for preferences");
            return;
        }
        
        // Update preferences from profile
        userPreferences.darkMode = userProfile.dark_mode || false;
        userPreferences.smallPhoto = userProfile.small_photo || false;
        
        // Update UI to match preferences
        updatePreferencesUI();
        
        // Apply preferences
        applyPreferences();
        
        // Set up form submission
        document.getElementById('preferences-form').addEventListener('submit', savePreferences);
        
        // Set up radio buttons to apply preferences immediately on change
        setupImmediatePreferenceChanges();
    } catch (error) {
        console.error('Error loading preferences:', error);
        showNotification('Error', `Unable to load your preferences: ${error.message}`);
    }
}

// Update the preferences UI based on user preferences
function updatePreferencesUI() {
    // Set display mode radio buttons
    const lightModeRadio = document.getElementById('light-mode');
    const darkModeRadio = document.getElementById('dark-mode');
    
    if (userPreferences.darkMode) {
        darkModeRadio.checked = true;
        lightModeRadio.checked = false;
    } else {
        lightModeRadio.checked = true;
        darkModeRadio.checked = false;
    }
    
    // Set photo size radio buttons
    const largePhotoRadio = document.getElementById('large-photo');
    const smallPhotoRadio = document.getElementById('small-photo');
    
    if (userPreferences.smallPhoto) {
        smallPhotoRadio.checked = true;
        largePhotoRadio.checked = false;
    } else {
        largePhotoRadio.checked = true;
        smallPhotoRadio.checked = false;
    }
}

// Save the user's preferences
async function savePreferences(e) {
    e.preventDefault();
    
    const submitBtn = e.submitter;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        // Get preferences from form
        const darkMode = document.getElementById('dark-mode').checked;
        const smallPhoto = document.getElementById('small-photo').checked;
        
        // Update local preferences object
        userPreferences.darkMode = darkMode;
        userPreferences.smallPhoto = smallPhoto;
        
        // Apply preferences immediately
        applyPreferences();
        
        // Save to database
        await window.waitForAuthStability();
        const { error } = await supabase
            .from('profiles')
            .update({
                dark_mode: darkMode,
                small_photo: smallPhoto
            })
            .eq('id', getUserId());
            
        if (error) throw error;
        
        // Update user profile in memory
        if (userProfile) {
            userProfile.dark_mode = darkMode;
            userProfile.small_photo = smallPhoto;
        }
        
        showNotification('Success', 'Preferences saved successfully!');
    } catch (error) {
        console.error('Error saving preferences:', error);
        showNotification('Error', `Failed to save preferences: ${error.message}`);
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Apply preferences to the application
function applyPreferences() {
    // Apply dark mode
    if (userPreferences.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Apply photo size
    if (userPreferences.smallPhoto) {
        document.body.classList.add('small-photo');
    } else {
        document.body.classList.remove('small-photo');
    }
}

// Set up immediate preference changes
function setupImmediatePreferenceChanges() {
    // Display mode radio buttons
    document.querySelectorAll('input[name="display-mode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            userPreferences.darkMode = this.value === 'dark';
            applyPreferences();
        });
    });
    
    // Photo size radio buttons
    document.querySelectorAll('input[name="photo-size"]').forEach(radio => {
        radio.addEventListener('change', function() {
            userPreferences.smallPhoto = this.value === 'small';
            applyPreferences();
        });
    });
}

// Make key functions globally accessible
window.loadUserPreferences = loadUserPreferences;
window.applyUserPreferences = function() {
    if (userProfile) {
        userPreferences.darkMode = userProfile.dark_mode || false;
        userPreferences.smallPhoto = userProfile.small_photo || false;
        applyPreferences();
    }
};