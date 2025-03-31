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
        // Load all profiles with associated user data
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                approval_state,
                user_role,
                prayer_calendar_editor,
                prayer_update_editor,
                urgent_prayer_editor,
                profile_image_url,
                auth:id (email)
            `)
            .order('full_name', { ascending: true });
            
        if (error) throw error;
        
        // Process user data to include email
        const users = profiles.map(profile => {
            return {
                ...profile,
                email: profile.auth ? profile.auth.email : 'Unknown email'
            };
        });
        
        // Separate pending and approved users
        const pendingUsers = users.filter(user => user.approval_state === 'Pending');
        const approvedUsers = users.filter(user => user.approval_state === 'Approved');
        
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
        // Get user email
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select(`
                auth:id (email),
                full_name
            `)
            .eq('id', userId)
            .single();
            
        if (userError) throw userError;
        
        const email = userData.auth ? userData.auth.email : null;
        const name = userData.full_name;
        
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