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
        const request = indexedDB.open('ECampusDB', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('feed_cache')) {
                db.createObjectStore('feed_cache', { keyPath: 'id' });
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
    // Clear old cache and save new posts
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
            // Sort by created_at descending
            const posts = request.result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            resolve(posts);
        };
        request.onerror = () => resolve([]);
    });
}
