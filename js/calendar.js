// Prayer Calendar Module

// Load prayer calendar entries
async function loadPrayerCalendar() {
    if (!isApproved()) return;
    
    const container = document.getElementById('prayer-cards-container');
    container.innerHTML = createLoadingSpinner();
    
    try {
        const { data, error } = await supabase
            .from('prayer_calendar')
            .select(`
                id,
                day_of_month,
                name,
                image_url,
                prayer_points,
                is_user,
                user_id
            `)
            .order('day_of_month', { ascending: true });
            
        if (error) throw error;
        
        // Get current day of month
        const today = new Date().getDate();
        
        // Sort entries so today's entries come first
        const sortedEntries = [...data].sort((a, b) => {
            // Calculate distance from today (circular)
            const distA = (a.day_of_month - today + 31) % 31;
            const distB = (b.day_of_month - today + 31) % 31;
            return distA - distB;
        });
        
        if (sortedEntries.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        No prayer calendar entries found. Please check back later or contact an administrator.
                    </div>
                </div>
            `;
            return;
        }
        
        // Generate HTML for prayer cards
        let html = '';
        sortedEntries.forEach(entry => {
            html += createPrayerCard(entry);
        });
        
        container.innerHTML = html;
        
        // Add event listeners to view prayer card buttons
        document.querySelectorAll('.view-prayer-card').forEach(button => {
            button.addEventListener('click', () => {
                const entryId = button.getAttribute('data-id');
                const entry = sortedEntries.find(e => e.id === entryId);
                if (entry) {
                    showPrayerCardModal(entry);
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading prayer calendar:', error);
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Error loading prayer calendar: ${error.message}
                </div>
            </div>
        `;
    }
}

// Load calendar entries for admin view
async function loadCalendarAdmin() {
    if (!hasPermission('prayer_calendar_editor')) return;
    
    const container = document.getElementById('calendar-entries-table');
    container.innerHTML = `<tr><td colspan="4">${createLoadingSpinner()}</td></tr>`;
    
    try {
        // Load calendar entries
        const { data: entries, error: entriesError } = await supabase
            .from('prayer_calendar')
            .select(`
                id,
                day_of_month,
                name,
                is_user,
                user_id
            `)
            .order('day_of_month', { ascending: true });
            
        if (entriesError) throw entriesError;
        
        // Load approved users for dropdown
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, full_name, profile_image_url, prayer_points')
            .eq('approval_state', 'Approved')
            .order('full_name', { ascending: true });
            
        if (usersError) throw usersError;
        
        // Populate user dropdown
        const userSelect = document.getElementById('calendar-user');
        userSelect.innerHTML = '<option value="">Select a user...</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.full_name;
            // Store user data as attributes for easy retrieval
            option.setAttribute('data-image', user.profile_image_url || 'img/placeholder-profile.png');
            option.setAttribute('data-points', user.prayer_points || 'No prayer points available');
            userSelect.appendChild(option);
        });
        
        // Setup user selection preview
        userSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const previewImage = document.getElementById('user-preview-image');
            const previewName = document.getElementById('user-preview-name');
            const previewPoints = document.getElementById('user-preview-points');
            
            if (this.value) {
                previewImage.src = selectedOption.getAttribute('data-image');
                previewName.textContent = selectedOption.textContent;
                previewPoints.textContent = selectedOption.getAttribute('data-points');
            } else {
                previewImage.src = 'img/placeholder-profile.png';
                previewName.textContent = 'Selected user';
                previewPoints.textContent = 'Prayer points will appear here';
            }
        });
        
        // Show entries in table
        if (entries.length === 0) {
            container.innerHTML = `<tr><td colspan="4" class="text-center">No calendar entries found. Add your first entry using the form.</td></tr>`;
            return;
        }
        
        let html = '';
        entries.forEach(entry => {
            html += `
            <tr>
                <td class="align-middle">${entry.day_of_month}</td>
                <td class="align-middle">${entry.name}</td>
                <td class="align-middle">${entry.is_user ? '<span class="badge bg-primary">User</span>' : '<span class="badge bg-secondary">Other</span>'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-primary edit-calendar-entry" data-id="${entry.id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger delete-calendar-entry" data-id="${entry.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        });
        
        container.innerHTML = html;
        
        // Add event listeners
        setupCalendarAdminListeners(entries);
        
    } catch (error) {
        console.error('Error loading calendar admin view:', error);
        container.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error loading calendar entries: ${error.message}</td></tr>`;
    }
}

