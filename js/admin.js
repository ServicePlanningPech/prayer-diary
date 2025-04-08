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
        
        // Add timeout for this operation to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout getting signed URL')), 5000);
        });
        
        // Create the signed URL with a timeout
        const signedUrlPromise = supabase.storage
            .from('prayer-diary')
            .createSignedUrl(path, expirySeconds);
            
        // Race between the actual operation and the timeout
        const { data, error } = await Promise.race([
            signedUrlPromise,
            timeoutPromise
        ]);
        
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

// Load users for admin view
async function loadUsers() {
    console.log('Starting loadUsers function');
    
    if (!isAdmin()) {
        console.warn('Non-admin user attempted to access admin view');
        showToast('Access Denied', 'You do not have administrator access to manage users.', 'error');
        showView('calendar-view');
        return;
    }
    
    // Get container elements with error handling
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
    
    // Add refresh button to the pending users panel
    const pendingPanel = pendingContainer.closest('#pending-users');
    if (pendingPanel) {
        const refreshButton = document.createElement('button');
        refreshButton.className = 'btn btn-outline-primary btn-sm position-absolute top-0 end-0 m-3';
        refreshButton.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
        refreshButton.onclick = () => {
            showToast('Refreshing', 'Fetching latest user data...', 'info', 2000);
            loadUsers();
        };
        
        // Add the refresh button if it doesn't already exist
        if (!pendingPanel.querySelector('.btn-outline-primary')) {
            pendingPanel.style.position = 'relative';
            pendingPanel.appendChild(refreshButton);
        }
    }
    
    // Set a timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout fetching users')), 15000);
    });
    
    try {
        console.log('Fetching user profiles from database with cache busting...');
        
        // Create the query with a timestamp to prevent caching
        const timestamp = new Date().getTime();
        
        // Use Promise.race to implement timeout
        const queryPromise = async () => {
            // Force refresh from server
            await supabase.auth.refreshSession();
            
            // Use a direct query with no caching
            const response = await supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true })
                .throwOnError();
                
            return response;
        };
        
        const { data: profiles, error: profilesError } = await Promise.race([
            queryPromise(),
            timeoutPromise
        ]);
        
        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            throw profilesError;
        }
        
        // Log the full response for debugging
        console.log('Raw profiles data:', profiles);
        
        if (!profiles || profiles.length === 0) {
            console.log('No user profiles found in database');
            pendingContainer.innerHTML = `
                <div class="alert alert-info">
                    <div class="d-flex align-items-center">
                        <div>No pending users awaiting approval.</div>
                        <button class="btn btn-sm btn-outline-primary ms-auto" onclick="loadUsers()">
                            <i class="bi bi-arrow-clockwise"></i> Check Again
                        </button>
                    </div>
                </div>`;
            approvedContainer.innerHTML = `<div class="alert alert-info">No approved users found.</div>`;
            return;
        }
        
        console.log(`Fetched ${profiles.length} user profiles`);
        
        // Process users, using stored email if available
        const processedUsers = profiles.map(profile => {
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
        
        // Separate pending and approved users - add extra logging
        console.log('Separating users by approval state...');
        const pendingUsers = processedUsers.filter(user => user.approval_state === 'Pending');
        const approvedUsers = processedUsers.filter(user => user.approval_state === 'Approved');
        
        console.log(`Found ${pendingUsers.length} pending users and ${approvedUsers.length} approved users`);
        
        // Display pending users with a count in the header
        if (pendingUsers.length === 0) {
            pendingContainer.innerHTML = `
                <div class="alert alert-info">
                    <div class="d-flex align-items-center">
                        <div>No pending users awaiting approval.</div>
                        <button class="btn btn-sm btn-outline-primary ms-auto refresh-users-btn">
                            <i class="bi bi-arrow-clockwise"></i> Check Again
                        </button>
                    </div>
                </div>
            `;
        } else {
            let pendingHtml = `
                <div class="alert alert-primary mb-3">
                    <div class="d-flex align-items-center">
                        <div><strong>${pendingUsers.length}</strong> user${pendingUsers.length !== 1 ? 's' : ''} awaiting approval</div>
                        <button class="btn btn-sm btn-outline-primary ms-auto refresh-users-btn">
                            <i class="bi bi-arrow-clockwise"></i> Refresh
                        </button>
                    </div>
                </div>
            `;
            
            // Process all users at once with placeholder images first
            for (const user of pendingUsers) {
                // Don't wait for signed URLs here - use placeholder images
                pendingHtml += createUserCard(user, true);
            }
            
            pendingContainer.innerHTML = pendingHtml;
            
            // Add event listener to the refresh button within the container
            const refreshBtn = pendingContainer.querySelector('.refresh-users-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', function() {
                    showToast('Refreshing', 'Fetching latest user data...', 'info', 2000);
                    loadUsers();
                });
            }
            
            // Add event listeners for user actions
            document.querySelectorAll('.approve-user').forEach(button => {
                button.addEventListener('click', async () => {
                    try {
                        console.log('Approve button clicked for user ID:', button.getAttribute('data-id'));
                        const userId = button.getAttribute('data-id');
                        button.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Approving...';
                        button.disabled = true;
                        await updateUserApproval(userId, 'Approved');
                    } catch (error) {
                        console.error('Error in approve button click handler:', error);
                        showNotification('Error', `Approval failed: ${error.message}`);
                    } finally {
                        button.innerHTML = '<i class="bi bi-check"></i> Approve';
                        button.disabled = false;
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
            
            // Create a safe copy of the pending users array
            const pendingUsersSnapshot = [...pendingUsers];
            
            // Remove any existing event listener by cloning the button
            const approveAllBtnOld = document.getElementById('approve-all-users');
            if (approveAllBtnOld) {
                const approveAllBtnNew = approveAllBtnOld.cloneNode(true);
                approveAllBtnOld.parentNode.replaceChild(approveAllBtnNew, approveAllBtnOld);
                
                // Add fresh event listener to the new button
                approveAllBtnNew.addEventListener('click', async (event) => {
                    try {
                        // Prevent any default action or bubbling
                        event.preventDefault();
                        event.stopPropagation();
                        
                        console.log('Approve All button clicked');
                        
                        // Update button UI
                        approveAllBtnNew.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Approving...';
                        approveAllBtnNew.disabled = true;
                        
                        // Use the snapshot to avoid issues with the original array changing
                        await approveAllPendingUsers(pendingUsersSnapshot);
                    } catch (error) {
                        console.error('Error in approve all button handler:', error);
                        alert(`Bulk approval failed: ${error.message}`); // Use alert instead of modal for reliability
                    } finally {
                        // Button might have been removed from DOM during reload
                        const currentBtn = document.getElementById('approve-all-users');
                        if (currentBtn) {
                            currentBtn.innerHTML = '<i class="bi bi-check-all me-1"></i>Approve All';
                            currentBtn.disabled = pendingUsersSnapshot.length === 0;
                        }
                    }
                    
                    // Return false to prevent any further event handling
                    return false;
                });
                
                // Only enable the button if there are pending users
                approveAllBtnNew.disabled = pendingUsersSnapshot.length === 0;
                console.log(`Approve All button ${pendingUsersSnapshot.length === 0 ? 'disabled' : 'enabled'} (${pendingUsersSnapshot.length} pending users)`);
            } else {
                console.warn('Approve All button not found in the DOM');
            }
            
            // Load images asynchronously after rendering
            for (const user of pendingUsers) {
                if (user.profile_image_url) {
                    try {
                        const signedUrl = await getSignedProfileImageUrl(user.profile_image_url);
                        if (signedUrl) {
                            document.querySelectorAll(`img.user-avatar[data-user-id="${user.id}"]`).forEach(img => {
                                img.src = signedUrl;
                            });
                        }
                    } catch (err) {
                        console.warn(`Failed to load image for user ${user.id}:`, err);
                    }
                }
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
            
            // Process all users at once with placeholder images first
            for (const user of approvedUsers) {
                // Don't wait for signed URLs here - use placeholder images
                approvedHtml += createUserCard(user, false);
            }
            
            approvedContainer.innerHTML = approvedHtml;
            
            // Add edit permissions and delete event listeners
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
            
            // Load images asynchronously after rendering
            // Use Promise.allSettled to load all images in parallel but handle failures individually
            Promise.allSettled(
                approvedUsers.map(async user => {
                    if (user.profile_image_url) {
                        try {
                            const signedUrl = await getSignedProfileImageUrl(user.profile_image_url);
                            if (signedUrl) {
                                document.querySelectorAll(`img.user-avatar[data-user-id="${user.id}"]`).forEach(img => {
                                    img.src = signedUrl;
                                });
                            }
                        } catch (err) {
                            console.warn(`Failed to load image for user ${user.id}:`, err);
                        }
                    }
                })
            );
        }
        
    } catch (error) {
        console.error('Error loading users:', error);
        
        // Show error toast
        showToast('Error', `Failed to load users: ${error.message}`, 'error');
        
        // Add a refresh button to both containers for easy recovery
        pendingContainer.innerHTML = `
            <div class="alert alert-danger">
                <div class="d-flex align-items-center">
                    <div><strong>Error:</strong> ${error.message}</div>
                    <button class="btn btn-sm btn-outline-primary ms-auto refresh-users-btn">
                        <i class="bi bi-arrow-clockwise"></i> Try Again
                    </button>
                </div>
            </div>
        `;
        approvedContainer.innerHTML = `
            <div class="alert alert-danger">
                <div class="d-flex align-items-center">
                    <div><strong>Error:</strong> ${error.message}</div>
                    <button class="btn btn-sm btn-outline-primary ms-auto refresh-users-btn">
                        <i class="bi bi-arrow-clockwise"></i> Try Again
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners to the refresh buttons
        document.querySelectorAll('.refresh-users-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                showToast('Refreshing', 'Fetching latest user data...', 'info', 2000);
                loadUsers();
            });
        });
    } finally {
        // Add a fallback to reset loading state if something goes wrong
        const loadingSpinners = document.querySelectorAll('.spinner-border');
        if (loadingSpinners.length > 0) {
            setTimeout(() => {
                loadingSpinners.forEach(spinner => {
                    // If spinners are still visible after 20 seconds, replace with error message
                    if (spinner.parentNode && spinner.parentNode.contains(spinner)) {
                        spinner.parentNode.innerHTML = `
                            <div class="alert alert-warning">
                                <div class="d-flex align-items-center">
                                    <div>Loading timed out. Please try again.</div>
                                    <button class="btn btn-sm btn-outline-primary ms-auto refresh-users-btn">
                                        <i class="bi bi-arrow-clockwise"></i> Retry
                                    </button>
                                </div>
                            </div>
                        `;
                        
                        // Add event listener to the refresh button
                        const refreshBtn = spinner.parentNode.querySelector('.refresh-users-btn');
                        if (refreshBtn) {
                            refreshBtn.addEventListener('click', function() {
                                showToast('Refreshing', 'Fetching latest user data...', 'info', 2000);
                                loadUsers();
                            });
                        }
                    }
                });
            }, 20000); // 20 second timeout
        }
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
    console.log(`Starting updateUserApproval for user ${userId} with state ${state}`);
    
    try {
        // Log the Supabase URL and anon key (partial for security)
        console.log('Supabase configuration check:', {
            url: SUPABASE_URL ? 'Set' : 'Missing',
            anonKey: SUPABASE_ANON_KEY ? 'Set (starts with ' + SUPABASE_ANON_KEY.substring(0, 5) + '...)' : 'Missing'
        });
        
        // Log the current auth state
        const authSession = await supabase.auth.getSession();
        console.log('Auth session check:', authSession.data?.session ? 'Valid session' : 'No session');
        
        // Verify user exists before updating
        console.log('Verifying user exists...');
        const { data: userCheck, error: checkError } = await supabase
            .from('profiles')
            .select('id, approval_state')
            .eq('id', userId)
            .single();
            
        if (checkError) {
            console.error('Error checking user existence:', checkError);
            throw new Error(`User verification failed: ${checkError.message}`);
        }
        
        if (!userCheck) {
            throw new Error('User not found');
        }
        
        console.log(`User found with current state: ${userCheck.approval_state}`);
        
        // Update user profile with detailed logging
        console.log(`Updating user ${userId} to state: ${state}`);
        const { data, error } = await supabase
            .from('profiles')
            .update({
                approval_state: state
            })
            .eq('id', userId);
            
        if (error) {
            console.error('Error in Supabase update operation:', error);
            throw error;
        }
        
        console.log('Profile update successful');
        
        // If approving, also send welcome email
        if (state === 'Approved') {
            console.log('Sending approval email...');
            try {
                await sendApprovalEmail(userId);
                console.log('Email sent successfully');
            } catch (emailError) {
                console.warn('Warning: Email sending failed, but approval was successful:', emailError);
                // Continue despite email failure
            }
        }
        
        // Show success toast before reloading (so user sees it)
        showToast('Success', `User ${state.toLowerCase()} successfully.`, 'success');
        
        // Reload users
        console.log('Reloading user list...');
        setTimeout(() => loadUsers(), 1000); // Short delay to ensure notification is seen
        
    } catch (error) {
        console.error('Error updating user approval:', error);
        showToast('Error', `Failed to update user approval: ${error.message}`, 'error');
        throw error; // Re-throw to allow caller to handle
    }
}

// Function to show delete user confirmation modal
function showDeleteUserConfirmation(userId, userName) {
    try {
        console.log(`Showing delete confirmation for user: ${userName} (${userId})`);
        
        // Get the modal element
        const modalElement = document.getElementById('delete-user-modal');
        if (!modalElement) {
            console.error('Delete user modal element not found');
            return;
        }
        
        // Set the user ID and name in the modal
        const userIdField = document.getElementById('delete-user-id');
        const userNameField = document.getElementById('delete-user-name');
        
        if (!userIdField || !userNameField) {
            console.error('Modal fields not found');
            return;
        }
        
        userIdField.value = userId;
        userNameField.textContent = userName;
        
        // First dispose any existing modal
        try {
            const existingModal = bootstrap.Modal.getInstance(modalElement);
            if (existingModal) {
                existingModal.dispose();
            }
        } catch (disposeError) {
            console.warn('Error disposing existing modal:', disposeError);
        }
        
        // Clean up any stray backdrops
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            if (backdrop && backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
        });
        
        // Clean up body state
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // Create a new modal instance
        const modal = new bootstrap.Modal(modalElement);
        
        // Remove any previous event listeners on the confirm button
        const confirmBtn = document.getElementById('confirm-delete-user');
        if (confirmBtn) {
            // Clone and replace to remove all event listeners
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            // Add fresh event listener
            newConfirmBtn.addEventListener('click', async () => {
                try {
                    await deleteUser(userId);
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        modalInstance.hide();
                    } else {
                        // Manual hide
                        modalElement.classList.remove('show');
                        modalElement.style.display = 'none';
                        
                        // Remove backdrop
                        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                            if (backdrop && backdrop.parentNode) {
                                backdrop.parentNode.removeChild(backdrop);
                            }
                        });
                        
                        // Reset body
                        document.body.classList.remove('modal-open');
                        document.body.style.overflow = '';
                    }
                } catch (error) {
                    console.error('Error in delete confirmation handler:', error);
                }
            });
        }
        
        // Show modal
        try {
            modal.show();
        } catch (showError) {
            console.error('Error showing modal:', showError);
            // Manual show as fallback
            modalElement.classList.add('show');
            modalElement.style.display = 'block';
            
            // Add backdrop manually if needed
            if (!document.querySelector('.modal-backdrop')) {
                const backdrop = document.createElement('div');
                backdrop.classList.add('modal-backdrop', 'fade', 'show');
                document.body.appendChild(backdrop);
            }
        }
        
    } catch (error) {
        console.error('Error setting up delete confirmation:', error);
        
        // Use a simple confirmation as fallback
        if (confirm(`Are you sure you want to delete user: ${userName}? This action cannot be undone.`)) {
            deleteUser(userId);
        }
    }
}

// Function to delete a user
async function deleteUser(userId) {
    try {
        const deleteBtn = document.getElementById('confirm-delete-user');
        const originalText = deleteBtn.textContent;
        deleteBtn.textContent = 'Deleting...';
        deleteBtn.disabled = true;
        
        console.log(`Deleting user with ID: ${userId}`);
        
        // First, check if the user exists
        const { data: userData, error: checkError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();
            
        if (checkError) {
            console.error('Error checking user existence:', checkError);
            throw new Error(`User check failed: ${checkError.message}`);
        }
        
        if (!userData) {
            throw new Error('User not found');
        }
        
        console.log(`Found user to delete: ${userData.full_name}`);
        
        // Get the current session token for authorization
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('No active session found. Please log in again.');
        }
        
        console.log('Got valid session token for Edge Function auth');
        
        // Delete the user from the auth database using Edge Function
        console.log('Calling Edge Function to delete auth user...');
        
        // Use the anon key from the config directly for the function call
        const { error: authError } = await supabase.functions.invoke('admin-delete-user', {
            body: { userId },
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Cache-Control': 'no-cache',
            }
        });
        
        if (authError) {
            console.error('Error deleting user from auth database:', authError);
            throw new Error(`Failed to delete user: ${authError.message}`);
        }
        
        console.log('Auth user deleted successfully from auth database');
        
        // Delete the user profile from the profiles table
        console.log('Deleting user profile from database...');
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
            
        if (profileError) {
            console.error('Error deleting user profile:', profileError);
            throw new Error(`Failed to delete user profile: ${profileError.message}`);
        }
        
        console.log('User profile deleted successfully');
        
        // Show success notification
        showNotification('Success', 'User has been deleted successfully.');
        
        // Reload the users list
        console.log('Reloading user list...');
        setTimeout(() => loadUsers(), 1000);
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error', `Failed to delete user: ${error.message}`);
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
        showToast('Information', 'No pending users to approve.', 'info', 3000);
        return;
    }
    
    // Store reference to the button
    const approveAllBtn = document.getElementById('approve-all-users');
    if (!approveAllBtn) {
        console.error('Approve All button not found in DOM');
        showToast('Error', 'UI element not found. Please refresh the page.', 'error');
        return;
    }
    
    // Store original button text
    const originalText = approveAllBtn.innerHTML;
    approveAllBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Approving...';
    approveAllBtn.disabled = true;
    
    // Show processing toast (persistent until complete)
    const processingToastId = showToast(
        'Processing', 
        `Approving ${pendingUsers.length} users. Please wait...`,
        'processing',
        0 // No auto-hide
    );
    
    try {
        console.log(`Starting bulk approval of ${pendingUsers.length} users`);
        
        let successCount = 0;
        let failCount = 0;
        
        // Create a copy of pending users to avoid modifying the original array during iteration
        const usersToProccess = [...pendingUsers];
        
        // Process each user sequentially to avoid rate limits
        for (const user of usersToProccess) {
            try {
                console.log(`Processing user: ${user.full_name} (${user.id})`);
                
                // Update progress in the toast
                updateToast(processingToastId, {
                    message: `Approving ${pendingUsers.length} users: ${successCount + failCount + 1}/${pendingUsers.length}<br>Currently processing: ${user.full_name}`
                });
                
                // Update user profile with detailed logging
                console.log(`Updating approval state for: ${user.id}`);
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        approval_state: 'Approved'
                    })
                    .eq('id', user.id);
                    
                if (error) {
                    console.error(`Database error approving user ${user.full_name}:`, error);
                    throw error;
                }
                
                console.log(`Successfully updated approval state for: ${user.full_name}`);
                
                // Send welcome email with error handling
                try {
                    console.log(`Sending welcome email to: ${user.full_name}`);
                    await sendApprovalEmail(user.id);
                    console.log(`Email sent to: ${user.full_name}`);
                } catch (emailError) {
                    console.warn(`Warning: Email failed for ${user.full_name}:`, emailError);
                    // Continue despite email failure - user is still approved
                }
                
                successCount++;
                console.log(`Approved ${successCount}/${pendingUsers.length} users so far`);
                
            } catch (userError) {
                console.error(`Error approving user ${user.full_name}:`, userError);
                failCount++;
            }
        }
        
        console.log(`Bulk approval complete. Success: ${successCount}, Failed: ${failCount}`);
        
        // Dismiss the processing toast
        dismissToast(processingToastId);
        
        // Show final results
        if (failCount === 0) {
            showToast('Success', `Successfully approved all ${successCount} users.`, 'success');
        } else {
            showToast('Warning', `Approved ${successCount} users. Failed to approve ${failCount} users.`, 'warning');
        }
        
        // Wait a moment before reloading the users list to ensure UI stability
        console.log('Waiting before reload...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload users with error handling
        try {
            console.log('Reloading user list...');
            await loadUsers();
            console.log('User list reload complete');
        } catch (reloadError) {
            console.error('Error reloading user list:', reloadError);
            // Don't throw here - we want to restore button state even if reload fails
        }
        
    } catch (error) {
        console.error('Error in bulk approval:', error);
        
        // Dismiss the processing toast
        dismissToast(processingToastId);
        
        // Show error toast
        showToast('Error', `Failed to complete bulk approval: ${error.message}`, 'error');
    } finally {
        // Always restore button state with safety checks
        console.log('Restoring button state...');
        try {
            const btnReference = document.getElementById('approve-all-users');
            if (btnReference) {
                btnReference.innerHTML = originalText;
                btnReference.disabled = false;
            }
        } catch (buttonError) {
            console.error('Error restoring button state:', buttonError);
        }
        console.log('Bulk approval function completed');
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