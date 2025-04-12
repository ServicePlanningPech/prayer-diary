// Prayer Calendar Module

// Variables to track state
let selectedDay = null;
let allUsers = [];
let filteredUsers = [];

// Load prayer calendar entries
async function loadPrayerCalendar() {
    if (!isApproved()) return;
    
    const container = document.getElementById('prayer-cards-container');
    container.innerHTML = createLoadingSpinner();
    
    try {
        // Get current date for determining which users to show based on month
        const currentDate = new Date();
        const currentDay = currentDate.getDate();
        const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
        const isOddMonth = currentMonth % 2 === 1;
        
        // Get users with pray_day > 0 who should be shown this month
        const { data, error } = await supabase
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
            .gt('pray_day', 0)
            .or(`pray_months.eq.0,pray_months.eq.${isOddMonth ? 1 : 2}`)
            .order('pray_day', { ascending: true });
            
        if (error) throw error;
        
        // Transform user data to match the old format for compatibility
        let prayerEntries = data.map(user => ({
            id: user.id,
            day_of_month: user.pray_day,
            name: user.full_name,
            image_url: user.profile_image_url,
            prayer_points: user.prayer_points,
            is_user: true,
            user_id: user.id
        }));
        
        // Sort entries so today's entries come first
        const sortedEntries = [...prayerEntries].sort((a, b) => {
            // Calculate distance from today (circular)
            const distA = (a.day_of_month - currentDay + 31) % 31;
            const distB = (b.day_of_month - currentDay + 31) % 31;
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
                <div class="member-layout">
                    <div class="member-left">
                        <div class="member-img-container">
                            <img src="${imgSrc}" alt="${user.full_name}" class="member-img">
                        </div>
                        <div class="member-day-badge">
                            <span class="badge bg-primary">Day ${user.pray_day}</span>
                        </div>
                        <div class="member-controls">
                            <select class="form-select form-select-sm month-selector" data-user-id="${user.id}">
                                <option value="0" ${user.pray_months === 0 ? 'selected' : ''}>All months</option>
                                <option value="1" ${user.pray_months === 1 ? 'selected' : ''}>Odd months</option>
                                <option value="2" ${user.pray_months === 2 ? 'selected' : ''}>Even months</option>
                            </select>
                            <button class="btn btn-primary btn-sm assign-user" data-user-id="${user.id}">Reassign</button>
                        </div>
                    </div>
                    <div class="member-right">
                        <div class="member-name">${user.full_name}</div>
                    </div>
                </div>
            </div>
            `;
        } else {
            // Template for unassigned users
            html += `
            <div class="member-card" data-user-id="${user.id}">
                <div class="member-layout">
                    <div class="member-left">
                        <div class="member-img-container">
                            <img src="${imgSrc}" alt="${user.full_name}" class="member-img">
                        </div>
                        <div class="member-controls">
                            <select class="form-select form-select-sm month-selector" data-user-id="${user.id}">
                                <option value="0" ${user.pray_months === 0 ? 'selected' : ''}>All months</option>
                                <option value="1" ${user.pray_months === 1 ? 'selected' : ''}>Odd months</option>
                                <option value="2" ${user.pray_months === 2 ? 'selected' : ''}>Even months</option>
                            </select>
                            <button class="btn btn-primary btn-sm assign-user" data-user-id="${user.id}">Assign</button>
                        </div>
                    </div>
                    <div class="member-right">
                        <div class="member-name">${user.full_name}</div>
                    </div>
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