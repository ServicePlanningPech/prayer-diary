// Main Application JavaScript

// Version timestamp for cache busting - visible in console
const APP_VERSION_TIMESTAMP = Date.now();
console.log(`Prayer Diary initializing, build ${APP_VERSION_TIMESTAMP}`);

// Add some debugging info to help track versions
window.PRAYER_DIARY = {
    version: APP_VERSION_TIMESTAMP,
    buildTime: new Date().toISOString(),
    devMode: window.PRAYER_DIARY_DEV_MODE || false
};

// Global variable for test date (used to show prayer cards for a different date)
window.testDate = null;

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);


// Initialize app function
function initializeApp() {
	// Check if returning from profile save (should run early)
    checkForPostProfileSave();
    // Set up all modals
    setupAllModals();
    
    // Set up tab close detection for logout
    setupTabCloseLogout();
    
    // Set up delete user confirmation modal functionality
    const deleteUserModal = document.getElementById('delete-user-modal');
    if (deleteUserModal) {
        deleteUserModal.addEventListener('shown.bs.modal', function() {
            // Focus the confirm delete button when modal is shown
            const confirmButton = document.getElementById('confirm-delete-user');
            if (confirmButton) {
                confirmButton.focus();
            }
        });
    }
    
    // Initialize topics functionality
    document.addEventListener('login-state-changed', function(event) {
        if (event.detail && event.detail.loggedIn) {
            // Initialize topics when user is logged in
            initTopics();
        }
    });
}

// Add this to app.js or at the beginning of your main execution flow
function checkForPostProfileSave() {
    // Check if coming back from a profile save refresh
    if (sessionStorage.getItem('profileSaved') === 'true') {
        // Clear the flag
        sessionStorage.removeItem('profileSaved');
        
        // Show a message
        setTimeout(() => {
            showNotification('Profile Updated', 'Your profile has been successfully updated.', 'success');
        }, 500);
        
        // If user was in the profile view before refresh, return there
        if (sessionStorage.getItem('lastView') === 'profile-view') {
            setTimeout(() => {
                showView('profile-view');
            }, 100);
        }
    }
}

// Make sure to call this function when the app initializes
// Add this line to your app initialization code (app.js or similar)
// document.addEventListener('DOMContentLoaded', checkForPostProfileSave);


// Setup logout on tab close functionality
function setupTabCloseLogout() {
    // Use the beforeunload event to detect when the user is leaving
    window.addEventListener('beforeunload', function(e) {
        if (isLoggedIn && isLoggedIn()) {
            console.log("Tab closing - performing quick logout");
            
            // We can't wait for async operations to complete on tab close,
            // so we'll just clear the auth tokens from storage directly
            try {
                localStorage.removeItem('supabase.auth.token');
                localStorage.removeItem('supabase.auth.expires_at');
                sessionStorage.removeItem('supabase.auth.token');
                
                // Clear any app-specific storage
                sessionStorage.removeItem('prayerDiaryLastView');
                sessionStorage.removeItem('prayerDiaryLastUpdate');
                
                // Set a flag indicating the user didn't log out properly
                // This could be used to show a message on next login if needed
                sessionStorage.setItem('prayerDiaryTabClosed', 'true');
            } catch (error) {
                console.error("Error clearing auth storage on tab close:", error);
            }
        }
    });
}

// Function to set up all modals properly
function setupAllModals() {
    console.log('Setting up all modals');
    
    // Add global handlers for all modals
    document.addEventListener('hidden.bs.modal', function(event) {
        console.log('Modal hidden event triggered');
        
        // Clean up any leftover backdrops
        setTimeout(cleanupModalBackdrops, 100);
    });
    
    // Set up a global emergency escape key handler
    document.addEventListener('keydown', function(event) {
        // If Escape key pressed
        if (event.key === 'Escape') {
            console.log('Escape key pressed - checking for stuck modals');
            
            // Check if body still has modal-open class but no visible modals
            const visibleModals = document.querySelectorAll('.modal.show');
            if (document.body.classList.contains('modal-open') && visibleModals.length === 0) {
                console.log('Detected stuck modal state - cleaning up');
                cleanupModalBackdrops();
            }
        }
    });
    
    // Set up notification modal specifically
    setupNotificationCloseButton();
    
    // Recovery button removed
    // Check if Supabase configuration is set
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        showNotification(
            'Configuration Required',
            `
            <p>You need to configure the Supabase settings before using the app.</p>
            <p>Please update the <code>js/config.js</code> file with your Supabase URL and anonymous key.</p>
            <p>See the setup documentation for more details.</p>
            `
        );
    }
    
    // Initialize UI components
    initUI();
    
    // Check if we have a super admin user and create one if it doesn't exist
    //checkForSuperAdmin(); removed due to RLS problems. We will always create a super admin via SQL if needed
    
    // Request notification permissions if supported
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        // Wait a bit before requesting permissions to avoid overwhelming the user on first visit
        setTimeout(() => {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted.');
                    if ('serviceWorker' in navigator && 'PushManager' in window) {
                        requestPushNotificationPermission();
                    }
                }
            });
        }, 5000);
    }
}

// Check if super admin exists and create one if needed
async function checkForSuperAdmin() {
    try {
        // Check if super admin account exists
        const { data: adminUser, error: adminError } = await supabase
            .from('profiles')
            .select('id, user_role')
            .eq('user_role', 'Administrator')
            .limit(1);
            
        if (adminError) throw adminError;
        
        // If no admin exists, create one
        if (!adminUser || adminUser.length === 0) {
            console.log('No admin user found. Trying to create super admin...');
            try {
                // Note: This function is defined in auth.js
                await createSuperAdmin();
            } catch (error) {
                console.error('Error creating super admin:', error);
            }
        }
    } catch (error) {
        console.error('Error checking for super admin:', error);
    }
}