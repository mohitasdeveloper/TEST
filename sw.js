const CACHE_NAME = 'ecampus-cache-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './main.js',
    './feed.js',
    './hotposts.js',
    './search.js',
    './updates.js',
    './notifications.js',
    './utils.js',
    './ui.js',
    './config.js',
    './supabase.js'
];
// 1. Install & Cache Static Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// 2. Activate & Clean Up Old Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) return caches.delete(cache);
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Intercept Fetch Requests (Cache media, handle offline)
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Ignore Supabase API calls (we cache the JSON using IndexedDB)
    if (url.includes('supabase.co/rest')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached version if we have it
            if (cachedResponse) return cachedResponse;

            // Otherwise, fetch from the network
            return fetch(event.request).then((networkResponse) => {
                // 🚀 DYNAMIC MEDIA CACHING: If it's an image/video from Cloudinary or UI-Avatars, save a copy!
                if (url.includes('cloudinary.com') || url.includes('ui-avatars.com')) {
                    const responseClone = networkResponse.clone();
                    caches.open('ecampus-media-cache-v1').then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // 🚀 CRASH FIX: Return fallback responses when completely offline
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                // Return a dummy empty response to prevent "TypeError: Failed to convert value to Response"
                return new Response('', { status: 503, statusText: 'Offline' });
            });
        })
    );
});