// Setup event listeners for calendar admin view
function setupCalendarAdminListeners(entries) {
    // Toggle between user and other entry types
    const entryTypeRadios = document.querySelectorAll('input[name="entry-type"]');
    const userContainer = document.getElementById('user-select-container');
    const otherContainer = document.getElementById('other-entry-container');
    
    entryTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'user') {
                userContainer.classList.remove('d-none');
                otherContainer.classList.add('d-none');
            } else {
                userContainer.classList.add('d-none');
                otherContainer.classList.remove('d-none');
            }
        });
    });
    
    // Form submission for adding entry
    document.getElementById('calendar-entry-form').addEventListener('submit', addCalendarEntry);
    
    // Edit calendar entry buttons
    document.querySelectorAll('.edit-calendar-entry').forEach(button => {
        button.addEventListener('click', () => {
            const entryId = button.getAttribute('data-id');
            const entry = entries.find(e => e.id === entryId);
            if (entry) {
                openEditCalendarModal(entry);
            }
        });
    });
    
    // Delete calendar entry buttons
    document.querySelectorAll('.delete-calendar-entry').forEach(button => {
        button.addEventListener('click', async () => {
            const entryId = button.getAttribute('data-id');
            const entry = entries.find(e => e.id === entryId);
            
            if (confirm(`Are you sure you want to delete the prayer calendar entry for ${entry.name} on day ${entry.day_of_month}?`)) {
                await deleteCalendarEntry(entryId);
            }
        });
    });
    
    // Save edited calendar entry
    document.getElementById('save-calendar-entry').addEventListener('click', saveCalendarEntry);
    
    // Cancel edit
    document.getElementById('cancel-edit-calendar').addEventListener('click', () => {
        // Using Bootstrap Modal API
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-calendar-modal'));
        if (modal) modal.hide();
    });
}

