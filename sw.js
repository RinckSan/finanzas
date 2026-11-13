// Service worker: permite abrir la app sin internet.
// Sube el número de versión cuando cambies los archivos para forzar la actualización.
const CACHE = 'finanzas-v1';

const LOCAL = ['./', './manifest.webmanifest', './icon-180.png', './icon-512.png'];
const CDN = [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css',
    'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE).then(async (c) => {
        await c.addAll(LOCAL);
        // Librerías externas: se guardan si se puede; si falla alguna, la app igual se instala
        await Promise.all(CDN.map(url =>
            fetch(new Request(url, { mode: 'no-cors' })).then(r => c.put(url, r)).catch(() => {})
        ));
    }));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    const sameOrigin = new URL(e.request.url).origin === location.origin;
    const keep = (res) => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
    };

    if (sameOrigin) {
        // Archivos propios: primero la red (para recibir actualizaciones), si no hay, la copia guardada
        e.respondWith(
            fetch(e.request).then(keep)
                .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./')))
        );
    } else {
        // Librerías: primero la copia guardada, si no hay, la red
        e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(keep)));
    }
});
