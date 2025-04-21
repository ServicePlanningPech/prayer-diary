// Prayer Updates Module

// Global variables for editors
let updateEditor;
let editUpdateEditor;
let initUpdateEditor;

// Initialize the Rich Text Editor for updates
function initUpdateEditor() {
    console.log('Initializing update editor');
	if (initUpdateEditor) {
		console.log('Initializing update editor - duplicate call');
		return;
	}
	initUpdateEditor = true;
    
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
            // Removed placeholder
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
    
    // Set today's date in the date field
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const dateField = document.getElementById('update-date');
    if (dateField) {
        dateField.value = formattedDate;
    } else {
        console.error('Date field not found');
    }
    
    // Set up direct click handlers for buttons instead of form submission
    const saveAndSendBtn = document.getElementById('save-and-send-btn');
    const saveOnlyBtn = document.getElementById('save-only-btn');
    
    if (saveAndSendBtn) {
        saveAndSendBtn.addEventListener('click', function(e) {
            e.preventDefault();
            createPrayerUpdate('saveAndSend', this);
        });
    } else {
        console.error('Save and send button not found');
    }
    
    if (saveOnlyBtn) {
        saveOnlyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            createPrayerUpdate('saveOnly', this);
        });
    } else {
        console.error('Save only button not found');
    }
	initUpdateEditor = false;
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
                <div class="alert alert-info">
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
                <div class="alert alert-info">
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
            <div class="alert alert-danger">
                Error loading prayer updates: ${error.message}
            </div>
        `;
        archivedContainer.innerHTML = `
            <div class="alert alert-danger">
                Error loading archived updates: ${error.message}
            </div>
        `;
    }
}

// Load updates for admin view
async function loadUpdatesAdmin() {
    if (!hasPermission('prayer_update_editor')) return;
    
    // Get container elements - ensure we're using the Bootstrap tab content elements
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
                <div class="alert alert-info">
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
            currentContainer.querySelectorAll('.edit-update').forEach(button => {
                button.addEventListener('click', () => {
                    const updateId = button.getAttribute('data-id');
                    const update = currentUpdates.find(u => u.id === updateId);
                    if (update) {
                        openEditUpdateModal(update);
                    }
                });
            });
            
            // Add archive event listeners
            currentContainer.querySelectorAll('.archive-update').forEach(button => {
                button.addEventListener('click', async () => {
                    const updateId = button.getAttribute('data-id');
                    await toggleArchiveUpdate(updateId, true);
                });
            });
        }
        
        // Display archived updates
        if (archivedUpdates.length === 0) {
            archivedContainer.innerHTML = `
                <div class="alert alert-info">
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
            archivedContainer.querySelectorAll('.edit-update').forEach(button => {
                button.addEventListener('click', () => {
                    const updateId = button.getAttribute('data-id');
                    const update = archivedUpdates.find(u => u.id === updateId);
                    if (update) {
                        openEditUpdateModal(update);
                    }
                });
            });
            
            // Add unarchive event listeners (replacing the archive buttons in archived view)
            archivedContainer.querySelectorAll('.archive-update').forEach(button => {
                button.textContent = 'Unarchive';
                button.querySelector('i').classList.remove('bi-archive');
                button.querySelector('i').classList.add('bi-inbox-fill');
                button.addEventListener('click', async () => {
                    const updateId = button.getAttribute('data-id');
                    await toggleArchiveUpdate(updateId, false);
                });
            });
        }
        
    } catch (error) {
        console.error('Error loading admin prayer updates:', error);
        currentContainer.innerHTML = `
            <div class="alert alert-danger">
                Error loading prayer updates: ${error.message}
            </div>
        `;
        archivedContainer.innerHTML = `
            <div class="alert alert-danger">
                Error loading archived updates: ${error.message}
            </div>
        `;
    }
}

