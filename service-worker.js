// Service Worker for Prayer Diary PWA - Updated with improved error handling and update notification

// Define a version for the app that changes with each significant update
const APP_VERSION = '1.0.0'; // Change this version when deploying a new version

// Use APP_VERSION and timestamp for cache busting
const CACHE_NAME = `prayer-diary-${APP_VERSION}-${Date.now()}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/bootstrap-morph.min.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/calendar.js',
  '/js/updates.js',
  '/js/urgent.js',
  '/js/profile.js',
  '/js/admin.js',
  '/js/notifications.js',
  '/js/notification-processor.js',
  '/js/email-test.js',
  '/js/config.js',
  '/img/placeholder-profile.png',
  '/img/logo.png',
  '/img/prayer-banner.jpg',
  '/img/icons/icon.svg',
  '/img/icons/favicon.ico',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.quilljs.com/1.3.6/quill.snow.css',
  'https://cdn.quilljs.com/1.3.6/quill.min.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Use a simpler caching approach - add what we can, ignore failures
        return Promise.allSettled(
          urlsToCache.map(url => {
            // Skip non-HTTP URLs if any are in the list
            if (!url.startsWith('http:') && !url.startsWith('https:') && !url.startsWith('/')) {
              console.warn('Skipping non-HTTP URL in cache list:', url);
              return Promise.resolve();
            }
            
            // Attempt to cache each asset, but don't let failures stop the service worker from installing
            return fetch(url, { mode: 'no-cors' })
              .then(response => {
                if (response.status === 200 || response.type === 'opaque') {
                  try {
                    return cache.put(url, response);
                  } catch (cacheError) {
                    console.warn('Could not cache asset:', url, cacheError.message);
                    return Promise.resolve();
                  }
                }
              })
              .catch(error => {
                console.warn('Could not fetch asset:', url, error.message);
                // Continue despite the error
                return Promise.resolve();
              });
          })
        );
      })
      .catch(error => {
        console.error('Cache opening failed:', error);
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Skip certain requests that shouldn't be cached
  
  // Skip if the request URL doesn't use http/https protocol
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return; // Skip non-HTTP(S) requests like chrome-extension:// URLs
  }
  
  // Skip Supabase API requests
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Only cache http/https requests - This is likely line 118 where the error occurs
            if (event.request.url.startsWith('http:') || event.request.url.startsWith('https:')) {
              try {
                caches.open(CACHE_NAME)
                  .then(cache => {
                    try {
                      cache.put(event.request, responseToCache)
                        .catch(putError => {
                          console.warn('Cache put error:', putError.message);
                        });
                    } catch (cacheError) {
                      console.warn('Error in cache.put operation:', cacheError.message);
                    }
                  })
                  .catch(openError => {
                    console.warn('Error opening cache:', openError.message);
                  });
              } catch (error) {
                console.warn('Error in caching block:', error.message);
              }
            } else {
              console.log('Skipping non-HTTP URL for caching:', event.request.url.substring(0, 50) + '...');
            }
              
            return response;
          }
        );
      })
      .catch(error => {
        console.warn('Fetch handler error:', error.message);
        // Fall back to network if anything fails
        return fetch(event.request);
      })
  );
});

// Push notification event
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'img/icons/icon-192x192.png',
    badge: 'img/icons/icon-72x72.png',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Handle messages from the client
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.action === 'CHECK_FOR_UPDATES') {
    // Store the version that was last used by the client
    const clientVersion = event.data.version;
    
    // If the current service worker version is different from the client's version
    if (clientVersion && clientVersion !== APP_VERSION) {
      console.log(`Update available: Client is on ${clientVersion}, Service Worker is on ${APP_VERSION}`);
      
      // Notify the client about the update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            currentVersion: APP_VERSION,
            clientVersion: clientVersion
          });
        });
      });
    } else {
      console.log('No update available or versions match');
    }
  }
});