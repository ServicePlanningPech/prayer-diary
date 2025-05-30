// Prayer Calendar Module

// Variables to track state
let selectedDay = null;
let allUsers = [];
let filteredUsers = [];
let testDate = null;
let tapCount = 0;

// Update the formatDate function to provide shorter date display format
// This function will show dates in "DD MMM" format (e.g., "24 Apr")
function formatDate(date, longFormat = false) {
    const months = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];
    
    const shortMonths = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    
    if (longFormat) {
        return `${date.getDate()} ${months[date.getMonth()]}`;
    } else {
        return `${date.getDate()} ${shortMonths[date.getMonth()]}`;
    }
}

// Get the effective date (test date or current date)
function getEffectiveDate() {
    return window.selectedPrayerDate || testDate || new Date();
}

// Load prayer calendar entries
async function loadPrayerCalendar() {
    if (!isApproved()) return;
	
    await window.waitForAuthStability();
    
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
        const dateStr = formatDate(effectiveDate, true); // Use long format for heading
        const shortDateStr = formatDate(effectiveDate, false); // Use short format for clickable date
        
        // Update the title with clickable date
        titleElement.innerHTML = `
            <div class="prayer-title-container mb-4 p-3 bg-primary text-white rounded shadow">
                <h4 class="mb-0">Daily Prayer for <span id="current-date" class="clickable-date">${shortDateStr}</span></h4>
            </div>
        `;
        
        // Add click event listener to the date element
        setTimeout(() => {
            const dateElement = document.getElementById('current-date');
            if (dateElement) {
                // Add click event listener
                dateElement.addEventListener('click', showDatePicker);
            }
        }, 100);
        
        // Get users with pray_day > 0 who should be shown this month, filtering out calendar_hide=true
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                photo_tag,
                profile_image_url,
                prayer_points,
                pray_day,
                pray_months
            `)
            .eq('approval_state', 'Approved')
            .eq('pray_day', currentDay) // Only get entries for the current day
            .eq('calendar_hide', false)  // Only include members who aren't hidden
            .or(`pray_months.eq.0,pray_months.eq.${isOddMonth ? 1 : 2}`)
            .order('full_name', { ascending: true});
            
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
            name: user.photo_tag || user.full_name,  // Use photo_tag if available, otherwise use full_name
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

// Function to show the date picker
function showDatePicker() {
    // Get the current effective date
    const currentDate = getEffectiveDate();
    
    // Format the date for the input (YYYY-MM-DD)
    const formattedDate = currentDate.toISOString().split('T')[0];
    
    // Set the input value
    const dateInput = document.getElementById('test-date');
    if (dateInput) {
        dateInput.value = formattedDate;
    }
    
    // Show the date picker modal
    const modal = new bootstrap.Modal(document.getElementById('date-picker-modal'));
    
    // Change the modal title to be more user-friendly
    const modalTitle = document.getElementById('date-picker-title');
    if (modalTitle) {
        modalTitle.textContent = 'Select Prayer Date';
    }
    
    // Change the set button text to be more user-friendly
    const setButton = document.getElementById('set-test-date');
    if (setButton) {
        setButton.textContent = 'View Prayers';
    }
    
    // Change the reset button text to be more user-friendly
    const resetButton = document.getElementById('reset-test-date');
    if (resetButton) {
        resetButton.textContent = 'Return to Today';
    }
    
    // Show the modal
    modal.show();
    
    // Make sure event handlers are properly set
    setupDatePickerHandlers();
}

// Setup date picker handlers
function setupDatePickerHandlers() {
    // Get the buttons
    const setButton = document.getElementById('set-test-date');
    const resetButton = document.getElementById('reset-test-date');
    
    // Remove existing event listeners to prevent duplication
    const newSetButton = setButton.cloneNode(true);
    const newResetButton = resetButton.cloneNode(true);
    
    setButton.parentNode.replaceChild(newSetButton, setButton);
    resetButton.parentNode.replaceChild(newResetButton, resetButton);
    
    // Add new event listeners
    newSetButton.addEventListener('click', () => {
        const dateInput = document.getElementById('test-date');
        if (dateInput.value) {
            // Set the selectedPrayerDate for the app to use
            window.selectedPrayerDate = new Date(dateInput.value);
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('date-picker-modal'));
            if (modal) modal.hide();
            
            // Reload the prayer calendar
            loadPrayerCalendar();
            
            // Show confirmation toast
            //showToast('Date Changed', `Showing prayers for ${formatDate(window.selectedPrayerDate)}`, 'info', 3000);
        }
    });
    
    newResetButton.addEventListener('click', () => {
        // Reset the selected date
        window.selectedPrayerDate = null;
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('date-picker-modal'));
        if (modal) modal.hide();
        
        // Reload the prayer calendar
        loadPrayerCalendar();
        
        // Show confirmation toast
       // showToast('Date Reset', 'Showing prayers for today', 'success', 3000);
    });
}

// Create a prayer card HTML
function createPrayerCard(entry) {
    const imgSrc = entry.image_url || 'img/placeholder-profile.png';
    
    // Add badge based on type (member or topic)  **DEPRECATED
    const typeBadge = entry.type === 'topic' 
        ? '' 
        : '';
    
    // Format prayer points: preserve HTML formatting for topics
    let prayerPointsDisplay = '';
    
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
    
    // Layout with photo - CSS will handle small vs large based on body.small-photo class
    return `
    <div class="col">
        <div class="card h-100 shadow prayer-card" data-entry-id="${entry.id}" data-entry-type="${entry.type || 'member'}">
            ${typeBadge}
            <div class="card-body">
                <div style="width: 120px; float: left; margin-right: 15px; margin-bottom: 0;">
                    <img src="${imgSrc}" class="img-fluid rounded prayer-profile-img" alt="${entry.name}">
                </div>
                <h5 class="card-title prayer-card-title mb-2">${entry.name}</h5>
                <div class="card-text prayer-points-preview">
                    ${entry.type === 'topic' ? prayerPointsDisplay : (prayerPointsDisplay ? `<p>${prayerPointsDisplay}</p>` : '')}
                </div>
                <div style="clear: both;"></div>
            </div>
        </div>
    </div>
    `;
}

// Prayer card listeners function is no longer needed since cards display all information directly

// View prayer card details
async function viewPrayerCard(userId) {
    await window.waitForAuthStability();
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

    await createCalendarDaysGrid();
    await loadAllUsers();
    setupEventListeners();
}

// Create the calendar days grid (1-31)
async function createCalendarDaysGrid() {
    const container = document.querySelector('.calendar-days-grid');
    container.innerHTML = '';
    
    // Get the count of users assigned to each day
    const memberCounts = await getMemberCountsByDay();
    
    for (let day = 1; day <= 31; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // If this day is the currently selected day, add the selected class
        if (day === selectedDay) {
            dayElement.classList.add('selected');
        }
        
        dayElement.dataset.day = day;
        
        // Create a span for the day number
        const dayNumber = document.createElement('span');
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
        
        // Add the member count if it exists
        const count = memberCounts[day] || 0;
        if (count > 0) {
            const countElement = document.createElement('span');
            countElement.className = 'member-count';
            countElement.textContent = count;
            dayElement.appendChild(countElement);
        }
        
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

// Get member counts by day
async function getMemberCountsByDay() {
    await window.waitForAuthStability();
    try {
        // Get all users with a pray_day assigned
        const { data, error } = await supabase
            .from('profiles')
            .select('pray_day')
            .eq('approval_state', 'Approved')
            .gt('pray_day', 0);
            
        if (error) throw error;
        
        // Count the members for each day
        const counts = {};
        data.forEach(user => {
            const day = user.pray_day;
            counts[day] = (counts[day] || 0) + 1;
        });
        
        return counts;
    } catch (error) {
        console.error('Error getting member counts:', error);
        return {};
    }
}

// Load all users from the profiles table
async function loadAllUsers() {
    await window.waitForAuthStability();
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, photo_tag, profile_image_url, prayer_points, pray_day, pray_months, approval_state, calendar_hide')
            .eq('approval_state', 'Approved')
            .eq('calendar_hide', false) // Only include members who aren't hidden from calendar
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
            // Template for assigned users - using original layout
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
            // Template for unassigned users - using original layout
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
        // Store user ID before removing the button
        const userId = button.dataset.userId;
        
        // Directly attach click handler to make sure it works
        button.onclick = function(e) {
            // Prevent default behavior and stop propagation
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Assign button clicked for user:', userId);
            
            // Call the assignment function
            assignUserToDay(userId);
            
            // Return false to prevent any further event handling
            return false;
        };
    });
    
    // Add event listeners to month selectors
    container.querySelectorAll('.month-selector').forEach(select => {
        select.onchange = function() {
            const userId = this.dataset.userId;
            const months = parseInt(this.value);
            updateUserMonths(userId, months);
        };
    });
}

// Assign a user to the selected day
async function assignUserToDay(userId) {
    if (!selectedDay) {
        showNotification('Warning', 'Please select a day first', 'warning');
        return;
    }
    await window.waitForAuthStability();
    
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
        
        // Update the day count in the days grid
        await createCalendarDaysGrid();
        
        showNotification('Success', 'User assigned to day ' + selectedDay, 'success');
        
    } catch (error) {
        console.error('Error assigning user:', error);
        showNotification('Error', `Failed to assign user: ${error.message}`);
    }
}

// Update the user's months settings
async function updateUserMonths(userId, months) {
    await window.waitForAuthStability();
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

// Add CSS styles for the clickable date
function addClickableDateStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .clickable-date {
            cursor: pointer;
            padding-right: 20px;
            position: relative;
            display: inline-block;
        }
        
        .clickable-date:hover {
            color: #e0e0e0;
        }
        
        .clickable-date:after {
            content: "\\F4CA";  /* Calendar icon from Bootstrap Icons */
            font-family: "bootstrap-icons";
            font-size: 0.8em;
            margin-left: 5px;
            position: absolute;
            top: 2px;
        }
    `;
    document.head.appendChild(style);
}

// Initialize clickable date feature - call this when the page loads
function initClickableDate() {
    // Add styles for the clickable date
    addClickableDateStyles();
    
    // Initialize a global variable to store the selected date
    window.selectedPrayerDate = null;
    
    // Add event listener for navigation to calendar view to initialize date
    document.getElementById('nav-calendar').addEventListener('click', function() {
        // Make sure the date functionality is initialized
        setTimeout(() => {
            const dateElement = document.getElementById('current-date');
            if (dateElement) {
                dateElement.addEventListener('click', showDatePicker);
            }
        }, 200);
    });
}

// Modified loadCalendarAdmin to initialize the new UI
async function loadCalendarAdmin() {
    if (!hasPermission('prayer_calendar_editor')) return;
    
    // Initialize the new calendar management UI
    await initCalendarManagement();
}

// Call initialization function when document is loaded
document.addEventListener('DOMContentLoaded', initClickableDate);