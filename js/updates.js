// Prayer Updates Module

// Global variables for editors
let updateEditor;
let editUpdateEditor;

// Initialize the Rich Text Editor for updates
function initUpdateEditor() {
    // Initialize update editor if not already initialized
    if (!updateEditor) {
        updateEditor = new Quill('#update-editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link'],
                    ['clean']
                ]
            },
            placeholder: 'Compose prayer update...',
        });
    }
    
    // Initialize edit update editor if not already initialized
    if (!editUpdateEditor) {
        editUpdateEditor = new Quill('#edit-update-editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link'],
                    ['clean']
                ]
            },
            placeholder: 'Edit prayer update...',
        });
    }
    
    // Set up form submission for creating updates
    document.getElementById('update-form').addEventListener('submit', createPrayerUpdate);
}

// Load all prayer updates (both current and archived)
async function loadPrayerUpdates() {
    if (!isApproved()) return;
    
    // Get container elements
    const currentContainer = document.getElementById('updates-container');
    const archivedContainer = document.getElementById('archived-updates-container');
    
    // Show loading indicators
    currentContainer.innerHTML = createLoadingSpinner();
    archivedContainer.innerHTML = createLoadingSpinner();
    
    try {
        // Load current updates
        const { data: currentUpdates, error: currentError } = await supabase
            .from('prayer_updates')
            .select('*')
            .eq('is_archived', false)
            .order('created_at', { ascending: false });
            
        if (currentError) throw currentError;
        
        // Load archived updates
        const { data: archivedUpdates, error: archivedError } = await supabase
            .from('prayer_updates')
            .select('*')
            .eq('is_archived', true)
            .order('created_at', { ascending: false });
            
        if (archivedError) throw archivedError;
        
        // Display current updates
        if (currentUpdates.length === 0) {
            currentContainer.innerHTML = `
                <div class="notification is-info">
                    No current prayer updates available.
                </div>
            `;
        } else {
            let currentHtml = '';
            currentUpdates.forEach(update => {
                currentHtml += createUpdateCard(update);
            });
            currentContainer.innerHTML = currentHtml;
        }
        
        // Display archived updates
        if (archivedUpdates.length === 0) {
            archivedContainer.innerHTML = `
                <div class="notification is-info">
                    No archived prayer updates available.
                </div>
            `;
        } else {
            let archivedHtml = '';
            archivedUpdates.forEach(update => {
                archivedHtml += createUpdateCard(update);
            });
            archivedContainer.innerHTML = archivedHtml;
        }
        
    } catch (error) {
        console.error('Error loading prayer updates:', error);
        currentContainer.innerHTML = `
            <div class="notification is-danger">
                Error loading prayer updates: ${error.message}
            </div>
        `;
        archivedContainer.innerHTML = `
            <div class="notification is-danger">
                Error loading archived updates: ${error.message}
            </div>
        `;
    }
}

// Load updates for admin view
async function loadUpdatesAdmin() {
    if (!hasPermission('prayer_update_editor')) return;
    
    // Get container elements
    const currentContainer = document.getElementById('admin-updates-container');
    const archivedContainer = document.getElementById('admin-archived-updates-container');
    
    // Show loading indicators
    currentContainer.innerHTML = createLoadingSpinner();
    archivedContainer.innerHTML = createLoadingSpinner();
    
    try {
        // Load current updates
        const { data: currentUpdates, error: currentError } = await supabase
            .from('prayer_updates')
            .select('*')
            .eq('is_archived', false)
            .order('created_at', { ascending: false });
            
        if (currentError) throw currentError;
        
        // Load archived updates
        const { data: archivedUpdates, error: archivedError } = await supabase
            .from('prayer_updates')
            .select('*')
            .eq('is_archived', true)
            .order('created_at', { ascending: false });
            
        if (archivedError) throw archivedError;
        
        // Display current updates
        if (currentUpdates.length === 0) {
            currentContainer.innerHTML = `
                <div class="notification is-info">
                    No current prayer updates available. Create one using the form.
                </div>
            `;
        } else {
            let currentHtml = '';
            currentUpdates.forEach(update => {
                currentHtml += createUpdateCard(update, true);
            });
            currentContainer.innerHTML = currentHtml;
            
            // Add edit event listeners
            document.querySelectorAll('.edit-update').forEach(button => {
                button.addEventListener('click', () => {
                    const updateId = button.getAttribute('data-id');
                    const update = currentUpdates.find(u => u.id === updateId);
                    if (update) {
                        openEditUpdateModal(update);
                    }
                });
            });
            
            // Add archive event listeners
            document.querySelectorAll('.archive-update').forEach(button => {
                button.addEventListener('click', async () => {
                    const updateId = button.getAttribute('data-id');
                    await toggleArchiveUpdate(updateId, true);
                });
            });
        }
        
        // Display archived updates
        if (archivedUpdates.length === 0) {
            archivedContainer.innerHTML = `
                <div class="notification is-info">
                    No archived prayer updates available.
                </div>
            `;
        } else {
            let archivedHtml = '';
            archivedUpdates.forEach(update => {
                archivedHtml += createUpdateCard(update, true);
            });
            archivedContainer.innerHTML = archivedHtml;
            
            // Add edit event listeners
            document.querySelectorAll('.edit-update').forEach(button => {
                button.addEventListener('click', () => {
                    const updateId = button.getAttribute('data-id');
                    const update = archivedUpdates.find(u => u.id === updateId);
                    if (update) {
                        openEditUpdateModal(update);
                    }
                });
            });
            
            // Add unarchive event listeners (replacing the archive buttons in archived view)
            document.querySelectorAll('.archive-update').forEach(button => {
                button.textContent = 'Unarchive';
                button.querySelector('i').classList.remove('fa-archive');
                button.querySelector('i').classList.add('fa-inbox');
                button.addEventListener('click', async () => {
                    const updateId = button.getAttribute('data-id');
                    await toggleArchiveUpdate(updateId, false);
                });
            });
        }
        
    } catch (error) {
        console.error('Error loading admin prayer updates:', error);
        currentContainer.innerHTML = `
            <div class="notification is-danger">
                Error loading prayer updates: ${error.message}
            </div>
        `;
        archivedContainer.innerHTML = `
            <div class="notification is-danger">
                Error loading archived updates: ${error.message}
            </div>
        `;
    }
}

