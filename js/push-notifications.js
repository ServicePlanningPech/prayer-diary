// Push Notifications Module

// Check if push notifications are supported
function arePushNotificationsSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Variable to track if we're already subscribed
let pushSubscription = null;

// Initialize push notifications
async function initPushNotifications() {
    if (!arePushNotificationsSupported()) {
        console.log('Push notifications are not supported in this browser');
        return false;
    }

    try {
        // Ensure user is logged in
        if (!isLoggedIn()) {
            console.log('User must be logged in to initialize push notifications');
            return false;
        }

        // First, register service worker if not already registered
        const registration = await registerServiceWorker();
        if (!registration) {
            console.error('Could not register service worker for push notifications');
            return false;
        }

        // Check for existing subscription
        pushSubscription = await registration.pushManager.getSubscription();
        
        return true;
    } catch (error) {
        console.error('Error initializing push notifications:', error);
        return false;
    }
}

// Register service worker for push notifications
async function registerServiceWorker() {
    try {
        // Check if service worker is already registered
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
            console.log('Service worker already registered:', registration);
            return registration;
        }
        
        // Get the appropriate service worker path
        const swPath = window.location.pathname.includes('/prayer-diary') ? 
            '/prayer-diary/service-worker.js' : 
            '/service-worker.js';

        // Register service worker
        const newRegistration = await navigator.serviceWorker.register(swPath);
        console.log('Service worker registered for push notifications:', newRegistration);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        
        return newRegistration;
    } catch (error) {
        console.error('Error registering service worker for push notifications:', error);
        return null;
    }
}

