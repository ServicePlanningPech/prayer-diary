// Admin Module

// Load users for admin view
async function loadUsers() {
    if (!isAdmin()) {
        showNotification('Access Denied', 'You do not have administrator access to manage users.');
        showView('calendar-view');
        return;
    }
    
    // Get container elements
    const pendingContainer = document.getElementById('pending-users-container');
    const approvedContainer = document.getElementById('approved-users-container');
    
    // Show loading indicators
    pendingContainer.innerHTML = createLoadingSpinner();
    approvedContainer.innerHTML = createLoadingSpinner();
    
    try {
        // Get all profiles with their stored emails
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true });
            
        if (profilesError) throw profilesError;
        
        // Process users, using stored email if available
        processedUsers = profiles.map(profile => {
            // Use the profile.email field if it exists, otherwise fall back to defaults
            const email = profile.email || (
                // Super admin fallback
                (profile.user_role === 'Administrator' && profile.full_name === 'Super Admin') 
                ? 'prayerdiary@pech.co.uk' 
                // Email extraction from name fallback
                : (profile.full_name && profile.full_name.includes('@')) 
                  ? profile.full_name 
                  : "Unknown email"
            );
            
            return {
                ...profile,
                email: email
            };
        });
        
        // Separate pending and approved users
        const pendingUsers = processedUsers.filter(user => user.approval_state === 'Pending');
        const approvedUsers = processedUsers.filter(user => user.approval_state === 'Approved');
        
        // Display pending users
        if (pendingUsers.length === 0) {
            pendingContainer.innerHTML = `
                <div class="notification is-info">
                    No pending users awaiting approval.
                </div>
            `;
        } else {
            let pendingHtml = '';
            pendingUsers.forEach(user => {
                pendingHtml += createUserCard(user, true);
            });
            pendingContainer.innerHTML = pendingHtml;
            
            // Add approval/rejection event listeners
            document.querySelectorAll('.approve-user').forEach(button => {
                button.addEventListener('click', async () => {
                    const userId = button.getAttribute('data-id');
                    await updateUserApproval(userId, 'Approved');
                });
            });
            
            document.querySelectorAll('.reject-user').forEach(button => {
                button.addEventListener('click', async () => {
                    const userId = button.getAttribute('data-id');
                    await updateUserApproval(userId, 'Rejected');
                });
            });
        }
        
        // Display approved users
        if (approvedUsers.length === 0) {
            approvedContainer.innerHTML = `
                <div class="notification is-info">
                    No approved users found.
                </div>
            `;
        } else {
            let approvedHtml = '';
            approvedUsers.forEach(user => {
                approvedHtml += createUserCard(user, false);
            });
            approvedContainer.innerHTML = approvedHtml;
            
            // Add edit permissions event listeners
            document.querySelectorAll('.edit-user').forEach(button => {
                button.addEventListener('click', () => {
                    const userId = button.getAttribute('data-id');
                    const user = approvedUsers.find(u => u.id === userId);
                    if (user) {
                        openEditUserModal(user);
                    }
                });
            });
        }
        
    } catch (error) {
        console.error('Error loading users:', error);
        pendingContainer.innerHTML = `
            <div class="notification is-danger">
                Error loading users: ${error.message}
            </div>
        `;
        approvedContainer.innerHTML = `
            <div class="notification is-danger">
                Error loading users: ${error.message}
            </div>
        `;
    }
}

// Open the edit user modal
function openEditUserModal(user) {
    const modal = document.getElementById('edit-user-modal');
    
    // Populate form fields
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('user-role').value = user.user_role;
    document.getElementById('approval-state').value = user.approval_state;
    document.getElementById('calendar-editor').checked = user.prayer_calendar_editor;
    document.getElementById('update-editor').checked = user.prayer_update_editor;
    document.getElementById('urgent-editor').checked = user.urgent_prayer_editor;
    
    // Show modal
    modal.classList.add('is-active');
    
    // Set up save button
    document.getElementById('save-user').onclick = saveUserPermissions;
}

// Save user permissions
async function saveUserPermissions() {
    const saveBtn = document.getElementById('save-user');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
        const userId = document.getElementById('edit-user-id').value;
        const userRole = document.getElementById('user-role').value;
        const approvalState = document.getElementById('approval-state').value;
        const calendarEditor = document.getElementById('calendar-editor').checked;
        const updateEditor = document.getElementById('update-editor').checked;
        const urgentEditor = document.getElementById('urgent-editor').checked;
        
        // Update user profile
        const { data, error } = await supabase
            .from('profiles')
            .update({
                user_role: userRole,
                approval_state: approvalState,
                prayer_calendar_editor: calendarEditor,
                prayer_update_editor: updateEditor,
                urgent_prayer_editor: urgentEditor
            })
            .eq('id', userId);
            
        if (error) throw error;
        
        // Close modal
        document.getElementById('edit-user-modal').classList.remove('is-active');
        
        // Reload users
        loadUsers();
        
        showNotification('Success', 'User permissions updated successfully.');
        
    } catch (error) {
        console.error('Error saving user permissions:', error);
        showNotification('Error', `Failed to update user permissions: ${error.message}`);
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Update user approval state
async function updateUserApproval(userId, state) {
    try {
        // Update user profile
        const { data, error } = await supabase
            .from('profiles')
            .update({
                approval_state: state
            })
            .eq('id', userId);
            
        if (error) throw error;
        
        // If approving, also send welcome email
        if (state === 'Approved') {
            await sendApprovalEmail(userId);
        }
        
        // Reload users
        loadUsers();
        
        showNotification('Success', `User ${state.toLowerCase()} successfully.`);
        
    } catch (error) {
        console.error('Error updating user approval:', error);
        showNotification('Error', `Failed to update user approval: ${error.message}`);
    }
}

// Send approval email to user
async function sendApprovalEmail(userId) {
    try {
        // First try to get email from profile
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single();
            
        if (profileError) throw profileError;
        
        const name = profileData.full_name || 'Church Member';
        let email = profileData.email;
        
        // Fallback to RPC function if email not in profile
        if (!email) {
            try {
                const { data: emailData, error: emailError } = await supabase
                    .rpc('get_user_email', { user_id: userId });
                
                if (!emailError && emailData) {
                    email = emailData;
                    
                    // Save email to profile for future use
                    await supabase
                        .from('profiles')
                        .update({ email: email })
                        .eq('id', userId);
                }
            } catch (e) {
                console.warn('Error getting email from RPC:', e);
            }
        }
        
        // Final fallback
        if (!email && name.includes('@')) {
            email = name;
        }
        
        if (!email) {
            throw new Error('Unable to retrieve user email');
        }
        
        // Here we would trigger the email notification
        // For now, we'll just log it (actual email sending will be in notifications.js)
        console.log(`Sending approval email to ${name} (${email})`);
        
        // This will be implemented in notifications.js
        await sendWelcomeEmail(email, name);
        
    } catch (error) {
        console.error('Error sending approval email:', error);
        // We don't show a notification here as it's a background task
    }
}