// Create a new prayer update
async function createPrayerUpdate(e) {
    e.preventDefault();
    
    const submitBtn = e.submitter;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;
    
    try {
        const title = document.getElementById('update-title').value.trim();
        const content = updateEditor.root.innerHTML;
        
        if (!title) {
            throw new Error('Please enter a title for the prayer update');
        }
        
        if (!content || content === '<p><br></p>') {
            throw new Error('Please enter content for the prayer update');
        }
        
        // Create the prayer update
        const { data, error } = await supabase
            .from('prayer_updates')
            .insert({
                title,
                content,
                created_by: getUserId()
            });
            
        if (error) throw error;
        
        // Reset form
        document.getElementById('update-form').reset();
        updateEditor.setContents([]);
        
        // Reload updates
        loadUpdatesAdmin();
        
        // Send notifications
        sendUpdateNotifications(title);
        
        showNotification('Success', 'Prayer update created successfully.');
        
    } catch (error) {
        console.error('Error creating prayer update:', error);
        showNotification('Error', `Failed to create prayer update: ${error.message}`);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Open edit update modal
function openEditUpdateModal(update) {
    // Populate form
    document.getElementById('edit-update-id').value = update.id;
    document.getElementById('edit-update-title-input').value = update.title;
    
    // Set content in Quill editor
    editUpdateEditor.root.innerHTML = update.content;
    
    // Show/hide archive/unarchive buttons based on current state
    if (update.is_archived) {
        document.getElementById('archive-update').style.display = 'none';
        document.getElementById('unarchive-update').style.display = 'inline-block';
    } else {
        document.getElementById('archive-update').style.display = 'inline-block';
        document.getElementById('unarchive-update').style.display = 'none';
    }
    
    // Set up event listeners
    document.getElementById('save-update').onclick = saveUpdate;
    document.getElementById('archive-update').onclick = () => toggleArchiveUpdate(update.id, true);
    document.getElementById('unarchive-update').onclick = () => toggleArchiveUpdate(update.id, false);
    document.getElementById('delete-update').onclick = () => deleteUpdate(update.id);
    
    // Show modal using Bootstrap
    const modal = new bootstrap.Modal(document.getElementById('edit-update-modal'));
    modal.show();
}

// Save edited update
async function saveUpdate() {
    const saveBtn = document.getElementById('save-update');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
        const updateId = document.getElementById('edit-update-id').value;
        const title = document.getElementById('edit-update-title-input').value.trim();
        const content = editUpdateEditor.root.innerHTML;
        
        if (!title) {
            throw new Error('Please enter a title for the prayer update');
        }
        
        if (!content || content === '<p><br></p>') {
            throw new Error('Please enter content for the prayer update');
        }
        
        // Update the prayer update
        const { data, error } = await supabase
            .from('prayer_updates')
            .update({
                title,
                content
            })
            .eq('id', updateId);
            
        if (error) throw error;
        
        // Close modal using Bootstrap
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-update-modal'));
        modal.hide();
        
        // Reload updates
        loadUpdatesAdmin();
        
        showNotification('Success', 'Prayer update saved successfully.');
        
    } catch (error) {
        console.error('Error saving prayer update:', error);
        showNotification('Error', `Failed to save prayer update: ${error.message}`);
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Toggle archive/unarchive for a prayer update
async function toggleArchiveUpdate(updateId, archive) {
    try {
        // Update the prayer update
        const { data, error } = await supabase
            .from('prayer_updates')
            .update({
                is_archived: archive
            })
            .eq('id', updateId);
            
        if (error) throw error;
        
        // Close modal if open
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-update-modal'));
        if (modal) modal.hide();
        
        // Reload updates
        loadUpdatesAdmin();
        
        showNotification('Success', `Prayer update ${archive ? 'archived' : 'unarchived'} successfully.`);
        
    } catch (error) {
        console.error('Error toggling archive state:', error);
        showNotification('Error', `Failed to ${archive ? 'archive' : 'unarchive'} prayer update: ${error.message}`);
    }
}

// Delete a prayer update
async function deleteUpdate(updateId) {
    if (!confirm('Are you sure you want to delete this prayer update? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Delete the prayer update
        const { data, error } = await supabase
            .from('prayer_updates')
            .delete()
            .eq('id', updateId);
            
        if (error) throw error;
        
        // Close modal using Bootstrap
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-update-modal'));
        if (modal) modal.hide();
        
        // Reload updates
        loadUpdatesAdmin();
        
        showNotification('Success', 'Prayer update deleted successfully.');
        
    } catch (error) {
        console.error('Error deleting prayer update:', error);
        showNotification('Error', `Failed to delete prayer update: ${error.message}`);
    }
}

// Send notifications for a new prayer update
async function sendUpdateNotifications(title) {
    try {
        // This will be implemented in notifications.js
        await sendNotification('prayer_update', title, 'All users who opt in for notifications');
    } catch (error) {
        console.error('Error sending update notifications:', error);
    }
}