// Admin Module

// Helper function to generate signed URLs for profile images
async function getSignedProfileImageUrl(imagePath, expirySeconds = 3600) {
    if (!imagePath) return null;
    
    // Extract just the path part if it's a full URL
    let path = imagePath;
    
    try {
        // Handle different URL formats
        if (imagePath.includes('/storage/v1/object/')) {
            const match = imagePath.match(/\/prayer-diary\/([^?]+)/);
            if (match && match[1]) {
                path = match[1];
            } else {
                console.warn('Could not extract path from URL:', imagePath);
                return null;
            }
        } else if (imagePath.startsWith('profiles/')) {
            // Path is already in correct format
            path = imagePath;
        } else if (!imagePath.includes('/')) {
            // Just a filename, assume it's in profiles folder
            path = `profiles/${imagePath}`;
        }
        
        const { data, error } = await supabase.storage
            .from('prayer-diary')
            .createSignedUrl(path, expirySeconds);
        
        if (error) {
            console.error('Error creating signed URL:', error);
            return null;
        }
        
        return data.signedUrl;
    } catch (e) {
        console.error('Exception generating signed URL:', e, 'for path:', path);
        return null;
    }
}

// Load users for admin view - SIMPLIFIED VERSION
async function loadUsers() {
    console.log('Starting loadUsers function');
    
    if (!isAdmin()) {
        console.warn('Non-admin user attempted to access admin view');
        showToast('Access Denied', 'You do not have administrator access to manage users.', 'error');
        showView('calendar-view');
        return;
    }
    
    // Get container elements
    const pendingContainer = document.getElementById('pending-users-container');
    const approvedContainer = document.getElementById('approved-users-container');
    
    if (!pendingContainer || !approvedContainer) {
        console.error('User containers not found in DOM');
        showToast('Error', 'UI elements not found. Please refresh the page.', 'error');
        return;
    }
    
    // Show loading indicators
    pendingContainer.innerHTML = createLoadingSpinner();
    approvedContainer.innerHTML = createLoadingSpinner();
    
    try {
        console.log('Checking auth session...');
        // First, check for an active session and get fresh auth state
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.error('No active session found');
            throw new Error('No active session. Please log in again.');
        }
        
        console.log('Fetching user profiles from database...');
        // Use a request ID to bypass potential caching issues
        const requestId = Date.now().toString();
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true })
            .limit(100)
            .order('created_at', { ascending: false }) // Get the most recently created first
            .headers({
                'x-request-id': requestId,
                'Cache-Control': 'no-cache'
            });
        
        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            throw profilesError;
        }
        
        console.log(`Fetched ${profiles ? profiles.length : 0} user profiles`);
        
        // Process the data
        const pendingUsers = profiles.filter(profile => profile.approval_state === 'Pending');
        const approvedUsers = profiles.filter(profile => profile.approval_state === 'Approved');
        
        console.log(`Found ${pendingUsers.length} pending users and ${approvedUsers.length} approved users`);
        
        // Display pending users
        if (pendingUsers.length === 0) {
            pendingContainer.innerHTML = `
                <div class="alert alert-info">
                    No pending users awaiting approval.
                    <button class="btn btn-sm btn-primary float-end" onclick="loadUsers()">
                        <i class="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>
            `;
        } else {
            let pendingHtml = `
                <div class="alert alert-primary mb-3">
                    <strong>${pendingUsers.length}</strong> user${pendingUsers.length !== 1 ? 's' : ''} awaiting approval
                    <button class="btn btn-sm btn-primary float-end" onclick="loadUsers()">
                        <i class="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>
            `;
            
            // Add user cards
            for (const user of pendingUsers) {
                pendingHtml += createUserCard(user, true);
            }
            
            pendingContainer.innerHTML = pendingHtml;
            
            // Add event listeners for buttons
            document.querySelectorAll('.approve-user').forEach(button => {
                button.addEventListener('click', async () => {
                    const userId = button.getAttribute('data-id');
                    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                    button.disabled = true;
                    await updateUserApproval(userId, 'Approved');
                });
            });
            
            document.querySelectorAll('.delete-user').forEach(button => {
                button.addEventListener('click', () => {
                    const userId = button.getAttribute('data-id');
                    const userName = button.getAttribute('data-name');
                    showDeleteUserConfirmation(userId, userName);
                });
            });
            
            // Setup approve all button
            const approveAllBtn = document.getElementById('approve-all-users');
            if (approveAllBtn) {
                approveAllBtn.onclick = async function() {
                    this.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Approving...';
                    this.disabled = true;
                    await approveAllPendingUsers(pendingUsers);
                };
                approveAllBtn.disabled = false;
            }
        }
        
        // Display approved users
        if (approvedUsers.length === 0) {
            approvedContainer.innerHTML = `
                <div class="alert alert-info">
                    No approved users found.
                </div>
            `;
        } else {
            let approvedHtml = '';
            
            for (const user of approvedUsers) {
                approvedHtml += createUserCard(user, false);
            }
            
            approvedContainer.innerHTML = approvedHtml;
            
            // Add event listeners for buttons
            document.querySelectorAll('.edit-user').forEach(button => {
                button.addEventListener('click', () => {
                    const userId = button.getAttribute('data-id');
                    const user = approvedUsers.find(u => u.id === userId);
                    if (user) {
                        openEditUserModal(user);
                    }
                });
            });
            
            document.querySelectorAll('.delete-user').forEach(button => {
                button.addEventListener('click', () => {
                    const userId = button.getAttribute('data-id');
                    const userName = button.getAttribute('data-name');
                    showDeleteUserConfirmation(userId, userName);
                });
            });
        }
        
    } catch (error) {
        console.error('Error loading users:', error);
        
        pendingContainer.innerHTML = `
            <div class="alert alert-danger">
                Error loading users: ${error.message}
                <button class="btn btn-sm btn-primary float-end" onclick="loadUsers()">
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </div>
        `;
        
        approvedContainer.innerHTML = `
            <div class="alert alert-danger">
                Error loading users: ${error.message}
            </div>
        `;
    }
}

