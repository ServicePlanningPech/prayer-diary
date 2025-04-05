// Development Mode Tools
// This file provides utilities for development mode

// Set development mode flag
window.PRAYER_DIARY_DEV_MODE = true;

// Force unregister service workers on page load in dev mode
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        console.log('DEV MODE: Unregistering service workers...');
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for (let registration of registrations) {
                registration.unregister();
                console.log('DEV MODE: Service worker unregistered');
            }
        });
    });
}

// Add development mode indicator
window.addEventListener('DOMContentLoaded', function() {
    const devIndicator = document.createElement('div');
    devIndicator.style.position = 'fixed';
    devIndicator.style.bottom = '0';
    devIndicator.style.right = '0';
    devIndicator.style.backgroundColor = 'red';
    devIndicator.style.color = 'white';
    devIndicator.style.padding = '5px 10px';
    devIndicator.style.fontSize = '12px';
    devIndicator.style.fontWeight = 'bold';
    devIndicator.style.zIndex = '9999';
    devIndicator.textContent = `DEV MODE v${Date.now()}`;
    document.body.appendChild(devIndicator);
    
    // Add refresh button
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '↻';
    refreshButton.style.marginLeft = '5px';
    refreshButton.style.backgroundColor = 'white';
    refreshButton.style.color = 'red';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '3px';
    refreshButton.style.fontWeight = 'bold';
    refreshButton.onclick = function() {
        // Force hard reload
        window.location.reload(true);
    };
    devIndicator.appendChild(refreshButton);
    
    console.log(`DEV MODE: Running build ${Date.now()}`);
});

// Disable caching for all fetch requests in dev mode
let originalFetch = window.fetch;
window.fetch = function() {
    let url = arguments[0];
    let options = arguments[1] || {};
    
    // Only add cache busting for non-Supabase requests
    if (typeof url === 'string' && !url.includes('supabase.co')) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}_=${Date.now()}`;
    }
    
    // Add cache control headers for non-Supabase requests
    if (typeof url === 'string' && !url.includes('supabase.co')) {
        options.headers = options.headers || {};
        options.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        options.headers['Pragma'] = 'no-cache';
        options.headers['Expires'] = '0';
    }
    
    return originalFetch.call(this, url, options);
};
