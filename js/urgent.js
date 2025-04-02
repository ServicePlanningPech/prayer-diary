// Urgent Prayer Requests Module

// Global variables for editors
let urgentEditor;
let editUrgentEditor;

// Initialize the Rich Text Editor for urgent prayers
function initUrgentEditor() {
    // Initialize urgent editor if not already initialized
    if (!urgentEditor) {
        urgentEditor = new Quill('#urgent-editor', {
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
            placeholder: 'Compose urgent prayer request...',
        });
    }
    
    // Initialize edit urgent editor if not already initialized
    if (!editUrgentEditor) {
        editUrgentEditor = new Quill('#edit-urgent-editor', {
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
            placeholder: 'Edit urgent prayer request...',
        });
    }
    
    // Set up form submission for creating urgent prayers
    document.getElementById('urgent-form').addEventListener('submit', createUrgentPrayer);
}

// Load all urgent prayer requests
async function loadUrgentPrayers() {
    if (!isApproved()) return;
    
    // Get container element
    const container = document.getElementById('urgent-prayers-container');
    
    // Show loading indicator
    container.innerHTML = createLoadingSpinner();
    
    try {
        // Load active urgent prayers
        const { data, error } = await supabase
            .from('urgent_prayers')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        // Display urgent prayers
        if (data.length === 0) {
            container.innerHTML = `
                <div class="notification is-info">
                    No urgent prayer requests at this time.
                </div>
            `;
        } else {
            let html = '';
            data.forEach(prayer => {
                html += createUrgentCard(prayer);
            });
            container.innerHTML = html;
        }
        
    } catch (error) {
        console.error('Error loading urgent prayers:', error);
        container.innerHTML = `
            <div class="notification is-danger">
                Error loading urgent prayer requests: ${error.message}
            </div>
        `;
    }
}

// Load urgent prayers for admin view
async function loadUrgentAdmin() {
    if (!hasPermission('urgent_prayer_editor')) return;
    
    // Get container element
    const container = document.getElementById('admin-urgent-container');
    
    // Show loading indicator
    container.innerHTML = createLoadingSpinner();
    
    try {
        // Load all urgent prayers (both active and inactive)
        const { data, error } = await supabase
            .from('urgent_prayers')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        // Display urgent prayers
        if (data.length === 0) {
            container.innerHTML = `
                <div class="notification is-info">
                    No urgent prayer requests have been created yet. Use the form to create one.
                </div>
            `;
        } else {
            let html = '';
            data.forEach(prayer => {
                html += `
                <div class="card mb-4 ${prayer.is_active ? 'urgent-card' : ''}">
                    <header class="card-header">
                        <p class="card-header-title">${prayer.title}</p>
                        <p class="card-header-icon">
                            <span class="tag ${prayer.is_active ? 'is-danger' : 'is-warning'}">
                                ${prayer.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </p>
                    </header>
                    <div class="card-content">
                        <p class="urgent-date">${formatDate(prayer.created_at)}</p>
                        <div class="content">
                            ${prayer.content}
                        </div>
                        <div class="buttons is-right">
                            <button class="button is-small is-primary edit-urgent" data-id="${prayer.id}">
                                <span class="icon"><i class="fas fa-edit"></i></span>
                                <span>Edit</span>
                            </button>
                            ${prayer.is_active ? `
                            <button class="button is-small is-warning deactivate-urgent" data-id="${prayer.id}">
                                <span class="icon"><i class="fas fa-times-circle"></i></span>
                                <span>Deactivate</span>
                            </button>
                            ` : `
                            <button class="button is-small is-success activate-urgent" data-id="${prayer.id}">
                                <span class="icon"><i class="fas fa-check-circle"></i></span>
                                <span>Activate</span>
                            </button>
                            `}
                            <button class="button is-small is-danger delete-urgent" data-id="${prayer.id}">
                                <span class="icon"><i class="fas fa-trash"></i></span>
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
                `;
            });
            container.innerHTML = html;
            
            // Add event listeners
            document.querySelectorAll('.edit-urgent').forEach(button => {
                button.addEventListener('click', () => {
                    const prayerId = button.getAttribute('data-id');
                    const prayer = data.find(p => p.id === prayerId);
                    if (prayer) {
                        openEditUrgentModal(prayer);
                    }
                });
            });
            
            document.querySelectorAll('.deactivate-urgent').forEach(button => {
                button.addEventListener('click', () => {
                    const prayerId = button.getAttribute('data-id');
                    toggleUrgentActive(prayerId, false);
                });
            });
            
            document.querySelectorAll('.activate-urgent').forEach(button => {
                button.addEventListener('click', () => {
                    const prayerId = button.getAttribute('data-id');
                    toggleUrgentActive(prayerId, true);
                });
            });
            
            document.querySelectorAll('.delete-urgent').forEach(button => {
                button.addEventListener('click', () => {
                    const prayerId = button.getAttribute('data-id');
                    deleteUrgentPrayer(prayerId);
                });
            });
        }
        
    } catch (error) {
        console.error('Error loading admin urgent prayers:', error);
        container.innerHTML = `
            <div class="notification is-danger">
                Error loading urgent prayer requests: ${error.message}
            </div>
        `;
    }
}

