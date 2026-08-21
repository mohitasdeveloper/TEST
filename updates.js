import { supabase } from './supabase.js';
import { saveUpdatesToCache, getUpdatesFromCache } from './utils.js'; // <-- NEW
// Professional Shimmer Skeleton for Campus Updates
const UPDATES_SKELETON = `
    <div class="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-gray-200 dark:border-neutral-800 shadow-sm mb-4 animate-pulse">
        <div class="w-16 h-5 rounded-md shimmer-bg mb-4"></div>
        <div class="w-3/4 h-5 rounded-md shimmer-bg mb-3"></div>
        <div class="w-full h-3.5 rounded-md shimmer-bg mb-2"></div>
        <div class="w-5/6 h-3.5 rounded-md shimmer-bg"></div>
    </div>
`.repeat(4);

export function initUpdates() {
   
}

async function fetchUpdates() {
    const container = document.getElementById('updates-container');
    if (!container) return;

    container.innerHTML = UPDATES_SKELETON;

    // 🚀 OFFLINE INTERCEPTOR
    if (!navigator.onLine) {
        try {
            const cachedUpdates = await getUpdatesFromCache();
            renderUpdates(cachedUpdates);
        } catch(e) { console.error("Offline updates error:", e); }
        return;
    }

    try {
        const { data, error } = await supabase
            .from('campus_updates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderUpdates(data);
        
        // 🚀 SAVE TO OFFLINE CACHE
        saveUpdatesToCache(data);

    } catch (error) {
        console.error('Error fetching campus updates:', error);
        container.innerHTML = `<p class="text-sm italic text-center py-4 text-error">Failed to load updates.</p>`;
    }
}

function renderUpdates(updates) {
    const container = document.getElementById('updates-container');
    if (updates.length === 0) {
        container.innerHTML = `<div class="py-12 flex flex-col items-center justify-center opacity-40 text-on-surface-variant">
            <span class="material-symbols-outlined text-[42px] mb-2">campaign</span>
            <p class="text-sm font-medium">No campus updates right now.</p>
        </div>`;
        return;
    }

    const categoryColors = {
        'Event': 'bg-primary/10 text-primary',
        'Notice': 'bg-secondary/10 text-secondary',
        'Academic': 'bg-orange-500/10 text-orange-500',
        'Holiday': 'bg-blue-500/10 text-blue-500',
    };

    container.innerHTML = updates.map(update => `
        <div class="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-gray-200 dark:border-neutral-800 shadow-sm cursor-pointer active:scale-[0.98] mb-4">
            <div class="flex justify-between items-center mb-3">
                <span class="${categoryColors[update.category] || 'bg-gray-100 text-gray-800'} text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest">${update.category}</span>
            </div>
            <h3 class="text-[16px] font-bold text-gray-900 dark:text-gray-100 mb-1">${update.title}</h3>
            <p class="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">${update.content}</p>
        </div>
    `).join('');
}

window.refreshUpdates = fetchUpdates;
