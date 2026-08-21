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
        // Upgrade to Version 4 to add the Action Queue table
        const request = indexedDB.open('ECampusDB', 4);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('feed_cache')) db.createObjectStore('feed_cache', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('hotposts_cache')) db.createObjectStore('hotposts_cache', { keyPath: 'user_id' }); 
            if (!db.objectStoreNames.contains('updates_cache')) db.createObjectStore('updates_cache', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('suggestions_cache')) db.createObjectStore('suggestions_cache', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('notifications_cache')) db.createObjectStore('notifications_cache', { keyPath: 'id' });
            
            // 🚀 NEW: Background Sync Action Queue
            if (!db.objectStoreNames.contains('action_queue')) {
                db.createObjectStore('action_queue', { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Could not open IndexedDB');
    });
}

// --- KEEP EXISTING CACHE HELPERS ---
export async function saveFeedToCache(posts) {
    const db = await initDB();
    const tx = db.transaction('feed_cache', 'readwrite');
    tx.objectStore('feed_cache').clear(); 
    posts.forEach(post => tx.objectStore('feed_cache').put(post));
}
export async function getFeedFromCache() {
    const db = await initDB();
    return new Promise(resolve => {
        const req = db.transaction('feed_cache', 'readonly').objectStore('feed_cache').getAll();
        req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        req.onerror = () => resolve([]);
    });
}
export async function saveHotpostsToCache(hotpostsByUserArray) {
    const db = await initDB();
    const tx = db.transaction('hotposts_cache', 'readwrite');
    tx.objectStore('hotposts_cache').clear(); 
    hotpostsByUserArray.forEach(item => tx.objectStore('hotposts_cache').put(item));
}
export async function getHotpostsFromCache() {
    const db = await initDB();
    return new Promise(resolve => {
        const req = db.transaction('hotposts_cache', 'readonly').objectStore('hotposts_cache').getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve([]);
    });
}
export async function saveUpdatesToCache(updates) {
    const db = await initDB();
    const tx = db.transaction('updates_cache', 'readwrite');
    tx.objectStore('updates_cache').clear(); 
    updates.forEach(update => tx.objectStore('updates_cache').put(update));
}
export async function getUpdatesFromCache() {
    const db = await initDB();
    return new Promise(resolve => {
        const req = db.transaction('updates_cache', 'readonly').objectStore('updates_cache').getAll();
        req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        req.onerror = () => resolve([]);
    });
}
export async function saveSuggestionsToCache(users) {
    const db = await initDB();
    const tx = db.transaction('suggestions_cache', 'readwrite');
    tx.objectStore('suggestions_cache').clear(); 
    users.forEach(user => tx.objectStore('suggestions_cache').put(user));
}
export async function getSuggestionsFromCache() {
    const db = await initDB();
    return new Promise(resolve => {
        const req = db.transaction('suggestions_cache', 'readonly').objectStore('suggestions_cache').getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve([]);
    });
}
export async function saveNotificationsToCache(notifs) {
    const db = await initDB();
    const tx = db.transaction('notifications_cache', 'readwrite');
    tx.objectStore('notifications_cache').clear(); 
    notifs.forEach(notif => tx.objectStore('notifications_cache').put(notif));
}
export async function getNotificationsFromCache() {
    const db = await initDB();
    return new Promise(resolve => {
        const req = db.transaction('notifications_cache', 'readonly').objectStore('notifications_cache').getAll();
        req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        req.onerror = () => resolve([]);
    });
}

// ==========================================
// 🚀 NEW: OFFLINE ACTION QUEUE HELPERS
// ==========================================
export async function queueOfflineAction(actionType, payload) {
    const db = await initDB();
    const tx = db.transaction('action_queue', 'readwrite');
    tx.objectStore('action_queue').put({ type: actionType, payload: payload, timestamp: Date.now() });
}

export async function getActionQueue() {
    const db = await initDB();
    return new Promise(resolve => {
        const req = db.transaction('action_queue', 'readonly').objectStore('action_queue').getAll();
        req.onsuccess = () => resolve(req.result.sort((a, b) => a.timestamp - b.timestamp));
        req.onerror = () => resolve([]);
    });
}

export async function clearAction(id) {
    const db = await initDB();
    const tx = db.transaction('action_queue', 'readwrite');
    tx.objectStore('action_queue').delete(id);
}
