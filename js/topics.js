// Prayer Topics Management Module

// Variables to track state
let allTopics = [];
let filteredTopics = [];
let topicEditor = null;
let currentTopicId = null;
let editorInitialized = false;

// Initialize topics functionality
function initTopics() {
    if (!hasPermission('prayer_calendar_editor')) return;
    
    // Only initialize the editor once
    if (!editorInitialized) {
        // Set up the Quill editor for topic text
        topicEditor = new Quill('#topic-text-editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            },
            placeholder: 'Enter topic text...'
        });
        
        // Set up image selection for topic
        document.getElementById('select-topic-image').addEventListener('click', () => {
            document.getElementById('topic-image').click();
        });
        
        document.getElementById('topic-image').addEventListener('change', handleTopicImageSelection);
        
        // Set up topic form validation
        document.getElementById('topic-title').addEventListener('input', validateTopicForm);
        topicEditor.on('text-change', validateTopicForm);
        
        // Set up save topic button
        document.getElementById('save-topic').addEventListener('click', saveTopic);
        
        editorInitialized = true;
    }
    
    // These event listeners can be set up each time
    // Set up edit topics button
    document.getElementById('edit-topics-btn').addEventListener('click', openTopicManagement);
    
    // Set up add topic button
    document.getElementById('add-topic-btn').addEventListener('click', openAddTopicModal);
    
    // Set up search functionality
    document.getElementById('topic-search').addEventListener('input', function() {
        filterAndDisplayTopics(this.value);
    });
    
    // Load topics data
    loadTopics();
    
    // Create calendar days grid in the Topics tab
    createTopicsCalendarGrid();
}

// Create calendar days grid for the Topics tab
function createTopicsCalendarGrid() {
    const container = document.querySelector('#other-content .calendar-days-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let day = 1; day <= 31; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        dayElement.dataset.day = day;
        
        dayElement.addEventListener('click', () => {
            // Remove selected class from all days
            document.querySelectorAll('#other-content .calendar-day').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Add selected class to clicked day
            dayElement.classList.add('selected');
            document.getElementById('topics-selected-day').textContent = day;
        });
        
        container.appendChild(dayElement);
    }
}

// Validate topic form
function validateTopicForm() {
    const titleField = document.getElementById('topic-title');
    const saveButton = document.getElementById('save-topic');
    
    // Check if title and text are provided
    const hasTitle = titleField.value.trim().length > 0;
    const hasText = topicEditor && topicEditor.getText().trim().length > 5; // At least a few characters
    
    // Enable/disable save button
    saveButton.disabled = !(hasTitle && hasText);
}

// Handle topic image selection
function handleTopicImageSelection(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
        showNotification('Error', 'Please select a valid image file (JPEG, PNG, GIF, WebP)', 'error');
        e.target.value = '';
        return;
    }
    
    // Preview the image
    const reader = new FileReader();
    reader.onload = function(event) {
        document.getElementById('topic-image-preview').src = event.target.result;
    };
    reader.readAsDataURL(file);
    
    // Force validation after image selection
    validateTopicForm();
}

