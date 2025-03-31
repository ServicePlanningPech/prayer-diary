// UI Management Module

// Initialize UI when document is loaded
document.addEventListener('DOMContentLoaded', initUI);

function initUI() {
    setupNavigation();
    setupTabManagement();
    setupModalClosers();
    setupFileInputs();
    initializeBulmaComponents();
}

// Setup navigation between views
function setupNavigation() {
    // Main navigation items
    document.getElementById('nav-calendar').addEventListener('click', () => {
        showView('calendar-view');
        loadPrayerCalendar();
    });
    
    document.getElementById('nav-updates').addEventListener('click', () => {
        showView('updates-view');
        loadPrayerUpdates();
    });
    
    document.getElementById('nav-urgent').addEventListener('click', () => {
        showView('urgent-view');
        loadUrgentPrayers();
    });
    
    document.getElementById('nav-profile').addEventListener('click', () => {
        showView('profile-view');
        loadUserProfile();
    });
    
    // Admin navigation
    document.getElementById('nav-manage-users').addEventListener('click', () => {
        showView('manage-users-view');
        loadUsers();
    });
    
    document.getElementById('nav-manage-calendar').addEventListener('click', () => {
        showView('manage-calendar-view');
        loadCalendarAdmin();
    });
    
    document.getElementById('nav-manage-updates').addEventListener('click', () => {
        showView('manage-updates-view');
        initUpdateEditor();
        loadUpdatesAdmin();
    });
    
    document.getElementById('nav-manage-urgent').addEventListener('click', () => {
        showView('manage-urgent-view');
        initUrgentEditor();
        loadUrgentAdmin();
    });
}

// Function to show a specific view and hide others
function showView(viewId) {
    // Hide all views
    const views = document.querySelectorAll('.view-content');
    views.forEach(view => {
        view.classList.add('is-hidden');
    });
    
    // Show the selected view
    document.getElementById(viewId).classList.remove('is-hidden');
    
    // Close mobile menu if open
    const burger = document.querySelector('.navbar-burger');
    const menu = document.querySelector('.navbar-menu');
    if (burger.classList.contains('is-active')) {
        burger.classList.remove('is-active');
        menu.classList.remove('is-active');
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Setup tab management
function setupTabManagement() {
    document.querySelectorAll('.tabs a').forEach(tab => {
        tab.addEventListener('click', function() {
            // Get parent tab list
            const tabList = this.closest('ul');
            
            // Remove active class from all tabs in this list
            tabList.querySelectorAll('li').forEach(li => {
                li.classList.remove('is-active');
            });
            
            // Add active class to current tab
            this.closest('li').classList.add('is-active');
            
            // Get the tab content to show
            const tabContentId = this.getAttribute('data-tab');
            
            // Find all sibling tab contents
            const parentContent = this.closest('.tabs').nextElementSibling.parentElement;
            const tabContents = parentContent.querySelectorAll('.tab-content');
            
            // Hide all tab contents
            tabContents.forEach(content => {
                content.classList.add('is-hidden');
            });
            
            // Show selected tab content
            document.getElementById(tabContentId).classList.remove('is-hidden');
        });
    });
}

// Setup modal close buttons
function setupModalClosers() {
    // Close all modals when clicking on background or delete button
    document.querySelectorAll('.modal-background, .modal .delete, .modal .cancel').forEach(elem => {
        const modal = elem.closest('.modal');
        elem.addEventListener('click', () => {
            modal.classList.remove('is-active');
        });
    });
    
    // Close notification modal specifically
    document.getElementById('close-notification').addEventListener('click', () => {
        document.getElementById('notification-modal').classList.remove('is-active');
    });
    
    // Close card view modal
    document.getElementById('close-card-modal').addEventListener('click', () => {
        document.getElementById('view-card-modal').classList.remove('is-active');
    });
}

// Setup file input display
function setupFileInputs() {
    // Generic function to handle file input changes
    function handleFileInput(fileInput, fileNameElement, previewElement) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const fileName = fileInput.files[0].name;
                fileNameElement.textContent = fileName;
                
                // If preview element exists, show image preview
                if (previewElement) {
                    previewElement.classList.remove('is-hidden');
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewElement.src = e.target.result;
                    };
                    reader.readAsDataURL(fileInput.files[0]);
                }
            } else {
                fileNameElement.textContent = 'No file selected';
                if (previewElement) {
                    previewElement.classList.add('is-hidden');
                }
            }
        });
    }
    
    // Profile image input
    const profileInput = document.getElementById('profile-image');
    const profileName = document.getElementById('profile-image-name');
    const profilePreview = document.getElementById('profile-image-preview');
    handleFileInput(profileInput, profileName, profilePreview);
    
    // Calendar entry image input
    const calendarInput = document.getElementById('calendar-image');
    const calendarName = document.getElementById('calendar-image-name');
    const calendarPreview = document.getElementById('calendar-image-preview');
    handleFileInput(calendarInput, calendarName, calendarPreview);
    
    // Edit calendar entry image input
    const editCalendarInput = document.getElementById('edit-calendar-image');
    const editCalendarName = document.getElementById('edit-calendar-image-name');
    const editCalendarPreview = document.getElementById('edit-calendar-image-preview');
    handleFileInput(editCalendarInput, editCalendarName, editCalendarPreview);
}