// Create a new prayer update
async function createPrayerUpdate(action, submitBtn) {
    console.log('Creating prayer update with action:', action);
    
    // Get the original button text and disable the button
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        const titleInput = document.getElementById('update-title').value.trim();
        const dateInput = document.getElementById('update-date').value;
        const content = updateEditor.root.innerHTML;
        
        console.log('Form values:', { titleInput, dateInput });
        console.log('Content:', content);
        
        // Validate inputs
        if (!titleInput) {
            throw new Error('Please enter a title for the prayer update');
        }
        
        if (!dateInput) {
            throw new Error('Please select a date for the prayer update');
        }
        
        if (!content || content === '<p><br></p>') {
            throw new Error('Please enter content for the prayer update');
        }
        
        // Create the full title with prefix
        const title = `PECH Prayer Update ${titleInput}`;
        
        console.log('Archiving existing updates...');
        // Archive any existing non-archived updates
        await archiveExistingUpdates();
        
        console.log('Creating new prayer update...');
        // Create the prayer update
        const { data, error } = await supabase
            .from('prayer_updates')
            .insert({
                title,
                content,
                created_by: getUserId(),
                is_archived: false,
                update_date: dateInput
            });
            
        if (error) {
            console.error('Database error:', error);
            throw error;
        }
        
        console.log('Prayer update created successfully:', data);
        
        // Reset form
        document.getElementById('update-form').reset();
        updateEditor.setContents([]);
        
        // Set today's date in the date field
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        document.getElementById('update-date').value = formattedDate;
        
        // Reload updates
        loadUpdatesAdmin();
        
        // Send notifications if that button was clicked
        if (action === 'saveAndSend') {
            // Call the distribution function
            console.log('Sending prayer update...');
            if (typeof sendPrayerUpdates === 'function') {
                await sendPrayerUpdates(title, content, dateInput);
                showNotification('Success', 'Prayer update saved and sent successfully.');
            } else {
                console.error('sendPrayerUpdates function not found');
                showNotification('Warning', 'Prayer update saved but not sent - distribution module not loaded.');
            }
        } else {
            showNotification('Success', 'Prayer update saved successfully.');
        }
        
    } catch (error) {
        console.error('Error creating prayer update:', error);
        showNotification('Error', `Failed to create prayer update: ${error.message}`);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Archive any existing non-archived updates
async function archiveExistingUpdates() {
    try {
        console.log('Attempting to archive existing updates...');
        const { data, error } = await supabase
            .from('prayer_updates')
            .update({ is_archived: true })
            .eq('is_archived', false);
            
        if (error) {
            console.error('Error in archiveExistingUpdates:', error);
            throw error;
        }
        
        console.log('Existing updates archived:', data);
        return true;
    } catch (error) {
        console.error('Error archiving existing updates:', error);
        return false;
    }
}

// Open edit update modal
function openEditUpdateModal(update) {
    // Populate form
    document.getElementById('edit-update-id').value = update.id;
    
    // Extract the title without the prefix if it exists
    let titleWithoutPrefix = update.title;
    if (update.title.startsWith('PECH Prayer Update ')) {
        titleWithoutPrefix = update.title.replace('PECH Prayer Update ', '');
    }
    
    document.getElementById('edit-update-title-input').value = titleWithoutPrefix;
    
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
        const titleInput = document.getElementById('edit-update-title-input').value.trim();
        const content = editUpdateEditor.root.innerHTML;
        
        if (!titleInput) {
            throw new Error('Please enter a title for the prayer update');
        }
        
        if (!content || content === '<p><br></p>') {
            throw new Error('Please enter content for the prayer update');
        }
        
        // Create the full title with prefix
        const title = `PECH Prayer Update ${titleInput}`;
        
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

// Create an update card (for both admin and regular views)
function createUpdateCard(update, isAdmin = false) {
    // Format the date - include the update_date if available, otherwise use created_at
    const date = update.update_date ? new Date(update.update_date) : new Date(update.created_at);
    const formattedDate = date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Create card HTML
    let cardHtml = `
    <div class="card update-card mb-3">
        <div class="card-body">
            <h5 class="card-title">${update.title}</h5>
            <p class="update-date text-muted"><i class="bi bi-calendar"></i> ${formattedDate}</p>
            <div class="update-content">
                ${update.content}
            </div>
            ${isAdmin ? `
            <div class="mt-3">
                <button class="btn btn-sm btn-primary edit-update" data-id="${update.id}">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-secondary archive-update" data-id="${update.id}">
                    <i class="bi bi-archive"></i> Archive
                </button>
            </div>
            ` : ''}
        </div>
    </div>
    `;
    
    return cardHtml;
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