// Open topic management modal
async function openTopicManagement() {
    // Refresh topics list
    await loadTopics();
    
    // Generate HTML for topics list
    let html = '';
    if (allTopics.length === 0) {
        html = '<div class="alert alert-info">No topics found. Click "Add Topic" to create one.</div>';
    } else {
        html = '<div class="list-group">';
        allTopics.forEach(topic => {
            html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="mb-1">${topic.topic_title}</h5>
                    <small class="text-muted">Day: ${topic.pray_day > 0 ? topic.pray_day : 'Unassigned'}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-primary edit-topic-btn" data-topic-id="${topic.id}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-topic-btn" data-topic-id="${topic.id}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </div>
            `;
        });
        html += '</div>';
    }
    
    // Update the modal content
    document.getElementById('topics-list-container').innerHTML = html;
    
    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-topic-btn').forEach(button => {
        button.addEventListener('click', () => {
            const topicId = button.dataset.topicId;
            openEditTopicModal(topicId);
        });
    });
    
    document.querySelectorAll('.delete-topic-btn').forEach(button => {
        button.addEventListener('click', () => {
            const topicId = button.dataset.topicId;
            confirmDeleteTopic(topicId);
        });
    });
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('topic-management-modal'));
    modal.show();
}

// Open add topic modal
function openAddTopicModal() {
    // Close the management modal
    const managementModal = bootstrap.Modal.getInstance(document.getElementById('topic-management-modal'));
    if (managementModal) {
        managementModal.hide();
    }
    
    // Reset form
    document.getElementById('topic-form').reset();
    document.getElementById('topic-id').value = '';
    currentTopicId = null;
    document.getElementById('topic-image-preview').src = 'img/placeholder-profile.png';
    
    // Clear Quill editor
    if (topicEditor) {
        topicEditor.root.innerHTML = '';
    }
    
    // Update modal title
    document.getElementById('topic-edit-title').textContent = 'Add Prayer Topic';
    
    // Disable save button until form is valid
    document.getElementById('save-topic').disabled = true;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('topic-edit-modal'));
    modal.show();
    
    // Force validation to update button state
    setTimeout(validateTopicForm, 100);
}

// Open edit topic modal
function openEditTopicModal(topicId) {
    // Close the management modal
    const managementModal = bootstrap.Modal.getInstance(document.getElementById('topic-management-modal'));
    if (managementModal) {
        managementModal.hide();
    }
    
    // Find the topic in our data
    const topic = allTopics.find(t => t.id === topicId);
    if (!topic) {
        showNotification('Error', 'Topic not found', 'error');
        return;
    }
    
    // Set current topic ID
    currentTopicId = topicId;
    document.getElementById('topic-id').value = topicId;
    
    // Fill the form with topic data
    document.getElementById('topic-title').value = topic.topic_title;
    
    // Set Quill editor content
    if (topicEditor) {
        topicEditor.root.innerHTML = topic.topic_text;
    }
    
    // Set image preview
    if (topic.topic_image_url) {
        document.getElementById('topic-image-preview').src = topic.topic_image_url;
    } else {
        document.getElementById('topic-image-preview').src = 'img/placeholder-profile.png';
    }
    
    // Update modal title
    document.getElementById('topic-edit-title').textContent = 'Edit Prayer Topic';
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('topic-edit-modal'));
    modal.show();
    
    // Force validation to update button state
    setTimeout(validateTopicForm, 100);
}

// Save topic
async function saveTopic() {
    try {
        const saveButton = document.getElementById('save-topic');
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        
        const topicId = document.getElementById('topic-id').value;
        const isNewTopic = !topicId;
        
        // Get form data
        const topicTitle = document.getElementById('topic-title').value.trim();
        const topicText = topicEditor ? topicEditor.root.innerHTML : '';
        
        // Handle image upload first if there is one
        let topicImageUrl = null;
        const imageInput = document.getElementById('topic-image');
        
        if (imageInput.files && imageInput.files[0]) {
            try {
                console.log('Uploading image file...');
                // Upload the image
                const file = imageInput.files[0];
                const fileName = `topic_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                
                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('prayer-diary')
                    .upload(`topic_images/${fileName}`, file, {
                        cacheControl: '3600',
                        upsert: false
                    });
                    
                if (uploadError) {
                    console.error('Image upload error:', uploadError);
                    throw uploadError;
                }
                
                console.log('Image uploaded successfully, getting URL...');
                
                // Get the public URL with a 10-year expiry
                const tenYearsInSeconds = 60 * 60 * 24 * 365 * 10;
                const { data: urlData, error: urlError } = await supabase.storage
                    .from('prayer-diary')
                    .createSignedUrl(`topic_images/${fileName}`, tenYearsInSeconds);
                    
                if (urlError) {
                    console.error('URL generation error:', urlError);
                    throw urlError;
                }
                
                if (!urlData || !urlData.signedUrl) {
                    throw new Error('Failed to get signed URL');
                }
                
                topicImageUrl = urlData.signedUrl;
                console.log('Image URL generated:', topicImageUrl);
            } catch (imageError) {
                console.error('Error processing image:', imageError);
                showNotification('Warning', 'Could not process image, but continuing to save topic', 'warning');
            }
        } else if (!isNewTopic) {
            // If editing and no new image selected, keep existing URL
            const existingTopic = allTopics.find(t => t.id === topicId);
            if (existingTopic && existingTopic.topic_image_url) {
                topicImageUrl = existingTopic.topic_image_url;
            }
        }
        
        // Prepare topic data
        const topicData = {
            topic_title: topicTitle,
            topic_text: topicText,
            topic_image_url: topicImageUrl
        };
        
        // Add or update the topic
        let result;
        if (isNewTopic) {
            // Create new topic
            topicData.created_by = getUserId();
            topicData.pray_day = 0; // Unassigned by default
            topicData.pray_months = 0; // All months by default
            
            result = await supabase
                .from('prayer_topics')
                .insert(topicData);
        } else {
            // Update existing topic
            topicData.updated_at = new Date().toISOString();
            
            result = await supabase
                .from('prayer_topics')
                .update(topicData)
                .eq('id', topicId);
        }
        
        if (result.error) throw result.error;
        
        // Refresh topics list
        await loadTopics();
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('topic-edit-modal'));
        if (modal) {
            modal.hide();
        }
        
        // Show success notification
        showNotification(
            'Success', 
            isNewTopic ? 'Topic created successfully' : 'Topic updated successfully',
            'success'
        );
        
        // Open the topic management modal again to show the updated list
        openTopicManagement();
        
    } catch (error) {
        console.error('Error saving topic:', error);
        showNotification('Error', `Failed to save topic: ${error.message}`, 'error');
    } finally {
        // Reset save button
        const saveButton = document.getElementById('save-topic');
        saveButton.disabled = false;
        saveButton.textContent = 'Save Topic';
    }
}

