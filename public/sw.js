// FinanzaFlow Service Worker — v2
// Estrategia network-first: online SIEMPRE pide la versión más reciente al
// servidor (las actualizaciones de Vercel se ven al recargar). Si no hay red,
// sirve la copia en caché para que la PWA siga funcionando offline.
const CACHE = 'ff-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['/', '/index.html']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Solo interceptamos recursos del propio origen (Firebase, fuentes, etc. pasan directo)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then(
          (cached) => cached || caches.match('/')
        )
      )
  );
});
