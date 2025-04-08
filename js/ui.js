// UI Management Module - Bootstrap Version

// Initialize UI when document is loaded
document.addEventListener('DOMContentLoaded', initUI);

function initUI() {
    setupNavigation();
    setupModalClosers();
    setupFileInputs();
    initializeBootstrapComponents();
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
        // Load profile with a slight delay to ensure DOM is ready
        setTimeout(() => {
            loadUserProfile();
        }, 50);
    });
    
    // Admin navigation
    document.getElementById('nav-manage-users').addEventListener('click', () => {
        showView('manage-users-view');
        // Check if loadUsers is defined before calling it
        if (typeof loadUsers === 'function') {
            loadUsers();
        } else {
            console.error('loadUsers function is not defined. Check that admin.js is loaded before ui.js.');
            showNotification('Error', 'Could not load users. Please refresh the page or contact support.');
        }
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
    
    document.getElementById('nav-test-email').addEventListener('click', () => {
        showView('test-email-view');
        initEmailTestView();
    });
}

// Function to show a specific view and hide others
function showView(viewId) {
    // Hide all views
    const views = document.querySelectorAll('.view-content');
    views.forEach(view => {
        view.classList.add('d-none');
    });
    
    // Show the selected view
    document.getElementById(viewId).classList.remove('d-none');
    
    // Close mobile menu if open
    const navbarCollapse = document.getElementById('navbarBasic');
    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
    if (bsCollapse && navbarCollapse.classList.contains('show')) {
        bsCollapse.hide();
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Setup modal close buttons
function setupModalClosers() {
    // Bootstrap handles most modal closing automatically
    // We just need to set up specific button actions
    
    // Close notification modal specifically
    document.getElementById('close-notification').addEventListener('click', () => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('notification-modal'));
        modal.hide();
    });
    
    // Close card view modal
    document.getElementById('close-card-modal').addEventListener('click', () => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('view-card-modal'));
        modal.hide();
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
                    previewElement.classList.remove('d-none');
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewElement.src = e.target.result;
                    };
                    reader.readAsDataURL(fileInput.files[0]);
                }
            } else {
                fileNameElement.textContent = 'No file selected';
                if (previewElement) {
                    previewElement.classList.add('d-none');
                }
            }
        });
    }
    
    // Profile image input
    const profileInput = document.getElementById('profile-image');
    const profileName = document.getElementById('profile-image-name');
    const profilePreview = document.getElementById('profile-image-preview');
    if (profileInput) {
        handleFileInput(profileInput, profileName, profilePreview);
    }
    
    // Calendar entry image input
    const calendarInput = document.getElementById('calendar-image');
    const calendarName = document.getElementById('calendar-image-name');
    const calendarPreview = document.getElementById('calendar-image-preview');
    if (calendarInput) {
        handleFileInput(calendarInput, calendarName, calendarPreview);
    }
    
    // Edit calendar entry image input
    const editCalendarInput = document.getElementById('edit-calendar-image');
    const editCalendarName = document.getElementById('edit-calendar-image-name');
    const editCalendarPreview = document.getElementById('edit-calendar-image-preview');
    if (editCalendarInput) {
        handleFileInput(editCalendarInput, editCalendarName, editCalendarPreview);
    }
}

// Initialize Bootstrap component functionality
function initializeBootstrapComponents() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
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
    const modal = new bootstrap.Modal(document.getElementById('notification-modal'));
    const titleElem = document.getElementById('notification-title');
    const contentElem = document.getElementById('notification-content');
    
    titleElem.textContent = title;
    contentElem.innerHTML = message;
    
    modal.show();
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
    return `<div class="text-center p-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3">Loading...</p>
    </div>`;
}