// Confirm topic deletion
function confirmDeleteTopic(topicId) {
    // Find the topic
    const topic = allTopics.find(t => t.id === topicId);
    
    if (!confirm(`Are you sure you want to delete the topic "${topic.topic_title}"? This action cannot be undone.`)) {
        return;
    }
    
    deleteTopic(topicId);
}

// Delete topic
async function deleteTopic(topicId) {
    try {
        // Delete the topic
        const { error } = await supabase
            .from('prayer_topics')
            .delete()
            .eq('id', topicId);
        
        if (error) throw error;
        
        // Refresh topics list
        await loadTopics();
        
        // Show success notification
        showNotification('Success', 'Topic deleted successfully', 'success');
        
        // Refresh the modal content
        openTopicManagement();
        
    } catch (error) {
        console.error('Error deleting topic:', error);
        showNotification('Error', `Failed to delete topic: ${error.message}`, 'error');
    }
}

// Load all topics
async function loadTopics() {
    try {
        const { data, error } = await supabase
            .from('prayer_topics')
            .select('*')
            .order('pray_day', { ascending: true })
            .order('topic_title', { ascending: true });
        
        if (error) throw error;
        
        allTopics = data || [];
        filterAndDisplayTopics();
        
        return allTopics;
    } catch (error) {
        console.error('Error loading topics:', error);
        showNotification('Error', `Failed to load topics: ${error.message}`, 'error');
        return [];
    }
}

// Filter and display topics
function filterAndDisplayTopics(searchTerm = '') {
    // Filter topics based on search term
    if (searchTerm) {
        filteredTopics = allTopics.filter(topic => 
            topic.topic_title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    } else {
        filteredTopics = [...allTopics];
    }
    
    // Separate topics into allocated and unallocated
    const unallocatedTopics = filteredTopics.filter(topic => topic.pray_day === 0);
    const allocatedTopics = filteredTopics.filter(topic => topic.pray_day > 0);
    
    // Sort allocated topics by day
    allocatedTopics.sort((a, b) => a.pray_day - b.pray_day);
    
    displayTopicList(unallocatedTopics, 'unallocated-topics-list', false);
    displayTopicList(allocatedTopics, 'allocated-topics-list', true);
}

// Display a list of topics in the specified container
function displayTopicList(topics, containerId, isAllocated) {
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error(`Container not found: ${containerId}`);
        return;
    }
    
    if (topics.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No topics found</div>';
        return;
    }
    
    let html = '';
    
    topics.forEach(topic => {
        const imgSrc = topic.topic_image_url || 'img/placeholder-profile.png';
        
        if (isAllocated) {
            // Template for assigned topics
            html += `
            <div class="topic-card" data-topic-id="${topic.id}">
                <div class="topic-top-row">
                    <div class="topic-img-container">
                        <img src="${imgSrc}" alt="${topic.topic_title}" class="topic-img">
                    </div>
                    <div class="topic-title-container">
                        <div class="topic-title">${topic.topic_title}</div>
                    </div>
                </div>
                <div class="topic-badge-row">
                    <span class="badge bg-primary day-badge-inline">Day ${topic.pray_day}</span>
                </div>
                <div class="topic-bottom-row">
                    <select class="form-select month-selector" data-topic-id="${topic.id}">
                        <option value="0" ${topic.pray_months === 0 ? 'selected' : ''}>All months</option>
                        <option value="1" ${topic.pray_months === 1 ? 'selected' : ''}>Odd months</option>
                        <option value="2" ${topic.pray_months === 2 ? 'selected' : ''}>Even months</option>
                    </select>
                    <button class="btn btn-primary assign-topic" data-topic-id="${topic.id}">
                        Reassign
                    </button>
                </div>
            </div>
            `;
        } else {
            // Template for unassigned topics
            html += `
            <div class="topic-card" data-topic-id="${topic.id}">
                <div class="topic-top-row">
                    <div class="topic-img-container">
                        <img src="${imgSrc}" alt="${topic.topic_title}" class="topic-img">
                    </div>
                    <div class="topic-title-container">
                        <div class="topic-title">${topic.topic_title}</div>
                    </div>
                </div>
                <div class="topic-bottom-row">
                    <select class="form-select month-selector" data-topic-id="${topic.id}">
                        <option value="0" ${topic.pray_months === 0 ? 'selected' : ''}>All months</option>
                        <option value="1" ${topic.pray_months === 1 ? 'selected' : ''}>Odd months</option>
                        <option value="2" ${topic.pray_months === 2 ? 'selected' : ''}>Even months</option>
                    </select>
                    <button class="btn btn-primary assign-topic" data-topic-id="${topic.id}">
                        Assign
                    </button>
                </div>
            </div>
            `;
        }
    });
    
    container.innerHTML = html;
    
    // Add event listeners to assign buttons
    container.querySelectorAll('.assign-topic').forEach(button => {
        button.addEventListener('click', () => {
            const topicId = button.dataset.topicId;
            assignTopicToDay(topicId);
        });
    });
    
    // Add event listeners to month selectors
    container.querySelectorAll('.month-selector').forEach(select => {
        select.addEventListener('change', function() {
            const topicId = this.dataset.topicId;
            const months = parseInt(this.value);
            updateTopicMonths(topicId, months);
        });
    });
}

