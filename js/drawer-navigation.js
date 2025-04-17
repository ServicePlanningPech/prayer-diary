// Mobile Navigation Drawer Functionality

// Initialize drawer navigation when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDrawerNavigation);

function initDrawerNavigation() {
    console.log("Initializing drawer navigation...");
    const drawerToggle = document.querySelector('.navbar-drawer-toggle');
    const drawer = document.querySelector('.nav-drawer');
    const overlay = document.querySelector('.nav-overlay');
    const closeBtn = document.querySelector('.drawer-close');
    const drawerMenu = document.querySelector('.drawer-menu');
    
    // Early exit if any required elements are missing
    if (!drawerToggle || !drawer || !overlay || !closeBtn || !drawerMenu) {
        console.error("Drawer navigation elements not found");
        return;
    }
    
    // Clear the drawer menu first
    drawerMenu.innerHTML = '';
    
    // Clone navigation items from navbar to drawer
    const navItems = document.querySelectorAll('#navbarBasic .navbar-nav > li');
    navItems.forEach(item => {
        const clonedItem = item.cloneNode(true);
        
        // Apply the same visibility classes as in the main navbar
        if (item.classList.contains('hidden')) {
            clonedItem.classList.add('hidden');
        }
        
        drawerMenu.appendChild(clonedItem);
    });
    
    // Also clone the auth container with My Details menu
    const authContainer = document.querySelector('#auth-container');
    if (authContainer) {
        const authClone = authContainer.cloneNode(true);
        // Add a class to style it differently in the drawer
        authClone.classList.add('drawer-auth-container');
        drawerMenu.appendChild(authClone);
    }
    
    // Ensure dropdown-toggle elements in the drawer work correctly
    const dropdownToggles = drawerMenu.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        // Remove existing event listeners and bootstrap data
        toggle.removeAttribute('data-bs-toggle');
        toggle.removeAttribute('data-bs-target');
        toggle.removeAttribute('aria-expanded');
        
        // Add our custom click handler
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Find the dropdown menu
            const dropdownMenu = this.nextElementSibling;
            if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
                // Toggle show class
                dropdownMenu.classList.toggle('show');
                
                // Toggle aria-expanded attribute
                const isExpanded = dropdownMenu.classList.contains('show');
                this.setAttribute('aria-expanded', isExpanded);
            }
        });
    });
    
    // Open drawer
    drawerToggle.addEventListener('click', () => {
        console.log("Opening drawer...");
        drawer.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    });
    
    // Close drawer (both with button and overlay)
    function closeDrawer() {
        console.log("Closing drawer...");
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    
    // Handle all possible action links in the drawer
    setupDrawerLinks(drawerMenu, closeDrawer);
    
    console.log("Drawer navigation initialized successfully");
}

// Setup link handlers for both regular nav links and dropdown items
function setupDrawerLinks(drawerMenu, closeDrawer) {
    // Process all navigation links
    const linkSelectors = [
        // Main nav links
        '#nav-calendar', 
        '#nav-updates', 
        '#nav-urgent',
        // Admin links
        '#nav-manage-users',
        '#nav-manage-calendar', 
        '#nav-manage-updates',
        '#nav-manage-urgent',
        '#nav-test-email',
        // User menu links
        '#nav-profile',
        '#nav-change-password',
        '#btn-logout'
    ];
    
    // Process each link selector
    linkSelectors.forEach(selector => {
        const drawerLinks = drawerMenu.querySelectorAll(selector);
        
        drawerLinks.forEach(link => {
            // Create a fresh event handler for the drawer link
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get the original id for later use
                const id = this.id;
                
                // Close drawer
                closeDrawer();
                
                // Add delay to ensure drawer is closed before action
                setTimeout(() => {
                    // Find the original element in the main navigation
                    const originalElement = document.querySelector(`#${id}:not(.nav-drawer *)`);
                    
                    if (originalElement) {
                        console.log(`Triggering click on original element: ${id}`);
                        originalElement.click();
                    } else if (id === 'btn-logout' && typeof window.logout === 'function') {
                        // Special case for logout
                        console.log('Calling logout function directly');
                        window.logout();
                    } else {
                        console.warn(`Could not find original element: ${id}`);
                        
                        // Try to determine the view based on the id pattern
                        if (id.startsWith('nav-')) {
                            const viewId = id.replace('nav-', '') + '-view';
                            if (typeof window.showView === 'function') {
                                console.log(`Attempting to show view: ${viewId}`);
                                window.showView(viewId);
                            }
                        }
                    }
                }, 300);
            });
        });
    });
}

// Reinitialize drawer when the window is resized or user logs in
window.addEventListener('resize', function() {
    // Only reinitialize if screen width changes into or out of mobile territory
    const isMobile = window.innerWidth < 992;
    const wasInitialized = document.querySelector('.drawer-menu')?.children?.length > 0;
    
    if (isMobile && !wasInitialized) {
        initDrawerNavigation();
    }
});

// Listen for login/logout to reinitialize drawer with updated auth state
document.addEventListener('login-state-changed', function() {
    console.log("Auth state changed, reinitializing drawer navigation");
    setTimeout(initDrawerNavigation, 500);
});

// Expose showView globally if it was accidentally overwritten
window.showViewFromDrawer = function(viewId) {
    const views = document.querySelectorAll('.view-content');
    views.forEach(view => {
        view.classList.add('d-none');
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('d-none');
    }
};

// Make sure drawer navigation is initialized even when DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initDrawerNavigation, 100);
}