// Add a new calendar entry
async function addCalendarEntry(e) {
    e.preventDefault();
    
    const submitBtn = e.submitter;
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;
    
    try {
        const dayOfMonth = parseInt(document.getElementById('calendar-day').value);
        const entryType = document.querySelector('input[name="entry-type"]:checked').value;
        
        let name, imageUrl, prayerPoints, userId, isUser;
        
        if (entryType === 'user') {
            userId = document.getElementById('calendar-user').value;
            if (!userId) {
                throw new Error('Please select a user');
            }
            
            // Get user details
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, profile_image_url, prayer_points')
                .eq('id', userId)
                .single();
                
            if (error) throw error;
            
            name = data.full_name;
            imageUrl = data.profile_image_url;
            prayerPoints = data.prayer_points;
            isUser = true;
        } else {
            name = document.getElementById('calendar-name').value.trim();
            prayerPoints = document.getElementById('calendar-prayer-points').value.trim();
            isUser = false;
            
            if (!name) {
                throw new Error('Please enter a name');
            }
            
            // Handle image upload
            const imageFile = document.getElementById('calendar-image').files[0];
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `calendar/${fileName}`;
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('prayer-diary')
                    .upload(filePath, imageFile);
                    
                if (uploadError) throw uploadError;
                
                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('prayer-diary')
                    .getPublicUrl(filePath);
                    
                imageUrl = publicUrl;
            }
        }
        
        // Insert calendar entry
        const { data, error } = await supabase
            .from('prayer_calendar')
            .insert({
                day_of_month: dayOfMonth,
                name,
                image_url: imageUrl,
                prayer_points: prayerPoints,
                is_user: isUser,
                user_id: isUser ? userId : null,
                created_by: getUserId()
            });
            
        if (error) throw error;
        
        // Reset form
        document.getElementById('calendar-entry-form').reset();
        
        if (document.getElementById('calendar-image-preview')) {
            document.getElementById('calendar-image-preview').classList.add('d-none');
            document.getElementById('calendar-image-name').textContent = 'No file selected';
        }
        
        // Reset user preview
        const previewImage = document.getElementById('user-preview-image');
        const previewName = document.getElementById('user-preview-name');
        const previewPoints = document.getElementById('user-preview-points');
        
        if (previewImage && previewName && previewPoints) {
            previewImage.src = 'img/placeholder-profile.png';
            previewName.textContent = 'Selected user';
            previewPoints.textContent = 'Prayer points will appear here';
        }
        
        // Refresh calendar entries
        loadCalendarAdmin();
        
        showNotification('Success', 'Prayer calendar entry added successfully.');
        
    } catch (error) {
        console.error('Error adding calendar entry:', error);
        showNotification('Error', `Failed to add calendar entry: ${error.message}`);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Open edit calendar modal
async function openEditCalendarModal(entry) {
    const modalEl = document.getElementById('edit-calendar-modal');
    const modal = new bootstrap.Modal(modalEl);
    
    // We only support editing non-user entries for simplicity
    if (entry.is_user) {
        showNotification('Info', 'User entries cannot be directly edited. Please edit the user\'s profile instead.');
        return;
    }
    
    try {
        // Get full entry details
        const { data, error } = await supabase
            .from('prayer_calendar')
            .select('*')
            .eq('id', entry.id)
            .single();
            
        if (error) throw error;
        
        // Populate form
        document.getElementById('edit-calendar-id').value = data.id;
        document.getElementById('edit-calendar-day').value = data.day_of_month;
        document.getElementById('edit-calendar-name').value = data.name;
        document.getElementById('edit-calendar-prayer-points').value = data.prayer_points || '';
        
        // Display current image if available
        const imagePreview = document.getElementById('edit-calendar-image-preview');
        if (data.image_url) {
            imagePreview.src = data.image_url;
            imagePreview.classList.remove('d-none');
        } else {
            imagePreview.classList.add('d-none');
        }
        
        document.getElementById('edit-calendar-image-name').textContent = 'Current image';
        
        // Show modal
        modal.show();
        
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showNotification('Error', `Failed to load entry details: ${error.message}`);
    }
}

// Save edited calendar entry
async function saveCalendarEntry() {
    const saveBtn = document.getElementById('save-calendar-entry');
    const originalText = saveBtn.textContent;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
    saveBtn.disabled = true;
    
    try {
        const entryId = document.getElementById('edit-calendar-id').value;
        const dayOfMonth = parseInt(document.getElementById('edit-calendar-day').value);
        const name = document.getElementById('edit-calendar-name').value.trim();
        const prayerPoints = document.getElementById('edit-calendar-prayer-points').value.trim();
        
        if (!name) {
            throw new Error('Please enter a name');
        }
        
        // Get current entry to check if we need to update the image
        const { data: currentEntry, error: fetchError } = await supabase
            .from('prayer_calendar')
            .select('image_url')
            .eq('id', entryId)
            .single();
            
        if (fetchError) throw fetchError;
        
        let imageUrl = currentEntry.image_url;
        
        // Handle image upload if a new image is selected
        const imageFile = document.getElementById('edit-calendar-image').files[0];
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `calendar/${fileName}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('prayer-diary')
                .upload(filePath, imageFile);
                
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('prayer-diary')
                .getPublicUrl(filePath);
                
            imageUrl = publicUrl;
        }
        
        // Update calendar entry
        const { data, error } = await supabase
            .from('prayer_calendar')
            .update({
                day_of_month: dayOfMonth,
                name,
                image_url: imageUrl,
                prayer_points: prayerPoints
            })
            .eq('id', entryId);
            
        if (error) throw error;
        
        // Close modal using Bootstrap's Modal API
        const modalEl = document.getElementById('edit-calendar-modal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        // Refresh calendar entries
        loadCalendarAdmin();
        
        showNotification('Success', 'Prayer calendar entry updated successfully.');
        
    } catch (error) {
        console.error('Error updating calendar entry:', error);
        showNotification('Error', `Failed to update calendar entry: ${error.message}`);
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Delete a calendar entry
async function deleteCalendarEntry(entryId) {
    try {
        const { error } = await supabase
            .from('prayer_calendar')
            .delete()
            .eq('id', entryId);
            
        if (error) throw error;
        
        // Refresh calendar entries
        loadCalendarAdmin();
        
        showNotification('Success', 'Prayer calendar entry deleted successfully.');
        
    } catch (error) {
        console.error('Error deleting calendar entry:', error);
        showNotification('Error', `Failed to delete calendar entry: ${error.message}`);
    }
}