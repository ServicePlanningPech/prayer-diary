// Prayer Calendar Module

// Variables to track state
let selectedDay = null;
let allUsers = [];
let filteredUsers = [];
let testDate = null;
let tapCount = 0;

// Function to format date with full month name
function formatDate(date) {
    const months = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
}

// Get the effective date (test date or current date)
function getEffectiveDate() {
    return testDate || new Date();
}

// Load prayer calendar entries
async function loadPrayerCalendar() {
    if (!isApproved()) return;
    
    const container = document.getElementById('prayer-cards-container');
    const titleElement = document.getElementById('daily-prayer-title');
    container.innerHTML = createLoadingSpinner();
    
    try {
        // Get current date or test date for determining which users to show
        const effectiveDate = getEffectiveDate();
        const currentDay = effectiveDate.getDate();
        const currentMonth = effectiveDate.getMonth() + 1; // JavaScript months are 0-indexed
        const isOddMonth = currentMonth % 2 === 1;
        
        // Update the date display with stylish container
        const dateStr = formatDate(effectiveDate);
        document.getElementById('current-date').textContent = dateStr;
        
        // Update the title with new torpedoed style and smaller font
        titleElement.innerHTML = `
            <div class="prayer-title-container mb-4 p-3 bg-primary text-white rounded shadow">
                <h4 class="mb-0">Daily Prayer for <span id="current-date">${dateStr}</span></h4>
            </div>
        `;
        
        // Get users with pray_day > 0 who should be shown this month
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                profile_image_url,
                prayer_points,
                pray_day,
                pray_months
            `)
            .eq('approval_state', 'Approved')
            .eq('pray_day', currentDay) // Only get entries for the current day
            .or(`pray_months.eq.0,pray_months.eq.${isOddMonth ? 1 : 2}`)
            .order('full_name', { ascending: true });
            
        if (userError) throw userError;
        
        // Get topics with pray_day matching the current day
        const { data: topicData, error: topicError } = await supabase
            .from('prayer_topics')
            .select('*')
            .eq('pray_day', currentDay)
            .or(`pray_months.eq.0,pray_months.eq.${isOddMonth ? 1 : 2}`)
            .order('topic_title', { ascending: true });
            
        if (topicError) throw topicError;
        
        // Map data directly to separate arrays for members and topics
        const membersToDisplay = userData.map(user => ({
            id: user.id,
            day_of_month: user.pray_day,
            name: user.full_name,
            image_url: user.profile_image_url,
            prayer_points: user.prayer_points,
            is_user: true,
            user_id: user.id,
            type: 'member'
        }));
        
        // Map topics directly
        const topicsToDisplay = topicData.map(topic => ({
            id: topic.id,
            day_of_month: topic.pray_day,
            name: topic.topic_title,
            image_url: topic.topic_image_url,
            prayer_points: topic.topic_text,
            is_user: false,
            type: 'topic'
        }));
        
        // Combine both types of entries for checking if any exist
        const prayerEntries = [...membersToDisplay, ...topicsToDisplay];
        
        // Check if we have any entries to display
        if (prayerEntries.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        No prayer subjects assigned for ${dateStr}. Please check back later or contact an administrator.
                    </div>
                </div>
            `;
            return;
        }
        
        // Generate HTML for prayer cards
        let html = '';
        
        // Add member entries
        if (membersToDisplay.length > 0) {
            membersToDisplay.forEach(entry => {
                html += createPrayerCard(entry);
            });
        }
        
        // Add simple divider if we have both types
        if (membersToDisplay.length > 0 && topicsToDisplay.length > 0) {
            html += `
                <div class="col-12 my-4">
                    <hr class="divider">
                </div>
            `;
        }
        
        // Add topic entries
        if (topicsToDisplay.length > 0) {
            topicsToDisplay.forEach(entry => {
                html += createPrayerCard(entry);
            });
        }
        
        container.innerHTML = html;
        
        // No event listeners needed as cards are not interactive
        
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

// Create a prayer card HTML
function createPrayerCard(entry) {
    const imgSrc = entry.image_url || 'img/placeholder-profile.png';
    
    // Add badge based on type (member or topic)
    const typeBadge = entry.type === 'topic' 
        ? '<span class="badge bg-info position-absolute top-0 end-0 m-2">Topic</span>' 
        : '';
    
    // Format prayer points: preserve HTML formatting for topics
    let prayerPointsDisplay = 'No prayer points available.';
    
    if (entry.prayer_points) {
        if (entry.type === 'topic') {
            // For topics, preserve HTML formatting but limit length
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = entry.prayer_points;
            
            // Get a preview of the HTML content
            if (tempDiv.textContent && tempDiv.textContent.length > 100) {
                // If content is too long, get a portion of the HTML
                // This keeps some formatting but truncates the content
                const truncatedHTML = entry.prayer_points.substring(0, 250);
                prayerPointsDisplay = truncatedHTML + '...';
            } else {
                // If content is short enough, display all HTML
                prayerPointsDisplay = entry.prayer_points;
            }
        } else {
            // For members, display as is
            prayerPointsDisplay = entry.prayer_points;
        }
    }
    
    return `
    <div class="col">
        <div class="card h-100 shadow prayer-card" data-entry-id="${entry.id}" data-entry-type="${entry.type || 'member'}">
            ${typeBadge}
            <div class="image-container">
                <img src="${imgSrc}" class="prayer-profile-img" alt="${entry.name}">
            </div>
            <div class="card-body">
                <h5 class="card-title prayer-card-title">${entry.name}</h5>
                <div class="card-text prayer-points-preview">
                    ${entry.type === 'topic' ? prayerPointsDisplay : `<p>${prayerPointsDisplay}</p>`}
                </div>
            </div>
        </div>
    </div>
    `;
}

// Prayer card listeners function is no longer needed since cards display all information directly

// View prayer card details
async function viewPrayerCard(userId) {
    try {
        // Get user details
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error) throw error;
        
        // Set modal content
        document.getElementById('card-modal-title').textContent = data.full_name;
        document.getElementById('card-image').src = data.profile_image_url || 'img/placeholder-profile.png';
        document.getElementById('card-content').innerHTML = `
            <h4 class="mb-3">${data.full_name}</h4>
            <div>
                ${data.prayer_points || 'No prayer points available.'}
            </div>
        `;
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('view-card-modal'));
        modal.show();
        
    } catch (error) {
        console.error('Error viewing prayer card:', error);
        showNotification('Error', `Failed to load user details: ${error.message}`, 'error');
    }
}