// Open the edit user modal
function openEditUserModal(user) {
    // Populate form fields
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('user-role').value = user.user_role;
    document.getElementById('approval-state').value = user.approval_state;
    document.getElementById('calendar-editor').checked = user.prayer_calendar_editor;
    document.getElementById('update-editor').checked = user.prayer_update_editor;
    document.getElementById('urgent-editor').checked = user.urgent_prayer_editor;
    
    // Handle approval admin checkbox
    const approvalAdminField = document.querySelector('.admin-permission-field');
    const approvalAdminCheckbox = document.getElementById('approval-admin');
    
    // Only show approval admin field for administrator role
    if (user.user_role === 'Administrator') {
        approvalAdminField.style.display = 'block';
        approvalAdminCheckbox.checked = user.approval_admin || false;
    } else {
        approvalAdminField.style.display = 'none';
        approvalAdminCheckbox.checked = false;
    }
    
    // Show modal using Bootstrap's modal method
    const modal = new bootstrap.Modal(document.getElementById('edit-user-modal'));
    modal.show();
    
    // Set up save button
    document.getElementById('save-user').onclick = saveUserPermissions;
    
    // Set up role change handler to show/hide admin permissions
    document.getElementById('user-role').addEventListener('change', function() {
        if (this.value === 'Administrator') {
            approvalAdminField.style.display = 'block';
        } else {
            approvalAdminField.style.display = 'none';
            approvalAdminCheckbox.checked = false;
        }
    });
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
        
        // Get approval_admin value (only applies to Administrators)
        let approvalAdmin = false;
        if (userRole === 'Administrator') {
            approvalAdmin = document.getElementById('approval-admin').checked;
        }
        
        // Update user profile
        const { data, error } = await supabase
            .from('profiles')
            .update({
                user_role: userRole,
                approval_state: approvalState,
                prayer_calendar_editor: calendarEditor,
                prayer_update_editor: updateEditor,
                urgent_prayer_editor: urgentEditor,
                approval_admin: approvalAdmin
            })
            .eq('id', userId);
            
        if (error) throw error;
        
        // Close modal using Bootstrap's modal method
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-user-modal'));
        modal.hide();
        
        // Reload users
        loadUsers();
        
        showToast('Success', 'User permissions updated successfully.', 'success');
        
    } catch (error) {
        console.error('Error saving user permissions:', error);
        showToast('Error', `Failed to update user permissions: ${error.message}`, 'error');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Update user approval state
async function updateUserApproval(userId, state) {
    console.log(`Updating user ${userId} to state: ${state}`);
    
    try {
        // Update user profile
        const { error } = await supabase
            .from('profiles')
            .update({
                approval_state: state
            })
            .eq('id', userId);
            
        if (error) {
            console.error('Error updating user approval:', error);
            throw error;
        }
        
        // If approving, also send welcome email
        if (state === 'Approved') {
            await sendApprovalEmail(userId);
        }
        
        // Show success notification
        showToast('Success', `User ${state.toLowerCase()} successfully.`, 'success');
        
        // Reload users
        loadUsers();
        
    } catch (error) {
        console.error('Error updating user approval:', error);
        showToast('Error', `Failed to update user approval: ${error.message}`, 'error');
    }
}

// Function to show delete user confirmation modal
function showDeleteUserConfirmation(userId, userName) {
    // Set the user ID and name in the modal
    document.getElementById('delete-user-id').value = userId;
    document.getElementById('delete-user-name').textContent = userName;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('delete-user-modal'));
    modal.show();
    
    // Set up the confirm delete button handler
    document.getElementById('confirm-delete-user').onclick = async () => {
        await deleteUser(userId);
        modal.hide();
    };
}

