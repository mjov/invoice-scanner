const CACHE = 'invoicescan-v1';

// Assets to cache on install — everything the app needs to load offline
const PRECACHE = [
  './invoice-qr-agent.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js',
  'https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;600;700;800&display=swap'
];

// Install — cache all precache assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for local assets, network-first for API calls
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go to network for API calls (Anthropic, Google Sheets, OAuth, CORS proxies)
  const networkOnly = [
    'api.anthropic.com',
    'sheets.googleapis.com',
    'accounts.google.com',
    'googleapis.com',
    'corsproxy.io',
    'allorigins.win',
    'suf.purs.gov.rs'
  ];
  if (networkOnly.some(h => url.hostname.includes(h))) {
    return; // Let browser handle — no SW interception
  }

  // Cache-first for everything else (app shell, fonts, jsQR)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache valid responses for next time
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback — return cached app shell
        if (e.request.destination === 'document') {
          return caches.match('./invoice-qr-agent.html');
        }
      });
    })
  );
});
