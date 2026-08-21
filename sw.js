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
    './supabase.js',
    './auth/login.html',
    './auth/style.css',
    './auth/main.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Ignore all Supabase database & auth requests (we handle offline manually)
    if (url.includes('supabase.co/rest') || url.includes('supabase.co/auth')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then((networkResponse) => {
                // DYNAMIC MEDIA CACHING
                if (url.includes('cloudinary.com') || url.includes('ui-avatars.com')) {
                    const responseClone = networkResponse.clone();
                    caches.open('ecampus-media-cache-v1').then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            }).catch(() => {
                // ROUTE FALLBACKS WHEN OFFLINE
                if (event.request.mode === 'navigate') {
                    if (url.includes('/auth/login.html')) return caches.match('./auth/login.html');
                    return caches.match('./index.html');
                }
                return new Response('', { status: 503, statusText: 'Offline' });
            });
        })
    );
});