// Initialize Bulma component functionality
function initializeBulmaComponents() {
    // Burger menu for mobile
    const burger = document.querySelector('.navbar-burger');
    const menu = document.querySelector('.navbar-menu');
    
    burger.addEventListener('click', () => {
        burger.classList.toggle('is-active');
        menu.classList.toggle('is-active');
    });
    
    // Initialize day of month dropdown options
    const dayDropdowns = document.querySelectorAll('#calendar-day, #edit-calendar-day');
    dayDropdowns.forEach(dropdown => {
        for (let i = 1; i <= 31; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            dropdown.appendChild(option);
        }
    });
}

// Show notification modal
function showNotification(title, message) {
    const modal = document.getElementById('notification-modal');
    const titleElem = document.getElementById('notification-title');
    const contentElem = document.getElementById('notification-content');
    
    titleElem.textContent = title;
    contentElem.innerHTML = message;
    
    modal.classList.add('is-active');
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Create loading spinner
function createLoadingSpinner() {
    return `<div class="has-text-centered p-5">
        <span class="icon is-large">
            <i class="fas fa-spinner fa-pulse fa-3x"></i>
        </span>
        <p class="mt-3">Loading...</p>
    </div>`;
}

// Helper function to create a prayer card
function createPrayerCard(entry) {
    const dayOfMonth = entry.day_of_month;
    const today = new Date().getDate();
    const isToday = dayOfMonth === today;
    
    return `
    <div class="column is-6-tablet is-4-desktop">
        <div class="card prayer-card ${isToday ? 'has-background-primary-light' : ''}">
            <div class="card-image">
                <figure class="image is-1by1">
                    <img src="${entry.image_url || 'img/placeholder-profile.png'}" alt="${entry.name}">
                </figure>
                <div class="day-of-month">${dayOfMonth}</div>
            </div>
            <div class="card-content prayer-card-content">
                <p class="prayer-card-title">${entry.name}</p>
                <div class="prayer-card-body content">
                    ${entry.prayer_points ? entry.prayer_points.substring(0, 100) + (entry.prayer_points.length > 100 ? '...' : '') : 'No prayer points provided.'}
                </div>
                <div class="prayer-card-footer">
                    <button class="button is-primary is-fullwidth view-prayer-card" data-id="${entry.id}">
                        View Prayer Card
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
}

// Helper function to create a prayer update card
function createUpdateCard(update, isAdmin = false) {
    const date = formatDate(update.created_at);
    
    return `
    <div class="card update-card mb-4">
        <header class="card-header">
            <p class="card-header-title">${update.title}</p>
        </header>
        <div class="card-content">
            <p class="update-date">${date}</p>
            <div class="content">
                ${update.content}
            </div>
            ${isAdmin ? `
            <div class="buttons is-right">
                <button class="button is-small is-primary edit-update" data-id="${update.id}">
                    <span class="icon"><i class="fas fa-edit"></i></span>
                    <span>Edit</span>
                </button>
                <button class="button is-small is-warning archive-update" data-id="${update.id}">
                    <span class="icon"><i class="fas fa-archive"></i></span>
                    <span>Archive</span>
                </button>
            </div>
            ` : ''}
        </div>
    </div>
    `;
}

// Helper function to create an urgent prayer card
function createUrgentCard(prayer, isAdmin = false) {
    const date = formatDate(prayer.created_at);
    
    return `
    <div class="card urgent-card mb-4">
        <header class="card-header">
            <p class="card-header-title">${prayer.title}</p>
        </header>
        <div class="card-content">
            <p class="urgent-date">${date}</p>
            <div class="content">
                ${prayer.content}
            </div>
            ${isAdmin ? `
            <div class="buttons is-right">
                <button class="button is-small is-primary edit-urgent" data-id="${prayer.id}">
                    <span class="icon"><i class="fas fa-edit"></i></span>
                    <span>Edit</span>
                </button>
                <button class="button is-small is-warning deactivate-urgent" data-id="${prayer.id}">
                    <span class="icon"><i class="fas fa-times-circle"></i></span>
                    <span>Deactivate</span>
                </button>
            </div>
            ` : ''}
        </div>
    </div>
    `;
}

// Helper function to create a user card
function createUserCard(user, isPending = true) {
    return `
    <div class="box user-card">
        <div class="columns is-mobile is-vcentered">
            <div class="column is-narrow">
                <figure class="image is-64x64">
                    <img class="user-avatar" src="${user.profile_image_url || 'img/placeholder-profile.png'}" alt="${user.full_name}">
                </figure>
            </div>
            <div class="column">
                <p class="title is-5">${user.full_name}</p>
                <p class="subtitle is-6">${user.email}</p>
            </div>
            <div class="column is-narrow">
                ${isPending ? `
                <div class="buttons">
                    <button class="button is-small is-success approve-user" data-id="${user.id}">
                        <span class="icon"><i class="fas fa-check"></i></span>
                        <span>Approve</span>
                    </button>
                    <button class="button is-small is-danger reject-user" data-id="${user.id}">
                        <span class="icon"><i class="fas fa-times"></i></span>
                        <span>Reject</span>
                    </button>
                </div>
                ` : `
                <button class="button is-small is-primary edit-user" data-id="${user.id}">
                    <span class="icon"><i class="fas fa-edit"></i></span>
                    <span>Edit Permissions</span>
                </button>
                `}
            </div>
        </div>
    </div>
    `;
}

// Show a prayer card in the modal
function showPrayerCardModal(entry) {
    const modal = document.getElementById('view-card-modal');
    const title = document.getElementById('card-modal-title');
    const image = document.getElementById('card-image');
    const content = document.getElementById('card-content');
    
    title.textContent = `Prayer Card: ${entry.name}`;
    image.src = entry.image_url || 'img/placeholder-profile.png';
    
    let contentHtml = `
        <h3 class="title is-5">${entry.name}</h3>
        <div class="tags">
            <span class="tag is-primary">Day ${entry.day_of_month}</span>
        </div>
    `;
    
    if (entry.prayer_points) {
        contentHtml += `<div class="content">${entry.prayer_points}</div>`;
    } else {
        contentHtml += `<p>No prayer points provided.</p>`;
    }
    
    content.innerHTML = contentHtml;
    modal.classList.add('is-active');
}