// Get the VAPID public key from the server
async function getVapidPublicKey() {
    try {
        await window.waitForAuthStability();
        
        // Get the current auth token
        const authToken = window.authToken;
        if (!authToken) {
            throw new Error('Not authenticated');
        }
        
        // Call the Edge Function to get the VAPID public key
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-vapid-key`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error fetching VAPID key: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.vapidPublicKey;
    } catch (error) {
        console.error('Error getting VAPID public key:', error);
        throw error;
    }
}

// Subscribe to push notifications
async function subscribeToPushNotifications() {
    try {
        // Check if push is supported
        if (!arePushNotificationsSupported()) {
            console.error('Push notifications not supported in this browser');
            return { success: false, error: 'Push notifications not supported' };
        }
        
        // Initialize push notifications
        await initPushNotifications();
        
        // Check if already subscribed
        if (pushSubscription) {
            console.log('Already subscribed to push notifications');
            // Verify the subscription exists in the database
            await saveSubscriptionToDatabase(pushSubscription);
            return { success: true, subscription: pushSubscription };
        }
        
        // Get the service worker registration
        const registration = await navigator.serviceWorker.ready;
        
        // Get the VAPID public key
        const vapidPublicKey = await getVapidPublicKey();
        
        // Convert the VAPID key to a Uint8Array
        const applicationServerKey = urlB64ToUint8Array(vapidPublicKey);
        
        // Request user permission and create a subscription
        pushSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });
        
        console.log('Push notification subscription created:', pushSubscription);
        
        // Save the subscription to the database
        await saveSubscriptionToDatabase(pushSubscription);
        
        return { success: true, subscription: pushSubscription };
    } catch (error) {
        console.error('Error subscribing to push notifications:', error);
        
        // Handle permission denied error specifically
        if (error.name === 'NotAllowedError') {
            return { 
                success: false, 
                error: 'Permission denied for push notifications. Please enable notifications for this site in your browser settings.' 
            };
        }
        
        return { success: false, error: error.message };
    }
}

// Save the subscription to the database
async function saveSubscriptionToDatabase(subscription) {
    try {
        await window.waitForAuthStability();
        
        // Check if we have a valid subscription object
        if (!subscription || !subscription.endpoint) {
            console.error('Invalid subscription object');
            return false;
        }
        
        // Get current user ID
        const userId = getUserId();
        if (!userId) {
            console.error('User ID not available');
            return false;
        }
        
        // Prepare subscription data
        const subscriptionData = {
            user_id: userId,
            subscription_object: subscription.toJSON(),
            user_agent: navigator.userAgent,
            active: true
        };
        
        // Insert or update the subscription in the database using upsert
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert(subscriptionData, {
                onConflict: 'subscription_object->endpoint',
                returning: 'minimal'
            });
        
        if (error) {
            console.error('Error saving push subscription to database:', error);
            return false;
        }
        
        console.log('Push subscription saved to database');
        return true;
    } catch (error) {
        console.error('Error in saveSubscriptionToDatabase:', error);
        return false;
    }
}

// Unsubscribe from push notifications
async function unsubscribeFromPushNotifications() {
    try {
        // Initialize push notifications to make sure we have current subscription
        await initPushNotifications();
        
        // If no subscription exists, we're already unsubscribed
        if (!pushSubscription) {
            console.log('No push subscription found to unsubscribe');
            return { success: true, message: 'Already unsubscribed' };
        }
        
        // Unsubscribe using the PushManager API
        const unsubscribed = await pushSubscription.unsubscribe();
        
        if (!unsubscribed) {
            throw new Error('Failed to unsubscribe from push notifications');
        }
        
        // Mark the subscription as inactive in the database
        await markSubscriptionInactive(pushSubscription);
        
        // Reset the local subscription object
        pushSubscription = null;
        
        console.log('Successfully unsubscribed from push notifications');
        return { success: true };
    } catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
        return { success: false, error: error.message };
    }
}

// Mark a subscription as inactive in the database
async function markSubscriptionInactive(subscription) {
    try {
        await window.waitForAuthStability();
        
        if (!subscription || !subscription.endpoint) {
            console.error('Invalid subscription to mark as inactive');
            return false;
        }
        
        // Convert the endpoint to a string value we can compare
        const endpoint = subscription.endpoint;
        
        // Update the database to mark this subscription as inactive
        const { error } = await supabase
            .from('push_subscriptions')
            .update({ active: false })
            .eq('user_id', getUserId())
            .filter('subscription_object->endpoint', 'eq', endpoint);
        
        if (error) {
            console.error('Error marking subscription as inactive:', error);
            return false;
        }
        
        console.log('Subscription marked as inactive in database');
        return true;
    } catch (error) {
        console.error('Error in markSubscriptionInactive:', error);
        return false;
    }
}

// Check if we're currently subscribed to push notifications
async function isPushNotificationSubscribed() {
    try {
        // Initialize push notifications
        await initPushNotifications();
        
        // Return true if we have a valid subscription
        return !!pushSubscription;
    } catch (error) {
        console.error('Error checking push notification subscription:', error);
        return false;
    }
}

// Function to update user's notification preference to push
async function updateUserNotificationMethodToPush() {
    try {
        await window.waitForAuthStability();
        
        // Get current user ID
        const userId = getUserId();
        if (!userId) {
            console.error('User ID not available');
            return false;
        }
        
        // Update the user's notification_method in the profile
        const { error } = await supabase
            .from('profiles')
            .update({ notification_method: 'push' })
            .eq('id', userId);
        
        if (error) {
            console.error('Error updating notification method:', error);
            return false;
        }
        
        // Update local userProfile
        if (userProfile) {
            userProfile.notification_method = 'push';
        }
        
        console.log('Notification method updated to push');
        return true;
    } catch (error) {
        console.error('Error updating notification method:', error);
        return false;
    }
}

// Handle notification permission changes
async function handleNotificationPermissionChange(newPermission) {
    console.log('Notification permission changed to:', newPermission);
    
    if (newPermission === 'granted') {
        // User granted permission, subscribe to push notifications
        const result = await subscribeToPushNotifications();
        
        if (result.success) {
            // Update the user's notification preference to push
            await updateUserNotificationMethodToPush();
            
            // Update the UI to reflect the new notification method
            const pushRadio = document.getElementById('notification-push');
            if (pushRadio) {
                pushRadio.checked = true;
                
                // Trigger change event to update related UI elements
                const event = new Event('change');
                pushRadio.dispatchEvent(event);
            }
            
            showNotification('Notifications Enabled', 'You will now receive push notifications for prayer updates and urgent prayers.', 'success');
        }
    } else if (newPermission === 'denied') {
        // User denied permission, make sure we're unsubscribed
        await unsubscribeFromPushNotifications();
        
        // If the user has 'push' selected as their notification method, change it to 'none'
        if (userProfile && userProfile.notification_method === 'push') {
            const { error } = await supabase
                .from('profiles')
                .update({ notification_method: 'none' })
                .eq('id', getUserId());
            
            // Update local userProfile
            if (!error && userProfile) {
                userProfile.notification_method = 'none';
            }
            
            // Update the UI
            const noneRadio = document.getElementById('notification-none');
            if (noneRadio) {
                noneRadio.checked = true;
                
                // Trigger change event to update related UI elements
                const event = new Event('change');
                noneRadio.dispatchEvent(event);
            }
            
            showNotification('Notifications Disabled', 'You have disabled push notifications. You can re-enable them in your browser settings.', 'info');
        }
    }
}

// Request permission for push notifications
async function requestPushNotificationPermission() {
    try {
        // Check if Notification API is supported
        if (!('Notification' in window)) {
            throw new Error('This browser does not support desktop notification');
        }
        
        // Check current permission
        if (Notification.permission === 'granted') {
            // Already granted, subscribe to push
            return await subscribeToPushNotifications();
        } else if (Notification.permission === 'denied') {
            // Permission previously denied
            throw new Error('Notification permission was denied. Please enable notifications in your browser settings.');
        }
        
        // Request permission
        const permission = await Notification.requestPermission();
        
        // Handle the result
        await handleNotificationPermissionChange(permission);
        
        if (permission === 'granted') {
            return await subscribeToPushNotifications();
        } else {
            throw new Error('Notification permission was not granted');
        }
    } catch (error) {
        console.error('Error requesting push notification permission:', error);
        return { success: false, error: error.message };
    }
}

// Helper function to convert base64 to Uint8Array
// This is needed to convert the VAPID public key to the format expected by the PushManager
function urlB64ToUint8Array(base64String) {
    // Padding the base64 string to make its length a multiple of 4
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
}

// Setup event listener for notification permission changes
document.addEventListener('DOMContentLoaded', () => {
    // Setup event listener for the push notification radio button
    document.addEventListener('login-state-changed', async function(event) {
        if (event.detail && event.detail.loggedIn) {
            // Initialize push notifications when user is logged in
            await initPushNotifications();
            
            // Setup notification method change handlers
            const pushRadio = document.getElementById('notification-push');
            if (pushRadio) {
                pushRadio.addEventListener('change', async function(e) {
                    if (this.checked) {
                        // User selected push notifications, request permission
                        const result = await requestPushNotificationPermission();
                        
                        if (!result.success) {
                            // If permission was denied, switch back to 'none'
                            const noneRadio = document.getElementById('notification-none');
                            if (noneRadio) {
                                noneRadio.checked = true;
                                
                                // Show error notification
                                showNotification('Permission Required', result.error, 'error');
                            }
                        }
                    }
                });
            }
            
            // Add listener for other notification methods to unsubscribe from push if needed
            const otherRadios = document.querySelectorAll('input[name="notification-method"]:not(#notification-push)');
            otherRadios.forEach(radio => {
                radio.addEventListener('change', async function(e) {
                    if (this.checked) {
                        // User selected a different notification method, unsubscribe from push
                        if (await isPushNotificationSubscribed()) {
                            await unsubscribeFromPushNotifications();
                        }
                    }
                });
            });
        }
    });
});