// Assign a topic to the selected day
async function assignTopicToDay(topicId) {
    const selectedDay = parseInt(document.getElementById('topics-selected-day').textContent);
    
    if (isNaN(selectedDay) || selectedDay < 1 || selectedDay > 31) {
        showNotification('Warning', 'Please select a valid day first', 'warning');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('prayer_topics')
            .update({ pray_day: selectedDay })
            .eq('id', topicId);
            
        if (error) throw error;
        
        // Update local data
        const topicIndex = allTopics.findIndex(topic => topic.id === topicId);
        if (topicIndex >= 0) {
            allTopics[topicIndex].pray_day = selectedDay;
        }
        
        // Refresh display
        filterAndDisplayTopics();
        
        showNotification('Success', 'Topic assigned to day ' + selectedDay, 'success');
        
    } catch (error) {
        console.error('Error assigning topic:', error);
        showNotification('Error', `Failed to assign topic: ${error.message}`, 'error');
    }
}

// Update the topic's months settings
async function updateTopicMonths(topicId, months) {
    try {
        const { data, error } = await supabase
            .from('prayer_topics')
            .update({ pray_months: months })
            .eq('id', topicId);
            
        if (error) throw error;
        
        // Update local data
        const topicIndex = allTopics.findIndex(topic => topic.id === topicId);
        if (topicIndex >= 0) {
            allTopics[topicIndex].pray_months = months;
        }
        
        showNotification('Success', 'Month settings updated', 'success');
        
    } catch (error) {
        console.error('Error updating months:', error);
        showNotification('Error', `Failed to update months: ${error.message}`, 'error');
        
        // Reset the select element to its previous value
        const topic = allTopics.find(t => t.id === topicId);
        const select = document.querySelector(`.month-selector[data-topic-id="${topicId}"]`);
        if (topic && select) {
            select.value = topic.pray_months;
        }
    }
}

// Function to view a topic card
async function viewTopicCard(topicId) {
    try {
        // Get the topic details
        const { data, error } = await supabase
            .from('prayer_topics')
            .select('*')
            .eq('id', topicId)
            .single();
            
        if (error) throw error;
        
        // Set modal content
        document.getElementById('card-modal-title').textContent = data.topic_title;
        document.getElementById('card-image').src = data.topic_image_url || 'img/placeholder-profile.png';
        document.getElementById('card-content').innerHTML = `
            <div>
                ${data.topic_text}
            </div>
        `;
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('view-card-modal'));
        modal.show();
        
    } catch (error) {
        console.error('Error viewing topic card:', error);
        showNotification('Error', `Failed to load topic details: ${error.message}`, 'error');
    }
}

// Initialize topics on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize topics functionality when the "other-tab" (now "Assign Topics") is clicked
    document.getElementById('other-tab').addEventListener('click', () => {
        initTopics();
    });
});
