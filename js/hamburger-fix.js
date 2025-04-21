// Direct fix for hamburger menu
console.log("Hamburger menu fix loaded");

// Function to add direct handlers for hamburger menu
function fixHamburgerMenu() {
    console.log("Applying hamburger menu fix");
    
    // Get elements
    const hamburgerBtn = document.querySelector('.navbar-drawer-toggle');
    const drawer = document.querySelector('.nav-drawer');
    const overlay = document.querySelector('.nav-overlay');
    const closeBtn = document.querySelector('.drawer-close');
    
    // Exit if elements aren't found
    if (!hamburgerBtn || !drawer || !overlay) {
        console.error("Required elements for hamburger menu not found");
        return;
    }
    
    // Remove any existing click handlers by cloning and replacing
    const newHamburger = hamburgerBtn.cloneNode(true);
    hamburgerBtn.parentNode.replaceChild(newHamburger, hamburgerBtn);
    
    // Add open drawer handler
    newHamburger.addEventListener('click', function(e) {
        console.log("Hamburger button clicked (direct handler)");
        e.preventDefault();
        e.stopPropagation();
        drawer.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    });
    
    // Add close drawer handlers
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', function() {
            console.log("Close button clicked (direct handler)");
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        });
    }
    
    // Also clone and replace overlay element
    const newOverlay = overlay.cloneNode(true);
    overlay.parentNode.replaceChild(newOverlay, overlay);
    newOverlay.addEventListener('click', function() {
        console.log("Overlay clicked (direct handler)");
        drawer.classList.remove('open');
        newOverlay.classList.remove('open');
        document.body.style.overflow = '';
    });
    
    console.log("Hamburger menu fix applied successfully");
}

// Apply fix after page is loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(fixHamburgerMenu, 300);
} else {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(fixHamburgerMenu, 300);
    });
}

// Also apply after window loads
window.addEventListener('load', function() {
    setTimeout(fixHamburgerMenu, 500);
});