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

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Initialize app function
function initializeApp() {
    // Set up delete user confirmation modal functionality
    const deleteUserModal = document.getElementById('delete-user-modal');
    if (deleteUserModal) {
        deleteUserModal.addEventListener('shown.bs.modal', function() {
            // Focus the confirm delete button when modal is shown
            document.getElementById('confirm-delete-user').focus();
        });
    }
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
    checkForSuperAdmin();
    
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