// Push Notifications Module
// Manages push notification subscriptions and permissions

// Constants
const PERMISSION_PROMPT_KEY = 'pushNotificationPermissionPromptShown';
const PERMISSION_PROMPT_DELAY = 3000; // 3 seconds

// Variable to track if initialization has been done
let pushInitialized = false;

// Initialize push notification functionality
document.addEventListener('DOMContentLoaded', setupPushNotificationListeners);

// When user logs in, initialize push notifications
document.addEventListener('login-state-changed', function(event) {
  if (event.detail && event.detail.loggedIn) {
    // Call after a short delay to ensure profile is loaded
    setTimeout(initializePushNotifications, 2000);
  }
});

// Set up listeners for the notification permission UI
function setupPushNotificationListeners() {
  // Set up permission prompt listeners
  setupPermissionPromptListeners();
  
  // Listen for changes in user preferences
  document.addEventListener('user-preferences-changed', function(event) {
    if (event.detail && event.detail.notificationMethod === 'push') {
      requestNotificationPermission();
    }
  });
}

// NEW FUNCTION: Initialize push notifications at app startup
async function initializePushNotifications() {
  // Prevent multiple initializations
  if (pushInitialized) {
    console.log('Push notifications already initialized');
    return;
  }
  
  try {
    console.log('Initializing push notifications');
    
    // Wait for auth to be stable before checking user preferences
    await waitForAuthStability();
    
    // Only proceed if the user is logged in and has a profile
    if (!isLoggedIn() || !userProfile) {
      console.log('User not logged in or profile not loaded, skipping push initialization');
      return;
    }
    
    // Check if user has opted for push notifications
    if (userProfile.notification_method === 'push') {
      console.log('User has opted for push notifications, checking subscription');
      
      // Check if push is supported in this browser
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported in this browser');
        return;
      }
      
      // Check permission state
      const permission = Notification.permission;
      if (permission === 'denied') {
        console.log('Push permission denied by user');
        // Consider updating the user profile to disable push if permission denied
        return;
      }
      
      // Only proceed if permission is granted
      if (permission === 'granted') {
        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;
        
        // Check existing subscription
        let subscription = await registration.pushManager.getSubscription();
        
        // If no subscription exists or it needs to be renewed, create a new one
        if (!subscription) {
          console.log('No existing push subscription, creating new one');
          
          // Get VAPID key from server
          const vapidPublicKey = await getVapidPublicKey();
          
          // Create new subscription
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });
          
          // Save the new subscription to database
          await saveSubscriptionToDatabase(subscription);
        } else {
          console.log('Existing push subscription found, updating database');
          // Update the existing subscription in the database
          await saveSubscriptionToDatabase(subscription);
        }
        
        pushInitialized = true;
        console.log('Push notification initialization complete');
      } else {
        // Ask for permission if not yet granted
        console.log('Permission not granted, requesting permission');
        requestNotificationPermission();
      }
    } else {
      console.log('User has not opted for push notifications, skipping initialization');
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
}

// Request notification permission
async function requestNotificationPermission() {
  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  // If permission already granted, we're good
  if (Notification.permission === 'granted') {
    console.log('Notification permission already granted');
    return true;
  }
  
  // If permission denied, we can't ask again
  if (Notification.permission === 'denied') {
    console.log('Notification permission previously denied');
    // Show instructions for re-enabling
    showNotificationHelp();
    return false;
  }
  
  try {
    // Show custom permission prompt first for better UX
    const shouldProceed = await showCustomPermissionPrompt();
    
    if (shouldProceed) {
      // Request browser permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted!');
        
        // Now that we have permission, we can subscribe
        await subscribeToPushNotifications();
        return true;
      } else {
        console.log('Notification permission not granted:', permission);
        return false;
      }
    } else {
      console.log('User declined custom permission prompt');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Show a custom permission prompt to improve user experience
function showCustomPermissionPrompt() {
  return new Promise((resolve) => {
    // Check if we've shown this prompt before
    const promptShown = localStorage.getItem(PERMISSION_PROMPT_KEY);
    if (promptShown) {
      // If we've shown it before, just proceed to browser prompt
      resolve(true);
      return;
    }
    
    // Create a custom prompt element
    const promptElement = document.createElement('div');
    promptElement.className = 'notification-permission-prompt';
    promptElement.innerHTML = `
      <h5><i class="bi bi-bell me-2"></i>Enable Notifications?</h5>
      <p>Allow notifications to receive alerts when new prayer updates and urgent prayer requests are added.</p>
      <div class="actions">
        <button id="notification-later-btn" class="btn btn-sm btn-outline-secondary">Ask Later</button>
        <button id="notification-allow-btn" class="btn btn-sm btn-primary">Allow</button>
      </div>
    `;
    
    // Add to document
    document.body.appendChild(promptElement);
    
    // Animate in
    setTimeout(() => {
      promptElement.classList.add('show');
    }, 100);
    
    // Add button listeners
    document.getElementById('notification-allow-btn').addEventListener('click', () => {
      // Mark prompt as shown
      localStorage.setItem(PERMISSION_PROMPT_KEY, 'true');
      // Remove the prompt
      promptElement.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(promptElement);
      }, 300);
      // Resolve with true to proceed with browser prompt
      resolve(true);
    });
    
    document.getElementById('notification-later-btn').addEventListener('click', () => {
      // Remove the prompt without marking it as shown permanently
      promptElement.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(promptElement);
      }, 300);
      // Resolve with false to cancel
      resolve(false);
    });
  });
}

