const CACHE_NAME = 'betbox-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/main.js',
  '/manifest.json',
  'images/favicon.ico',
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
  console.log(`Fetching: ${event.request.url}`);
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log(`Serving from cache: ${event.request.url}`);
          return response;
        }
        console.log(`Fetching from network: ${event.request.url}`);
        return fetch(event.request);
      })
  );
});

