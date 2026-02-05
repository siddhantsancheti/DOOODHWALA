// Service Worker for DOOODHWALA - Offline Support
// This enables offline functionality and caches assets for faster loading

const CACHE_NAME = 'dooodhwala-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Skip waiting and activate immediately
      self.skipWaiting();
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      // Take control of all pages immediately
      self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache API requests or external resources
  if (url.pathname.startsWith('/api') || url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response for caching
          const clonedResponse = response.clone();
          
          // Cache successful API responses for offline support
          if (response.ok && request.method === 'GET') {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request).then((response) => {
            if (response) {
              console.log(`[SW] Serving from cache: ${request.url}`);
              return response;
            }
            
            // Return offline page if no cache
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            throw new Error('Network request failed and no cache available');
          });
        })
    );
    return;
  }

  // Network first for HTML/app files
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request);
        })
    );
    return;
  }

  // Cache first for other assets
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request).then((response) => {
        // Cache successful responses
        if (!response || response.status !== 200 || request.method !== 'GET') {
          return response;
        }

        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });

        return response;
      });
    })
  );
});

// Message handler for cache updates
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Cache cleared');
    });
  }
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(
      // Sync pending orders when connection is restored
      fetch('/api/sync-pending-orders', { method: 'POST' })
        .then((response) => response.json())
        .then((data) => {
          console.log('[SW] Orders synced:', data);
          
          // Notify clients that sync is complete
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                tag: 'sync-orders',
                success: true,
              });
            });
          });
        })
        .catch((error) => {
          console.error('[SW] Sync failed:', error);
          
          // Notify clients of failure
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                tag: 'sync-orders',
                success: false,
              });
            });
          });
        })
    );
  }
});

// Periodic background sync for keeping data fresh
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-orders') {
    event.waitUntil(
      fetch('/api/orders', { method: 'GET' })
        .then((response) => response.json())
        .then((data) => {
          // Cache the updated orders
          caches.open(CACHE_NAME).then((cache) => {
            cache.put('/api/orders', new Response(JSON.stringify(data)));
          });
          
          // Notify clients of update
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'ORDERS_UPDATED',
                data,
              });
            });
          });
        })
    );
  }
});

console.log('[SW] Service Worker loaded');