// Create loading spinner
function createLoadingSpinner() {
    return `
    <div class="d-flex justify-content-center align-items-center" style="height: 200px;">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>
    `;
}

// Initialize calendar management
async function initCalendarManagement() {
    if (!hasPermission('prayer_calendar_editor')) return;

    createCalendarDaysGrid();
    await loadAllUsers();
    setupEventListeners();
}

// Create the calendar days grid (1-31)
function createCalendarDaysGrid() {
    const container = document.querySelector('.calendar-days-grid');
    container.innerHTML = '';
    
    for (let day = 1; day <= 31; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        dayElement.dataset.day = day;
        
        dayElement.addEventListener('click', () => {
            // Remove selected class from all days
            document.querySelectorAll('.calendar-day').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Add selected class to clicked day
            dayElement.classList.add('selected');
            selectedDay = day;
            document.getElementById('selected-day').textContent = day;
        });
        
        container.appendChild(dayElement);
    }
}

// Load all users from the profiles table
async function loadAllUsers() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, profile_image_url, prayer_points, pray_day, pray_months, approval_state')
            .eq('approval_state', 'Approved')
            .not('full_name', 'eq', 'Super Admin') // Exclude Super Admin from the list
            .order('pray_day', { ascending: true })
            .order('full_name', { ascending: true });
            
        if (error) throw error;
        
        allUsers = data;
        filterAndDisplayUsers();
        
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error', `Failed to load users: ${error.message}`);
    }
}

