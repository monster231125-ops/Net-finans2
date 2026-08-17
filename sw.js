/* Service Worker — Libro Mayor
   Cachea el "cascarón" de la app (HTML, manifest, íconos) para que abra
   sin conexión. Los datos financieros se sincronizan aparte con Google
   Sheets cuando hay internet; la app ya guarda una copia local para
   mostrarla si te quedas sin señal (ver libro-mayor.html). */

const CACHE_NAME = 'libro-mayor-v1';
const APP_SHELL = [
  './libro-mayor.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // no interceptar POST (sincronización con Sheets)

  const url = new URL(req.url);
  const esMismoOrigen = url.origin === self.location.origin;

  if (esMismoOrigen) {
    // Cascarón de la app: cache primero, red de respaldo.
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => cached))
    );
  } else {
    // Recursos externos (fuentes, Chart.js): red primero, cache de respaldo.
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
