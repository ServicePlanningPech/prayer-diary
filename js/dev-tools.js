// Development Tools for Prayer Diary
// This file provides utilities for development and testing

// Development mode settings
const devTools = {
    // Settings
    isDevelopmentMode: localStorage.getItem('prayerDiary_devMode') === 'true' || false,
    
    // Initialize dev tools
    init() {
        // Only add dev tools in non-production environments
        if (window.location.hostname === 'localhost' || 
            window.location.hostname.includes('192.168.') ||
            window.location.hostname.includes('127.0.0.1') ||
            window.location.hostname.includes('.github.io')) {
            
            this.createDevPanel();
            
            // Apply stored settings
            if (this.isDevelopmentMode) {
                this.clearCaches();
            }
        }
    },
    
    // Create development panel UI
    createDevPanel() {
        const panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.bottom = '0';
        panel.style.right = '0';
        panel.style.backgroundColor = 'rgba(0,0,0,0.8)';
        panel.style.color = 'white';
        panel.style.padding = '8px';
        panel.style.borderTopLeftRadius = '8px';
        panel.style.zIndex = '9999';
        panel.style.fontSize = '12px';
        panel.style.fontFamily = 'monospace';
        
        panel.innerHTML = `
            <div style="display: flex; align-items: center;">
                <input type="checkbox" id="dev-mode-toggle" ${this.isDevelopmentMode ? 'checked' : ''}>
                <label for="dev-mode-toggle" style="margin: 0 8px 0 4px;">Dev Mode</label>
                <button id="clear-cache-btn" style="margin-right: 4px; padding: 2px 4px;">Clear Cache</button>
                <button id="reload-btn" style="padding: 2px 4px;">Reload</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Set up event listeners
        document.getElementById('dev-mode-toggle').addEventListener('change', (e) => {
            this.isDevelopmentMode = e.target.checked;
            localStorage.setItem('prayerDiary_devMode', e.target.checked);
            location.reload();
        });
        
        document.getElementById('clear-cache-btn').addEventListener('click', () => {
            this.clearCaches();
            alert('Caches cleared!');
        });
        
        document.getElementById('reload-btn').addEventListener('click', () => {
            location.reload(true);
        });
    },
    
    // Clear all caches
    clearCaches() {
        // Clear service worker cache
        if ('caches' in window) {
            caches.keys().then((keyList) => {
                return Promise.all(keyList.map((key) => {
                    console.log('Deleting cache', key);
                    return caches.delete(key);
                }));
            });
        }
        
        // Unregister service workers
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (let registration of registrations) {
                    registration.unregister();
                    console.log('Service Worker unregistered');
                }
            });
        }
        
        // Add random parameters to stylesheets to force reload
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const url = new URL(link.href);
            url.searchParams.set('_', Date.now());
            link.href = url.toString();
        });
    }
};

// Initialize dev tools after page load
document.addEventListener('DOMContentLoaded', () => {
    devTools.init();
});