// Filter and display users based on search term and allocation status
function filterAndDisplayUsers(searchTerm = '') {
    // Filter users based on search term
    if (searchTerm) {
        filteredUsers = allUsers.filter(user => 
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    } else {
        filteredUsers = [...allUsers];
    }
    
    // Separate users into allocated and unallocated
    const unallocatedUsers = filteredUsers.filter(user => user.pray_day === 0);
    const allocatedUsers = filteredUsers.filter(user => user.pray_day > 0);
    
    // Sort allocated users by day
    allocatedUsers.sort((a, b) => a.pray_day - b.pray_day);
    
    displayUserList(unallocatedUsers, 'unallocated-members-list', false);
    displayUserList(allocatedUsers, 'allocated-members-list', true);
}

// Display a list of users in the specified container
function displayUserList(users, containerId, isAllocated) {
    const container = document.getElementById(containerId);
    
    if (users.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No members found</div>';
        return;
    }
    
    let html = '';
    
    users.forEach(user => {
        const imgSrc = user.profile_image_url || 'img/placeholder-profile.png';
        
        if (isAllocated) {
            // Template for assigned users
            html += `
            <div class="member-card" data-user-id="${user.id}">
                <div class="member-top-row">
                    <div class="member-img-container">
                        <img src="${imgSrc}" alt="${user.full_name}" class="member-img">
                    </div>
                    <div class="member-name-container">
                        <div class="member-name">${user.full_name}</div>
                    </div>
                </div>
                <div class="member-badge-row">
                    <span class="badge bg-primary day-badge-inline">Day ${user.pray_day}</span>
                </div>
                <div class="member-bottom-row">
                    <select class="form-select month-selector" data-user-id="${user.id}">
                        <option value="0" ${user.pray_months === 0 ? 'selected' : ''}>All months</option>
                        <option value="1" ${user.pray_months === 1 ? 'selected' : ''}>Odd months</option>
                        <option value="2" ${user.pray_months === 2 ? 'selected' : ''}>Even months</option>
                    </select>
                    <button class="btn btn-primary assign-user" data-user-id="${user.id}">
                        Reassign
                    </button>
                </div>
            </div>
            `;
        } else {
            // Template for unassigned users
            html += `
            <div class="member-card" data-user-id="${user.id}">
                <div class="member-top-row">
                    <div class="member-img-container">
                        <img src="${imgSrc}" alt="${user.full_name}" class="member-img">
                    </div>
                    <div class="member-name-container">
                        <div class="member-name">${user.full_name}</div>
                    </div>
                </div>
                <div class="member-bottom-row">
                    <select class="form-select month-selector" data-user-id="${user.id}">
                        <option value="0" ${user.pray_months === 0 ? 'selected' : ''}>All months</option>
                        <option value="1" ${user.pray_months === 1 ? 'selected' : ''}>Odd months</option>
                        <option value="2" ${user.pray_months === 2 ? 'selected' : ''}>Even months</option>
                    </select>
                    <button class="btn btn-primary assign-user" data-user-id="${user.id}">
                        Assign
                    </button>
                </div>
            </div>
            `;
        }
    });
    
    container.innerHTML = html;
    
    // Add event listeners to assign buttons
    container.querySelectorAll('.assign-user').forEach(button => {
        button.addEventListener('click', () => {
            const userId = button.dataset.userId;
            assignUserToDay(userId);
        });
    });
    
    // Add event listeners to month selectors
    container.querySelectorAll('.month-selector').forEach(select => {
        select.addEventListener('change', function() {
            const userId = this.dataset.userId;
            const months = parseInt(this.value);
            updateUserMonths(userId, months);
        });
    });
}

// Assign a user to the selected day
async function assignUserToDay(userId) {
    if (!selectedDay) {
        showNotification('Warning', 'Please select a day first', 'warning');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ pray_day: selectedDay })
            .eq('id', userId);
            
        if (error) throw error;
        
        // Update local data
        const userIndex = allUsers.findIndex(user => user.id === userId);
        if (userIndex >= 0) {
            allUsers[userIndex].pray_day = selectedDay;
        }
        
        // Refresh display
        filterAndDisplayUsers();
        
        showNotification('Success', 'User assigned to day ' + selectedDay, 'success');
        
    } catch (error) {
        console.error('Error assigning user:', error);
        showNotification('Error', `Failed to assign user: ${error.message}`);
    }
}

// Update the user's months settings
async function updateUserMonths(userId, months) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ pray_months: months })
            .eq('id', userId);
            
        if (error) throw error;
        
        // Update local data
        const userIndex = allUsers.findIndex(user => user.id === userId);
        if (userIndex >= 0) {
            allUsers[userIndex].pray_months = months;
        }
        
        showNotification('Success', 'Month settings updated', 'success');
        
    } catch (error) {
        console.error('Error updating months:', error);
        showNotification('Error', `Failed to update months: ${error.message}`);
        
        // Reset the select element to its previous value
        const user = allUsers.find(u => u.id === userId);
        const select = document.querySelector(`.month-selector[data-user-id="${userId}"]`);
        if (user && select) {
            select.value = user.pray_months;
        }
    }
}

// Set up event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('member-search');
    searchInput.addEventListener('input', () => {
        filterAndDisplayUsers(searchInput.value);
    });
    
    // Clear search when switching tabs
    document.querySelectorAll('#memberListTab button').forEach(tab => {
        tab.addEventListener('click', () => {
            searchInput.value = '';
            filterAndDisplayUsers();
        });
    });
}

// Modified loadCalendarAdmin to initialize the new UI
async function loadCalendarAdmin() {
    if (!hasPermission('prayer_calendar_editor')) return;
    
    // Initialize the new calendar management UI
    await initCalendarManagement();
}