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
        drawerMenu.appendChild(clonedItem);
    });
    
    // Ensure dropdown-toggle elements in the drawer work correctly
    const dropdownToggles = drawerMenu.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const dropdownMenu = this.nextElementSibling;
            if (dropdownMenu) {
                dropdownMenu.classList.toggle('show');
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
    
    // Close drawer when a nav item is clicked
    const drawerNavLinks = drawerMenu.querySelectorAll('.nav-link:not(.dropdown-toggle)');
    drawerNavLinks.forEach(link => {
        link.addEventListener('click', closeDrawer);
    });
    
    // Add event listeners to dropdown items as well
    const dropdownItems = drawerMenu.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', closeDrawer);
    });
    
    console.log("Drawer navigation initialized successfully");
}

// Reinitialize drawer when the window is resized
window.addEventListener('resize', function() {
    // Only reinitialize if screen width changes into or out of mobile territory
    const isMobile = window.innerWidth < 992;
    const wasInitialized = document.querySelector('.drawer-menu').children.length > 0;
    
    if (isMobile && !wasInitialized) {
        initDrawerNavigation();
    }
});

// Make sure drawer navigation is initialized even when DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initDrawerNavigation, 100);
}