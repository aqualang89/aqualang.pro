const CACHE_NAME = 'aqualang-v3';
const ASSETS = [
  '/',
  '/styles/base.css?v=7',
  '/styles/layout.css?v=7',
  '/styles/components.css?v=8',
  '/scripts/main.js?v=7',
  '/scripts/chat-widget.js?v=7',
  '/scripts/hero-particles.js',
  '/scripts/hero-particles-2d.js?v=5',
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
  // HTML/навигация — всегда из сети, кэш только офлайн-резерв. Иначе SW отдаёт старую страницу вечно
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
    return;
  }
  // статика (css/js с ?v=, шрифты, картинки) — из кэша, нет в кэше → сеть
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
