import config from './config.js';

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
  'http://localhost:3000'
];

self.addEventListener('install', (event) => {
  if (config.isPWATestMode) {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (config.isPWATestMode || API_HOSTS.includes(url.origin)) {
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
