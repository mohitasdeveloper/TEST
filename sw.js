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

// 1. Install & Cache Static Assets (Bulletproof Version)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('Caching assets one by one to prevent crashes...');
            for (let asset of STATIC_ASSETS) {
                try {
                    // Try to cache the file
                    await cache.add(asset);
                } catch (e) {
                    // If the file is missing on GitHub, just skip it and don't crash!
                    console.warn(`Skipped missing asset: ${asset}`);
                }
            }
        })
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

// 3. Intercept Fetch Requests (Cache media & CDNs, handle offline)
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Ignore all Supabase database, auth & realtime requests (we handle offline manually)
    if (url.includes('supabase.co/rest') || url.includes('supabase.co/auth') || url.includes('supabase.co/realtime')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached version if we have it (Fonts, CSS, Icons)
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then((networkResponse) => {
                // 🚀 DYNAMIC CACHING: Save Media AND External UI Assets (Fonts, Tailwind, Icons)
                const cacheableDomains = [
                    'cloudinary.com',
                    'ui-avatars.com',
                    'fonts.googleapis.com',
                    'fonts.gstatic.com',
                    'cdn.tailwindcss.com',
                    'cdnjs.cloudflare.com',
                    'cdn.jsdelivr.net'
                ];

                if (cacheableDomains.some(domain => url.includes(domain))) {
                    const responseClone = networkResponse.clone();
                    caches.open('ecampus-external-cache-v1').then((cache) => {
                        cache.put(event.request, responseClone);
                    });
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