// Setup permission prompt listeners
function setupPermissionPromptListeners() {
  // We'll use standard click handlers which will be set up on the elements
  // when they're created in showCustomPermissionPrompt
}

// Show help for re-enabling notifications
function showNotificationHelp() {
  const content = `
    <p>You previously blocked notifications for this site. To receive prayer notifications, you'll need to change your browser settings.</p>
    <h6 class="mt-3 mb-2">How to enable notifications:</h6>
    <ol>
      <li>Click the lock/info icon in your browser's address bar</li>
      <li>Find "Notifications" or "Permissions" settings</li>
      <li>Change from "Block" to "Allow"</li>
      <li>Refresh this page</li>
    </ol>
  `;
  
  // Show a notification with instructions
  showNotification('Notifications Blocked', content);
}

// Subscribe to push notifications after permission is granted
async function subscribeToPushNotifications() {
  try {
    console.log('Setting up push notification subscription');
    
    // Check if service worker is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return false;
    }
    
    // Get the service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Get the VAPID public key from the server
    const vapidPublicKey = await getVapidPublicKey();
    
    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    
    console.log('Push notification subscription successful');
    
    // Save subscription to database
    const saved = await saveSubscriptionToDatabase(subscription);
    return saved;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
}

// UPDATED FUNCTION: Save the subscription to the database
async function saveSubscriptionToDatabase(subscription) {
  try {
    // Wait for auth stability
    await waitForAuthStability();
    
    // Check if we have a valid user ID
    const userId = getUserId();
    if (!userId) {
      console.error('Cannot save subscription: No user ID available');
      return false;
    }
    
    // Convert subscription to JSON
    const subscriptionJSON = subscription.toJSON();
    
    // First check if a subscription already exists for this user
    const { data: existingSubscription, error: queryError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (queryError && queryError.code !== 'PGRST116') { // Not found error is okay
      console.error('Error checking existing subscription:', queryError);
      return false;
    }
    
    if (existingSubscription) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          subscription_data: subscriptionJSON,
          active: true,  // Mark as active when updating
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id);
        
      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return false;
      }
    } else {
      // Insert new subscription
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: userId,
          subscription_data: subscriptionJSON,
          active: true,  // Set as active on creation
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error('Error saving subscription:', insertError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveSubscriptionToDatabase:', error);
    return false;
  }
}

// Get the VAPID public key from the server
async function getVapidPublicKey() {
  try {
    // Try to get from localStorage first if available
    const cachedKey = localStorage.getItem('vapidPublicKey');
    if (cachedKey) {
      return cachedKey;
    }
    
    // Call Supabase Edge Function to get VAPID key
    const { data, error } = await supabase.functions.invoke('get-vapid-key');
    
    if (error) {
      console.error('Error getting VAPID key:', error);
      throw error;
    }
    
    if (data && data.vapidPublicKey) {
      // Cache the key for future use
      localStorage.setItem('vapidPublicKey', data.vapidPublicKey);
      return data.vapidPublicKey;
    } else {
      throw new Error('Invalid response from get-vapid-key function');
    }
  } catch (error) {
    console.error('Failed to get VAPID key:', error);
    throw error;
  }
}

// Helper function to convert base64 to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Test push notifications (for debugging)
async function testPushNotification() {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notifications', {
      body: {
        userIds: [getUserId()],
        title: 'Test Notification',
        message: 'This is a test push notification',
        contentType: 'test',
        contentId: '00000000-0000-0000-0000-000000000000',
        data: {
          url: '/calendar-view'
        }
      }
    });
    
    if (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
    
    console.log('Test notification result:', data);
    return true;
  } catch (error) {
    console.error('Error in testPushNotification:', error);
    return false;
  }
}

// Unsubscribe from push notifications
async function unsubscribeFromPushNotifications() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }
    
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Get current subscription
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('No push subscription found to unsubscribe from');
      return true;
    }
    
    // Unsubscribe
    const result = await subscription.unsubscribe();
    
    if (result) {
      console.log('Successfully unsubscribed from push notifications');
      
      // Mark as inactive in database
      await markSubscriptionInactive();
    }
    
    return result;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

// Mark a subscription as inactive in the database
async function markSubscriptionInactive() {
  try {
    await waitForAuthStability();
    
    const userId = getUserId();
    if (!userId) return false;
    
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ active: false })
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error marking subscription as inactive:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in markSubscriptionInactive:', error);
    return false;
  }
}

// Export functions for use in other modules
window.requestNotificationPermission = requestNotificationPermission;
window.testPushNotification = testPushNotification;
window.unsubscribeFromPushNotifications = unsubscribeFromPushNotifications;