// Create a new urgent prayer request
async function createUrgentPrayer(e) {
    e.preventDefault();
    
    const submitBtn = e.submitter;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;
    
    try {
        const title = document.getElementById('urgent-title').value.trim();
        const content = urgentEditor.root.innerHTML;
        
        // Get notification preferences
        const sendEmail = document.getElementById('send-email').checked;
        const sendSms = document.getElementById('send-sms').checked;
        const sendWhatsapp = document.getElementById('send-whatsapp').checked;
        const sendPush = document.getElementById('send-push').checked;
        
        if (!title) {
            throw new Error('Please enter a title for the urgent prayer request');
        }
        
        if (!content || content === '<p><br></p>') {
            throw new Error('Please enter content for the urgent prayer request');
        }
        
        // Create the urgent prayer request
        const { data, error } = await supabase
            .from('urgent_prayers')
            .insert({
                title,
                content,
                created_by: getUserId(),
                is_active: true
            });
            
        if (error) throw error;
        
        // Reset form
        document.getElementById('urgent-form').reset();
        urgentEditor.setContents([]);
        
        // Reload urgent prayers
        loadUrgentAdmin();
        
        // Send notifications
        const notificationTypes = [];
        if (sendEmail) notificationTypes.push('email');
        if (sendSms) notificationTypes.push('sms');
        if (sendWhatsapp) notificationTypes.push('whatsapp');
        if (sendPush) notificationTypes.push('push');
        
        await sendNotification('urgent_prayer', title, notificationTypes);
        
        showNotification('Success', 'Urgent prayer request created and notifications sent successfully.');
        
    } catch (error) {
        console.error('Error creating urgent prayer:', error);
        showNotification('Error', `Failed to create urgent prayer request: ${error.message}`);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Open edit urgent prayer modal
function openEditUrgentModal(prayer) {
    // Populate form
    document.getElementById('edit-urgent-id').value = prayer.id;
    document.getElementById('edit-urgent-title-input').value = prayer.title;
    
    // Set content in Quill editor
    editUrgentEditor.root.innerHTML = prayer.content;
    
    // Show/hide activate/deactivate buttons based on current state
    if (prayer.is_active) {
        document.getElementById('activate-urgent').style.display = 'none';
        document.getElementById('deactivate-urgent').style.display = 'inline-block';
    } else {
        document.getElementById('activate-urgent').style.display = 'inline-block';
        document.getElementById('deactivate-urgent').style.display = 'none';
    }
    
    // Set up event listeners
    document.getElementById('save-urgent').onclick = saveUrgentPrayer;
    document.getElementById('deactivate-urgent').onclick = () => {
        toggleUrgentActive(prayer.id, false);
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-urgent-modal'));
        modal.hide();
    };
    document.getElementById('activate-urgent').onclick = () => {
        toggleUrgentActive(prayer.id, true);
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-urgent-modal'));
        modal.hide();
    };
    document.getElementById('delete-urgent').onclick = () => {
        deleteUrgentPrayer(prayer.id);
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-urgent-modal'));
        modal.hide();
    };
    
    // Show modal using Bootstrap
    const modal = new bootstrap.Modal(document.getElementById('edit-urgent-modal'));
    modal.show();
}

// Save edited urgent prayer
async function saveUrgentPrayer() {
    const saveBtn = document.getElementById('save-urgent');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
        const prayerId = document.getElementById('edit-urgent-id').value;
        const title = document.getElementById('edit-urgent-title-input').value.trim();
        const content = editUrgentEditor.root.innerHTML;
        
        if (!title) {
            throw new Error('Please enter a title for the urgent prayer request');
        }
        
        if (!content || content === '<p><br></p>') {
            throw new Error('Please enter content for the urgent prayer request');
        }
        
        // Update the urgent prayer
        const { data, error } = await supabase
            .from('urgent_prayers')
            .update({
                title,
                content
            })
            .eq('id', prayerId);
            
        if (error) throw error;
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-urgent-modal'));
        modal.hide();
        
        // Reload urgent prayers
        loadUrgentAdmin();
        
        showNotification('Success', 'Urgent prayer request saved successfully.');
        
    } catch (error) {
        console.error('Error saving urgent prayer:', error);
        showNotification('Error', `Failed to save urgent prayer request: ${error.message}`);
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Toggle active/inactive for an urgent prayer
async function toggleUrgentActive(prayerId, active) {
    try {
        // Update the urgent prayer
        const { data, error } = await supabase
            .from('urgent_prayers')
            .update({
                is_active: active
            })
            .eq('id', prayerId);
            
        if (error) throw error;
        
        // Reload urgent prayers
        loadUrgentAdmin();
        
        showNotification('Success', `Urgent prayer request ${active ? 'activated' : 'deactivated'} successfully.`);
        
    } catch (error) {
        console.error('Error toggling urgent prayer state:', error);
        showNotification('Error', `Failed to ${active ? 'activate' : 'deactivate'} urgent prayer request: ${error.message}`);
    }
}

// Delete an urgent prayer
async function deleteUrgentPrayer(prayerId) {
    if (!confirm('Are you sure you want to delete this urgent prayer request? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Delete the urgent prayer
        const { data, error } = await supabase
            .from('urgent_prayers')
            .delete()
            .eq('id', prayerId);
            
        if (error) throw error;
        
        // Reload urgent prayers
        loadUrgentAdmin();
        
        showNotification('Success', 'Urgent prayer request deleted successfully.');
        
    } catch (error) {
        console.error('Error deleting urgent prayer:', error);
        showNotification('Error', `Failed to delete urgent prayer request: ${error.message}`);
    }
}