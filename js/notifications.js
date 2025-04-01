// Notifications Module

// Send a notification of the specified type to eligible users
async function sendNotification(type, title, notificationMethods = []) {
    try {
        // Log the notification
        console.log(`Sending ${type} notification: ${title}`);
        console.log('Notification methods:', notificationMethods);
        
        // If no methods specified, use all available methods
        const useAllMethods = notificationMethods.length === 0 || typeof notificationMethods === 'string';
        
        // Depending on which notification services are enabled, send notifications
        if (EMAIL_ENABLED && (useAllMethods || notificationMethods.includes('email'))) {
            await sendEmailNotifications(type, title);
        }
        
        if (TWILIO_ENABLED) {
            if (useAllMethods || notificationMethods.includes('sms')) {
                await sendSmsNotifications(type, title);
            }
            
            if (useAllMethods || notificationMethods.includes('whatsapp')) {
                await sendWhatsAppNotifications(type, title);
            }
        }
        
        if (PUSH_NOTIFICATION_ENABLED && (useAllMethods || notificationMethods.includes('push'))) {
            await sendPushNotifications(type, title);
        }
        
        return true;
    } catch (error) {
        console.error('Error sending notifications:', error);
        return false;
    }
}

// Send email notifications for the specified type
async function sendEmailNotifications(type, title) {
    try {
        // Get users who have opted in for email notifications
        const { data: users, error } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                auth:id (email)
            `)
            .eq('approval_state', 'Approved')
            .eq('notification_email', true);
            
        if (error) throw error;
        
        // Log the number of recipients
        console.log(`Sending email notifications to ${users.length} recipients`);
        
        // For each user, send an email notification
        // In a real implementation, we would use a service like SendGrid, AWS SES, etc.
        for (const user of users) {
            const email = user.auth ? user.auth.email : null;
            
            if (email) {
                // Log notification
                await logNotification(user.id, 'email', type, 'sent');
                
                // In a real implementation, we would call an email service API here
                console.log(`[EMAIL] To: ${email}, Subject: Prayer Diary - ${title}`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error sending email notifications:', error);
        return false;
    }
}

// Send SMS notifications for the specified type
async function sendSmsNotifications(type, title) {
    try {
        // Get users who have opted in for SMS notifications
        const { data: users, error } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                phone_number
            `)
            .eq('approval_state', 'Approved')
            .eq('notification_sms', true)
            .not('phone_number', 'is', null);
            
        if (error) throw error;
        
        // Log the number of recipients
        console.log(`Sending SMS notifications to ${users.length} recipients`);
        
        // For each user, send an SMS notification
        // In a real implementation, we would use Twilio's API
        for (const user of users) {
            if (user.phone_number) {
                // Log notification
                await logNotification(user.id, 'sms', type, 'sent');
                
                // In a real implementation, we would call Twilio's API here
                console.log(`[SMS] To: ${user.phone_number}, Message: Prayer Diary - ${title}`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error sending SMS notifications:', error);
        return false;
    }
}

// Send WhatsApp notifications for the specified type
async function sendWhatsAppNotifications(type, title) {
    try {
        // Get users who have opted in for WhatsApp notifications
        const { data: users, error } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                whatsapp_number
            `)
            .eq('approval_state', 'Approved')
            .eq('notification_whatsapp', true)
            .not('whatsapp_number', 'is', null);
            
        if (error) throw error;
        
        // Log the number of recipients
        console.log(`Sending WhatsApp notifications to ${users.length} recipients`);
        
        // For each user, send a WhatsApp notification
        // In a real implementation, we would use Twilio's WhatsApp API
        for (const user of users) {
            if (user.whatsapp_number) {
                // Log notification
                await logNotification(user.id, 'whatsapp', type, 'sent');
                
                // In a real implementation, we would call Twilio's WhatsApp API here
                console.log(`[WhatsApp] To: ${user.whatsapp_number}, Message: Prayer Diary - ${title}`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error sending WhatsApp notifications:', error);
        return false;
    }
}

// Send push notifications for the specified type
async function sendPushNotifications(type, title) {
    try {
        // In a real implementation, we would use a push notification service
        // like Firebase Cloud Messaging (FCM) or OneSignal
        
        console.log(`[Push] Sending push notification: ${title}`);
        
        // For demonstration purposes only
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            console.log('Push notifications are supported by this browser');
        } else {
            console.log('Push notifications are NOT supported by this browser');
        }
        
        return true;
    } catch (error) {
        console.error('Error sending push notifications:', error);
        return false;
    }
}

// Send a welcome email to a newly approved user
async function sendWelcomeEmail(email, name) {
    try {
        // In a real implementation, we would use an email service API
        console.log(`[EMAIL] Sending welcome email to ${name} (${email})`);
        
        // This is just a placeholder until you implement the actual email sending
        // using a service like SendGrid, Mailgun, AWS SES, etc.
        const emailContent = `
            Dear ${name},
            
            Your Prayer Diary account has been approved. You can now log in and use all features of the app.
            
            Thank you for being part of our prayer community!
            
            Blessings,
            The Prayer Diary Team
        `;
        
        console.log(emailContent);
        
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
}

// Log a notification in the database
async function logNotification(userId, notificationType, contentType, status, errorMessage = null) {
    try {
        const { data, error } = await supabase
            .from('notification_logs')
            .insert({
                user_id: userId,
                notification_type: notificationType,
                content_type: contentType,
                content_id: null, // We're not tracking specific content IDs yet
                status: status,
                error_message: errorMessage
            });
            
        if (error) throw error;
        
        return true;
    } catch (error) {
        console.error('Error logging notification:', error);
        return false;
    }
}

// Request permission for push notifications
async function requestPushNotificationPermission() {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push notifications are not supported by this browser');
            return false;
        }
        
        // Request permission
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('Notification permission granted');
            
            // Register the service worker for push notifications
            const registration = await navigator.serviceWorker.ready;
            
            // Subscribe to push notifications
            const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY') // Replace with your VAPID key
            };
            
            const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);
            
            // Send the subscription details to the server
            // In a real implementation, we would send this to our backend
            console.log('Push subscription:', JSON.stringify(pushSubscription));
            
            return true;
        } else {
            console.log('Notification permission denied');
            return false;
        }
    } catch (error) {
        console.error('Error requesting push notification permission:', error);
        return false;
    }
}

// Helper function to convert base64 string to Uint8Array
// (required for push notification subscription)
function urlBase64ToUint8Array(base64String) {
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

// Implementation of email sending via Supabase Edge Function
async function sendEmail(to, subject, html, text, userId, type, contentId = null) {
    if (!EMAIL_ENABLED) {
        console.log(`Email disabled. Would have sent email to ${to}`);
        return { success: false, error: 'Email is not enabled' };
    }
    
    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to: to,
                subject: subject,
                html: html,
                text: text || html.replace(/<[^>]*>/g, ''), // Fallback plain text
                userId: userId,
                type: type,
                contentId: contentId
            }
        });
        
        if (error) throw error;
        console.log('Email sent successfully to:', to);
        return { success: true, data };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

// Actual implementation of SMS sending via Twilio (to be implemented)
// This would typically be implemented as a serverless function or endpoint
// For now, we'll just log it
async function sendSms(to, message) {
    // This is a placeholder for the actual SMS sending implementation
    console.log(`Sending SMS to ${to}`);
    console.log(`Message: ${message}`);
    
    return true;
}

// Actual implementation of WhatsApp sending via Twilio (to be implemented)
// This would typically be implemented as a serverless function or endpoint
// For now, we'll just log it
async function sendWhatsApp(to, message) {
    // This is a placeholder for the actual WhatsApp sending implementation
    console.log(`Sending WhatsApp message to ${to}`);
    console.log(`Message: ${message}`);
    
    return true;
}