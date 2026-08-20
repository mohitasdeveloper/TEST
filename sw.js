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
    'https://cdn.tailwindcss.com?plugins=forms,container-queries',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Courgette&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
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

// 3. Intercept Fetch Requests (Cache-First for Static, Network-First for API)
self.addEventListener('fetch', (event) => {
    // Ignore Supabase API requests (we will handle database caching manually)
    if (event.request.url.includes('supabase.co')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return fetch(event.request).catch(() => {
                // If network fails and it's an HTML page, return the cached index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
