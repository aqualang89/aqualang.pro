const CACHE_NAME = 'aqualang-v1';
const ASSETS = [
  '/',
  '/styles/base.css?v=6',
  '/styles/layout.css?v=6',
  '/styles/components.css?v=6',
  '/scripts/main.js?v=6',
  '/scripts/chat-widget.js?v=6',
  '/scripts/hero-particles.js?v=6',
  '/fonts/lora.css',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/og.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
