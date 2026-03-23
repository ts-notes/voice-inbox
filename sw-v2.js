const CACHE_NAME = 'voice-inbox-v2-shell-20260323-1';
const APP_SHELL = [
    './v2.html',
    './manifest-v2.json',
    './icons/v2-icon-180.png',
    './icons/v2-icon-192.png',
    './icons/v2-icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        const urls = APP_SHELL.map(asset => new URL(asset, self.location).toString());
        await cache.addAll(urls);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter(key => key.startsWith('voice-inbox-v2-shell-') && key !== CACHE_NAME)
                .map(key => caches.delete(key))
        );
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const response = await fetch(request);
                const cache = await caches.open(CACHE_NAME);
                await cache.put(new URL('./v2.html', self.location).toString(), response.clone());
                return response;
            } catch (error) {
                const cached = await caches.match(request, { ignoreSearch: true });
                if (cached) return cached;
                return caches.match(new URL('./v2.html', self.location).toString());
            }
        })());
        return;
    }

    event.respondWith((async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) {
            fetch(request)
                .then(async response => {
                    if (!response || response.status !== 200) return;
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(request, response.clone());
                })
                .catch(() => {});
            return cached;
        }

        const response = await fetch(request);
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }
        return response;
    })());
});
