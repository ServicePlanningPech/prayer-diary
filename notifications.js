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
async function sendWelcomeEmail(email, name, userId = null) {
    try {
        // Create HTML email content
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #483D8B;">Welcome to Prayer Diary!</h2>
                <p>Dear ${name},</p>
                
                <p>Your Prayer Diary account has been approved. You can now log in and use all features of the app.</p>
                
                <p>Thank you for being part of our prayer community!</p>
                
                <div style="margin: 25px 0;">
                    <a href="${window.location.origin}" 
                    style="background-color: #483D8B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                        Open Prayer Diary
                    </a>
                </div>
                
                <p>Blessings,<br>The Prayer Diary Team</p>
            </div>
        `;
        
        // Send email using our general email function
        const result = await sendEmail({
            to: email,
            subject: 'Welcome to Prayer Diary - Your Account is Approved',
            html: htmlContent,
            userId: userId,
            contentType: 'welcome_email'
        });
        
        return result.success;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
}

// Log a notification in the database
async function logNotification(userId, notificationType, contentType, status, errorMessage = null) {
 return true;  //dummy module now
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

// Implementation of email sending via Supabase Edge Function with Google SMTP
// This is a general purpose function that can be used throughout the app
async function sendEmail(options) {
    // Set default values if not provided
    const {
        to,                    // Recipient email (required)
        subject,               // Email subject (required)
        html,                  // HTML content (required)
        text = null,           // Plain text fallback (optional)
        cc = null,             // CC recipients (optional)
        bcc = null,            // BCC recipients (optional)
        replyTo = null,        // Reply-To address (optional)
        from = null,           // Sender address override (optional) - if not provided, will use default in Edge function
        userId = null,         // User ID for logging (optional)
        contentType = null     // Content type for logging (optional)
    } = options;

    // Validate required fields
    if (!to || !subject || !html) {
        console.error('Missing required email parameters');
        return { success: false, error: 'Missing required email parameters' };
    }

    // Check if email is enabled in config
    if (!EMAIL_ENABLED) {
        console.log(`Email disabled. Would have sent email to ${to}`);
        return { success: false, error: 'Email is not enabled' };
    }
    
    try {
        // Call the Supabase Edge Function for sending email through Google SMTP
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to: to,
                subject: subject,
                html: html,
                text: text || html.replace(/<[^>]*>/g, ''), // Fallback plain text
                cc: cc,
                bcc: bcc,
                replyTo: replyTo,
                from: from
            }
        });
        
        if (error) throw error;
        
        // Log successful email delivery
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