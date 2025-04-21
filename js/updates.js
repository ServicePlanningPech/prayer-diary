// Prayer Updates Module

// Global variables for editors
let updateEditor;
let editUpdateEditor;
let initUpdateEditorFlag = false;
let selectedUpdateId = null; // Track selected update

// Initialize the Rich Text Editor for updates
function initUpdateEditor() {
    console.log('Initializing update editor');
    if (initUpdateEditorFlag) {
        console.log('Initializing update editor - duplicate call');
        return;
    }
        
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
        });
        
        // Add editor change handler to update button states
        updateEditor.on('text-change', function() {
            updateButtonStates();
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
    
    // Set default title with prefix
    const titleField = document.getElementById('update-title');
    if (titleField) {
        titleField.value = 'PECH Prayer Update';
    } else {
        console.error('Title field not found');
    }
    
    // Set up direct click handlers for buttons
    const saveAndSendBtn = document.getElementById('save-and-send-btn');
    const saveOnlyBtn = document.getElementById('save-only-btn');
    const clearBtn = document.getElementById('clear-btn');
    const editBtn = document.getElementById('edit-update-btn');
    const deleteBtn = document.getElementById('delete-update-btn');
    
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
    
    if (clearBtn) {
        clearBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearEditor();
        });
    } else {
        console.error('Clear button not found');
    }
    
    if (editBtn) {
        editBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (selectedUpdateId) {
                const selectedUpdate = getSelectedUpdate();
                if (selectedUpdate) {
                    loadUpdateIntoEditor(selectedUpdate);
                }
            }
        });
    } else {
        console.error('Edit update button not found');
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (selectedUpdateId) {
                deleteUpdate(selectedUpdateId);
            }
        });
    } else {
        console.error('Delete update button not found');
    }
    
    // Initial button state update
    updateButtonStates();
    
    initUpdateEditorFlag = true;
}

// Clear the editor with confirmation
function clearEditor() {
    // Show confirmation modal
    if (confirm('Are you sure you want to clear the current content? Any unsaved changes will be lost.')) {
        // Reset form
        document.getElementById('update-form').reset();
        updateEditor.setContents([]);
        
        // Set today's date in the date field
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        document.getElementById('update-date').value = formattedDate;
        
        // Reset default title
        document.getElementById('update-title').value = 'PECH Prayer Update';
        
        // Reset selection
        selectedUpdateId = null;
        updateButtonStates();
        
        // Clear selection highlight in the updates list
        const allRows = document.querySelectorAll('.update-list-item');
        allRows.forEach(row => row.classList.remove('selected'));
    }
}

// Update button states based on current content and selection
function updateButtonStates() {
    const saveAndSendBtn = document.getElementById('save-and-send-btn');
    const saveOnlyBtn = document.getElementById('save-only-btn');
    const editBtn = document.getElementById('edit-update-btn');
    const deleteBtn = document.getElementById('delete-update-btn');
    
    // Get current editor content
    const editorContent = updateEditor.root.innerHTML;
    const isEmpty = !editorContent || editorContent === '<p><br></p>';
    const titleContent = document.getElementById('update-title').value.trim();
    
    // Update Save buttons - enabled if both title and content exist
    if (saveAndSendBtn) {
        saveAndSendBtn.disabled = isEmpty || !titleContent;
    }
    
    if (saveOnlyBtn) {
        saveOnlyBtn.disabled = isEmpty || !titleContent;
    }
    
    // Update Edit button - enabled if editor is empty and an update is selected
    if (editBtn) {
        editBtn.disabled = !isEmpty || !selectedUpdateId;
    }
    
    // Update Delete button - enabled if an update is selected
    if (deleteBtn) {
        deleteBtn.disabled = !selectedUpdateId;
    }
}

// Get the currently selected update object
function getSelectedUpdate() {
    // This will be defined by the loadUpdatesAdmin function
    const allUpdatesData = window.allPrayerUpdates || [];
    return allUpdatesData.find(update => update.id === selectedUpdateId);
}

