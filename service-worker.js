const isPWATestMode = true;
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

const API_HOSTS = [
  'https://legally-modest-joey.ngrok-free.app',
  'http://localhost:3000',
  'http://192.168.0.58:3000'
];

self.addEventListener('install', (event) => {
  if (isPWATestMode) {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  } else {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(urlsToCache))
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());

  if (isPWATestMode) {
    setInterval(() => {
      self.registration.update();
    }, 30000);
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (isPWATestMode || API_HOSTS.includes(url.origin)) {
    event.respondWith(fetch(event.request));
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(
            (response) => {
              if (event.request.method === 'GET') {
                let responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }
              return response;
            }
          );
        })
    );
  }
});
