export function timeAgo(date) {
    const dateObj = new Date(date);
    const seconds = Math.floor((new Date() - dateObj) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) {
        return Math.floor(interval) + "y ago";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + "mo ago";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + "d ago";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + "h ago";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + "m ago";
    }
    return "Just now";
}

// Native Image Compressor
export async function compressImage(file, maxWidth = 1080, quality = 0.7) {
    return new Promise((resolve, reject) => {
        if (!file.type.match(/image.*/)) {
            resolve(file); // Return original if not an image
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if it exceeds max width
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert back to a File blob
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}
// ==========================================
// OFFLINE STORAGE ENGINE (IndexedDB)
// ==========================================
export async function initDB() {
    return new Promise((resolve, reject) => {
        // Increased version to 2 to trigger database upgrade
        const request = indexedDB.open('ECampusDB', 2);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('feed_cache')) {
                db.createObjectStore('feed_cache', { keyPath: 'id' });
            }
            // 🚀 NEW: Add tables for Hotposts and Updates
            if (!db.objectStoreNames.contains('hotposts_cache')) {
                db.createObjectStore('hotposts_cache', { keyPath: 'user_id' }); 
            }
            if (!db.objectStoreNames.contains('updates_cache')) {
                db.createObjectStore('updates_cache', { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Could not open IndexedDB');
    });
}

export async function saveFeedToCache(posts) {
    const db = await initDB();
    const tx = db.transaction('feed_cache', 'readwrite');
    const store = tx.objectStore('feed_cache');
    store.clear(); 
    posts.forEach(post => store.put(post));
}

export async function getFeedFromCache() {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction('feed_cache', 'readonly');
        const store = tx.objectStore('feed_cache');
        const request = store.getAll();
        request.onsuccess = () => {
            const posts = request.result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            resolve(posts);
        };
        request.onerror = () => resolve([]);
    });
}

// 🚀 NEW: Hotposts Cache Helpers
export async function saveHotpostsToCache(hotpostsByUserArray) {
    const db = await initDB();
    const tx = db.transaction('hotposts_cache', 'readwrite');
    const store = tx.objectStore('hotposts_cache');
    store.clear(); 
    hotpostsByUserArray.forEach(item => store.put(item));
}

export async function getHotpostsFromCache() {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction('hotposts_cache', 'readonly');
        const store = tx.objectStore('hotposts_cache');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve([]);
    });
}

// 🚀 NEW: Updates Cache Helpers
export async function saveUpdatesToCache(updates) {
    const db = await initDB();
    const tx = db.transaction('updates_cache', 'readwrite');
    const store = tx.objectStore('updates_cache');
    store.clear(); 
    updates.forEach(update => store.put(update));
}

export async function getUpdatesFromCache() {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction('updates_cache', 'readonly');
        const store = tx.objectStore('updates_cache');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        request.onerror = () => resolve([]);
    });
}