// Function to delete a user
async function deleteUser(userId) {
    try {
        const deleteBtn = document.getElementById('confirm-delete-user');
        const originalText = deleteBtn.textContent;
        deleteBtn.textContent = 'Deleting...';
        deleteBtn.disabled = true;
        
        // Get user data for notification
        const { data: userData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();
        
        // Delete the user from the auth database using Edge Function
        const { error: authError } = await supabase.functions.invoke('admin-delete-user', {
            body: { userId },
            headers: {
                'apikey': SUPABASE_ANON_KEY
            }
        });
        
        if (authError) {
            console.error('Error deleting user from auth database:', authError);
            throw new Error(`Failed to delete user: ${authError.message}`);
        }
        
        // Delete the user profile from the profiles table
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
            
        if (profileError) {
            console.error('Error deleting user profile:', profileError);
            throw new Error(`Failed to delete user profile: ${profileError.message}`);
        }
        
        // Show success notification
        showToast('Success', `User ${userData ? userData.full_name : ''} has been deleted successfully.`, 'success');
        
        // Reload the users list
        loadUsers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error', `Failed to delete user: ${error.message}`, 'error');
    } finally {
        // Reset the delete button if it exists (modal might be closed)
        const deleteBtn = document.getElementById('confirm-delete-user');
        if (deleteBtn) {
            deleteBtn.textContent = 'Delete User';
            deleteBtn.disabled = false;
        }
    }
}

// Function to approve all pending users
async function approveAllPendingUsers(pendingUsers) {
    if (pendingUsers.length === 0) {
        showToast('Information', 'No pending users to approve.', 'info');
        return;
    }
    
    try {
        // Show processing toast
        const toastId = showToast('Processing', `Approving ${pendingUsers.length} users...`, 'info');
        
        let successCount = 0;
        let failCount = 0;
        
        // Process each user sequentially
        for (const user of pendingUsers) {
            try {
                // Update user profile
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        approval_state: 'Approved'
                    })
                    .eq('id', user.id);
                    
                if (error) throw error;
                
                // Send welcome email
                try {
                    await sendApprovalEmail(user.id);
                } catch (emailError) {
                    console.warn(`Warning: Email failed for ${user.full_name}:`, emailError);
                }
                
                successCount++;
            } catch (userError) {
                console.error(`Error approving user ${user.full_name}:`, userError);
                failCount++;
            }
        }
        
        // Dismiss processing toast
        dismissToast(toastId);
        
        // Show final results
        if (failCount === 0) {
            showToast('Success', `Successfully approved all ${successCount} users.`, 'success');
        } else {
            showToast('Warning', `Approved ${successCount} users. Failed to approve ${failCount} users.`, 'warning');
        }
        
        // Reload users list
        loadUsers();
        
    } catch (error) {
        console.error('Error in bulk approval:', error);
        showToast('Error', `Failed to complete bulk approval: ${error.message}`, 'error');
    }
}

// Send approval email to user
async function sendApprovalEmail(userId) {
    try {
        // Get user profile data
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single();
            
        if (profileError) throw profileError;
        
        const name = profileData.full_name || 'Church Member';
        let email = profileData.email;
        
        if (!email) {
            throw new Error('Unable to retrieve user email');
        }
        
        // This will be implemented in notifications.js
        await sendWelcomeEmail(email, name);
        
    } catch (error) {
        console.error('Error sending approval email:', error);
    }
}