// Load all prayer updates (both current and archived)
async function loadPrayerUpdates() {
    if (!isApproved()) return;
    
    // Get container element
    const container = document.getElementById('updates-container');
    
    // Show loading indicator
    container.innerHTML = createLoadingSpinner();
    
    try {
        // Load all updates
        const { data: updates, error } = await supabase
            .from('prayer_updates')
            .select('*')
            .order('update_date', { ascending: false });
            
        if (error) throw error;
        
        // Display updates
        if (updates.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    No prayer updates available.
                </div>
            `;
        } else {
            let html = '';
            updates.forEach(update => {
                html += createUpdateCard(update);
            });
            container.innerHTML = html;
        }
        
    } catch (error) {
        console.error('Error loading prayer updates:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                Error loading prayer updates: ${error.message}
            </div>
        `;
    }
}

// Load updates for admin view
async function loadUpdatesAdmin() {
    if (!hasPermission('prayer_update_editor')) return;
    
    // Get container element for all updates
    const container = document.getElementById('admin-updates-container');
    
    // Show loading indicator
    container.innerHTML = createLoadingSpinner();
    
    try {
        // Load all updates ordered by date (most recent first)
        const { data: updates, error } = await supabase
            .from('prayer_updates')
            .select('*')
            .order('update_date', { ascending: false });
            
        if (error) throw error;
        
        // Store the updates data for later reference
        window.allPrayerUpdates = updates;
        
        // Display updates
        if (updates.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    No prayer updates available. Create one using the form.
                </div>
            `;
        } else {
            // Create a list to hold the update items
            let html = '<div class="list-group">';
            updates.forEach(update => {
                html += createUpdateListItem(update);
            });
            html += '</div>';
            container.innerHTML = html;
            
            // Add selection event listeners
            container.querySelectorAll('.update-list-item').forEach(item => {
                // Single click to select
                item.addEventListener('click', (e) => {
                    const updateId = item.getAttribute('data-id');
                    
                    // Remove selected class from all items
                    container.querySelectorAll('.update-list-item').forEach(row => {
                        row.classList.remove('selected');
                    });
                    
                    // Add selected class to clicked item
                    item.classList.add('selected');
                    
                    // Update selected ID
                    selectedUpdateId = updateId;
                    
                    // Update button states
                    updateButtonStates();
                });
                
                // Double click to edit
                item.addEventListener('dblclick', (e) => {
                    const updateId = item.getAttribute('data-id');
                    const update = updates.find(u => u.id === updateId);
                    
                    // Check if editor is empty before loading
                    const editorContent = updateEditor.root.innerHTML;
                    const isEmpty = !editorContent || editorContent === '<p><br></p>';
                    
                    if (isEmpty && update) {
                        loadUpdateIntoEditor(update);
                    } else if (!isEmpty) {
                        showNotification('Warning', 'Please clear the editor before editing an existing update.', 'warning');
                    }
                });
            });
        }
        
    } catch (error) {
        console.error('Error loading admin prayer updates:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                Error loading prayer updates: ${error.message}
            </div>
        `;
    }
}

// Create a list item for an update in the admin view
function createUpdateListItem(update) {
    // Format the date
    const date = update.update_date ? new Date(update.update_date) : new Date(update.created_at);
    const formattedDate = date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    let listItemHtml = `
    <div class="list-group-item d-flex justify-content-between align-items-center update-list-item" data-id="${update.id}">
        <div>
            <h6 class="mb-0">${update.title}</h6>
            <small class="text-muted"><i class="bi bi-calendar"></i> ${formattedDate}</small>
        </div>
        <div>
            ${update.is_archived ? 
                '<span class="badge bg-secondary">Archived</span>' : 
                '<span class="badge bg-success">Active</span>'}
        </div>
    </div>
    `;
    
    return listItemHtml;
}

// Load an update into the main editor
function loadUpdateIntoEditor(update) {
    // Set the title (full title including prefix)
    document.getElementById('update-title').value = update.title;
    
    // Set the date if available
    if (update.update_date) {
        document.getElementById('update-date').value = update.update_date;
    }
    
    // Set content in main Quill editor
    updateEditor.root.innerHTML = update.content;
    
    // Set the selected ID to prevent re-editing
    selectedUpdateId = update.id;
    
    // Update button states
    updateButtonStates();
    
    // Scroll to the editor
    document.getElementById('update-form').scrollIntoView({ behavior: 'smooth' });
    
    // Show a notification that we've loaded the update for editing
    showToast('Update Loaded', 'The prayer update has been loaded into the editor for you to modify.', 'info', 3000);
}

// Check if an update already exists for the specified date
async function checkDateExists(dateStr, updateId = null) {
    try {
        let query = supabase
            .from('prayer_updates')
            .select('id')
            .eq('update_date', dateStr);
            
        // If we're editing an existing update, exclude it from the check
        if (updateId) {
            query = query.neq('id', updateId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return data.length > 0;
    } catch (error) {
        console.error('Error checking date existence:', error);
        return false;
    }
}

// Create a new prayer update or update an existing one
async function createPrayerUpdate(action, submitBtn) {
    console.log('Creating prayer update with action:', action);
    
    // Get the original button text and disable the button
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        const title = document.getElementById('update-title').value.trim();
        const dateInput = document.getElementById('update-date').value;
        const content = updateEditor.root.innerHTML;
        
        console.log('Form values:', { title, dateInput });
        console.log('Content:', content);
        
        // Validate inputs
        if (!title) {
            throw new Error('Please enter a title for the prayer update');
        }
        
        if (!dateInput) {
            throw new Error('Please select a date for the prayer update');
        }
        
        if (!content || content === '<p><br></p>') {
            throw new Error('Please enter content for the prayer update');
        }
        
        // Check if we're editing an existing update or creating a new one
        const isEditing = selectedUpdateId !== null;
        
        // Check if the date already exists (for new entries or if changing date on edit)
        const dateExists = await checkDateExists(dateInput, isEditing ? selectedUpdateId : null);
        if (dateExists) {
            throw new Error('A prayer update for this date already exists. Please edit the existing update or choose a different date.');
        }
        
        if (isEditing) {
            console.log('Updating existing prayer update...');
            // Update the existing prayer update
            const { data, error } = await supabase
                .from('prayer_updates')
                .update({
                    title,
                    content,
                    update_date: dateInput
                })
                .eq('id', selectedUpdateId);
                
            if (error) {
                console.error('Database error:', error);
                throw error;
            }
            
            console.log('Prayer update updated successfully:', data);
        } else {
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
        }
        
        // Reset form and selection
        clearEditor();
        
        // Reload updates
        loadUpdatesAdmin();
        
        // Send notifications if that button was clicked
        if (action === 'saveAndSend') {
            // Call the distribution function
            console.log('Sending prayer update...');
            if (typeof sendPrayerUpdates === 'function') {
                await sendPrayerUpdates(title, content, dateInput);
                showNotification('Success', `Prayer update ${isEditing ? 'updated' : 'saved'} and sent successfully.`);
            } else {
                console.error('sendPrayerUpdates function not found');
                showNotification('Warning', `Prayer update ${isEditing ? 'updated' : 'saved'} but not sent - distribution module not loaded.`);
            }
        } else {
            showNotification('Success', `Prayer update ${isEditing ? 'updated' : 'saved'} successfully.`);
        }
        
    } catch (error) {
        console.error('Error creating/updating prayer update:', error);
        showNotification('Error', `Failed to ${selectedUpdateId ? 'update' : 'create'} prayer update: ${error.message}`);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
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
        
        // Reset selected ID if we deleted the currently selected update
        if (selectedUpdateId === updateId) {
            selectedUpdateId = null;
            updateButtonStates();
        }
        
        // Reload updates
        loadUpdatesAdmin();
        
        showNotification('Success', 'Prayer update deleted successfully.');
        
    } catch (error) {
        console.error('Error deleting prayer update:', error);
        showNotification('Error', `Failed to delete prayer update: ${error.message}`);
    }
}

// Create an update card (for regular view)
function createUpdateCard(update) {
    // Format the date - include the update_date if available, otherwise use created_at
    const date = update.update_date ? new Date(update.update_date) : new Date(update.created_at);
    const formattedDate = date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    // Full card for regular user view
    let cardHtml = `
    <div class="card update-card mb-3">
        <div class="card-body">
            <h5 class="card-title">${update.title}</h5>
            <p class="update-date text-muted"><i class="bi bi-calendar"></i> ${formattedDate}</p>
            <div class="update-content">
                ${update.content}
            </div>
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