// Helper function to create a prayer card
function createPrayerCard(entry) {
    const dayOfMonth = entry.day_of_month;
    const today = new Date().getDate();
    const isToday = dayOfMonth === today;
    
    return `
    <div class="col">
        <div class="card prayer-card h-100 ${isToday ? 'bg-light border-primary' : ''}">
            <div class="position-relative">
                <img src="${entry.image_url || 'img/placeholder-profile.png'}" class="card-img-top prayer-card-img-top" alt="${entry.name}">
                <div class="day-badge">${dayOfMonth}</div>
            </div>
            <div class="card-body d-flex flex-column">
                <h5 class="card-title prayer-card-title">${entry.name}</h5>
                <p class="card-text flex-grow-1">
                    ${entry.prayer_points ? entry.prayer_points.substring(0, 100) + (entry.prayer_points.length > 100 ? '...' : '') : 'No prayer points provided.'}
                </p>
                <div class="mt-auto pt-3">
                    <button class="btn btn-primary w-100 view-prayer-card" data-id="${entry.id}">
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
        <div class="card-header bg-primary text-white">
            <h5 class="card-title mb-0">${update.title}</h5>
        </div>
        <div class="card-body">
            <p class="update-date text-muted">${date}</p>
            <div class="card-text">
                ${update.content}
            </div>
            ${isAdmin ? `
            <div class="text-end mt-3">
                <button class="btn btn-sm btn-primary edit-update me-2" data-id="${update.id}">
                    <i class="bi bi-pencil-square"></i> Edit
                </button>
                <button class="btn btn-sm btn-warning archive-update" data-id="${update.id}">
                    <i class="bi bi-archive"></i> Archive
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
        <div class="card-header bg-danger text-white">
            <h5 class="card-title mb-0">${prayer.title}</h5>
        </div>
        <div class="card-body">
            <p class="urgent-date text-muted">${date}</p>
            <div class="card-text">
                ${prayer.content}
            </div>
            ${isAdmin ? `
            <div class="text-end mt-3">
                <button class="btn btn-sm btn-primary edit-urgent me-2" data-id="${prayer.id}">
                    <i class="bi bi-pencil-square"></i> Edit
                </button>
                <button class="btn btn-sm btn-warning deactivate-urgent" data-id="${prayer.id}">
                    <i class="bi bi-x-circle"></i> Deactivate
                </button>
            </div>
            ` : ''}
        </div>
    </div>
    `;
}

// Helper function to create a user card
function createUserCard(user, isPending = true) {
    // Always start with placeholder image for faster rendering
    let imageUrl = 'img/placeholder-profile.png';
    
    // Use the pre-generated signed URL if available (for admin view)
    if (user.signed_image_url) {
        imageUrl = user.signed_image_url;
    }
    
    return `
    <div class="card user-card mb-3">
        <div class="card-body">
            <div class="row align-items-center">
                <div class="col-auto">
                    <img class="user-avatar" src="${imageUrl}" alt="${user.full_name}" 
                         data-user-id="${user.id}"
                         onerror="this.onerror=null; this.src='img/placeholder-profile.png'; console.log('Failed to load image for ${user.full_name}, using placeholder');"
                         crossorigin="anonymous">
                </div>
                <div class="col">
                    <h5 class="card-title mb-1">${user.full_name}</h5>
                    <p class="card-subtitle text-muted">${user.email}</p>
                </div>
                <div class="col-md-auto mt-2 mt-md-0">
                    ${isPending ? `
                    <div>
                        <button class="btn btn-sm btn-success approve-user me-1" data-id="${user.id}" type="button">
                            <i class="bi bi-check"></i> Approve
                        </button>
                        <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}" data-name="${user.full_name}" type="button">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                    ` : `
                    <div>
                        <button class="btn btn-sm btn-primary edit-user me-1" data-id="${user.id}" type="button">
                            <i class="bi bi-pencil-square"></i> Edit Permissions
                        </button>
                        <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}" data-name="${user.full_name}" type="button">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                    `}
                </div>
            </div>
        </div>
    </div>
    `;
}

// Show a prayer card in the modal
function showPrayerCardModal(entry) {
    const modal = new bootstrap.Modal(document.getElementById('view-card-modal'));
    const title = document.getElementById('card-modal-title');
    const image = document.getElementById('card-image');
    const content = document.getElementById('card-content');
    
    title.textContent = `Prayer Card: ${entry.name}`;
    image.src = entry.image_url || 'img/placeholder-profile.png';
    
    let contentHtml = `
        <h4 class="fw-bold mb-2">${entry.name}</h4>
        <div class="mb-3">
            <span class="badge bg-primary">Day ${entry.day_of_month}</span>
        </div>
    `;
    
    if (entry.prayer_points) {
        contentHtml += `<div>${entry.prayer_points}</div>`;
    } else {
        contentHtml += `<p>No prayer points provided.</p>`;
    }
    
    content.innerHTML = contentHtml;
    modal.show();
}