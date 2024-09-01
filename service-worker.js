const CACHE_NAME = 'betbox-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/main.js',
  '/manifest.json',
  '/images/favicon.ico',
  'images/logo192.png',
  'images/logo512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
