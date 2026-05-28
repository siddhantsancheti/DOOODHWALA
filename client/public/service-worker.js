// Self-unregistering service worker — kill-switch.
//
// An earlier version of this app registered a service worker that
// aggressively cached the SPA's static assets. After a Render redeploy
// briefly returned 500 for those assets, the old SW cached the failures
// and stranded users on a blank page, surviving hard refreshes.
//
// This replacement does the opposite: on activation it deletes every
// cache it can see, unregisters itself, and forces every controlled tab
// to reload from the network. Any browser that fetches /service-worker.js
// from this point on installs THIS file, which then evicts itself
// permanently. New visitors are never registered for a service worker
// at all because the React code no longer calls .register().

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        try {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
        } catch (e) {
            // ignore — best-effort cleanup
        }
        try {
            await self.registration.unregister();
        } catch (e) {
            // ignore
        }
        try {
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach((client) => {
                // Reload each controlled tab so the user sees fresh content
                // immediately instead of the stranded blank page.
                client.navigate(client.url);
            });
        } catch (e) {
            // ignore
        }
    })());
});

// While this worker is briefly alive, pass every fetch straight through
// to the network — never serve from cache.
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
