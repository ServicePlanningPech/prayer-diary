// Notification Queue Processor
// This script would be used by an admin to process pending notifications

// Process notification queue
async function processNotificationQueue() {
    // Only admins can process notifications
    if (!isAdmin()) {
        console.log('Only administrators can process the notification queue');
        return;
    }
	
	 await window.waitForAuthStability();
    
    try {
        // Get pending notifications from the queue
        const { data: notifications, error } = await supabase
            .from('notification_queue')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });
            
        if (error) {
            console.error('Error fetching notification queue:', error);
            return;
        }
        
        console.log(`Found ${notifications?.length || 0} pending notifications`);
        
        if (!notifications || notifications.length === 0) {
            return;
        }
        
        // Process each notification
        for (const notification of notifications) {
            try {
                console.log(`Processing notification ${notification.id} of type ${notification.notification_type}`);
                
                // Handle different notification types
                if (notification.notification_type === 'new_user_registration') {
                    await handleNewUserRegistrationNotification(notification);
                } else {
                    console.log(`Unknown notification type: ${notification.notification_type}`);
                    // Mark as processed but with error
                    await updateNotificationStatus(notification.id, 'error', 'Unknown notification type');
                }
            } catch (err) {
                console.error(`Error processing notification ${notification.id}:`, err);
                await updateNotificationStatus(notification.id, 'error', err.message);
            }
        }
    } catch (error) {
        console.error('Error processing notification queue:', error);
    }
}

// Handle new user registration notification
async function handleNewUserRegistrationNotification(notification) {
	 await window.waitForAuthStability();
    try {
        // Parse the notification content
        const content = JSON.parse(notification.content);
        const { userName, userEmail, registrationTime } = content;
        
        // Get the admin's email
        const adminId = notification.admin_id;
        const { data: adminProfile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', adminId)
            .single();
            
        if (profileError) {
            throw new Error(`Could not find admin profile: ${profileError.message}`);
        }
        
        // Get admin's email (requires appropriate permissions or service role)
        // In a real implementation, you'd use a server-side function with the service role key
        console.log(`Would send email to admin ${adminProfile.full_name} about new user: ${userName} (${userEmail})`);
        
        // Create email content
        const subject = `Prayer Diary: New User Registration - ${userName}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #483D8B;">New User Registration</h2>
                <p>A new user has registered for Prayer Diary and is awaiting your approval:</p>
                
                <div style="background-color: #f5f5f5; border-left: 4px solid #483D8B; padding: 15px; margin: 15px 0;">
                    <p><strong>Name:</strong> ${userName}</p>
                    <p><strong>Email:</strong> ${userEmail}</p>
                    <p><strong>Registration Time:</strong> ${new Date(registrationTime).toLocaleString()}</p>
                    <p><strong>Status:</strong> Pending Approval</p>
                </div>
                
                <p>Please log in to the admin panel to review and approve this user.</p>
                
                <div style="margin: 25px 0;">
                    <a href="https://serviceplanningpech.github.io/prayer-diary" 
                    style="background-color: #483D8B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                        Go to Admin Panel
                    </a>
                </div>
                
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">
                    This is an automated notification from Prayer Diary. Please do not reply to this email.
                </p>
            </div>
        `;
        
        // In a real implementation, you'd send the email here
        // await sendEmail(adminEmail, subject, htmlContent);
        
        // Mark the notification as processed
        await updateNotificationStatus(notification.id, 'processed');
        
        return true;
    } catch (error) {
        console.error('Error handling new user registration notification:', error);
        throw error;
    }
}

// Update notification status
async function updateNotificationStatus(notificationId, status, errorMessage = null) {
	 await window.waitForAuthStability();
    try {
        const updateData = {
            status,
            processed_at: new Date().toISOString()
        };
        
        if (errorMessage) {
            updateData.error = errorMessage;
        }
        
        const { error } = await supabase
            .from('notification_queue')
            .update(updateData)
            .eq('id', notificationId);
            
        if (error) {
            console.error(`Error updating notification status: ${error.message}`);
        }
    } catch (error) {
        console.error(`Error updating notification status: ${error.message}`);
    }
}

// Add a UI component to allow admins to process the queue
function setupNotificationProcessor() {
    // Only add for admins
    if (!isAdmin()) return;
    
    // Add a button to the admin section
    const adminSection = document.querySelector('.admin-only');
    if (adminSection) {
        const processButton = document.createElement('button');
        processButton.className = 'btn btn-info mt-3';
        processButton.innerHTML = '<i class="bi bi-envelope"></i> Process Notification Queue';
        processButton.addEventListener('click', async () => {
            processButton.disabled = true;
            processButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            
            try {
                await processNotificationQueue();
                showNotification('Success', 'Notification queue processed successfully');
            } catch (error) {
                console.error('Error processing notification queue:', error);
                showNotification('Error', `Failed to process notification queue: ${error.message}`);
            } finally {
                processButton.disabled = false;
                processButton.innerHTML = '<i class="bi bi-envelope"></i> Process Notification Queue';
            }
        });
        
        adminSection.appendChild(processButton);
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Setup notification processor UI for admins
    if (typeof isAdmin === 'function' && isAdmin()) {
        setupNotificationProcessor();
    }
});
