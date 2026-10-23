const CACHE_NAME = 'lerntoolbox-v22';

// CRITICAL: These MUST exist for the app to run. Install will fail if these fail.
const ASSETS_CRITICAL = [
  './',
  './index.html',
  './style.css',
  './css/digiboard.css',
  './script.js',
  './js/cloud-sync.js',
  './js/digiboard/Digiboard.js',
  './js/digiboard/WidgetManager.js',
  './js/digiboard/widgets/BaseWidget.js',
  './manifest.json',
  './offline.html'
];

// OPTIONAL: These are good to have, but if they fail (e.g. CDN blocked), we continue.
const ASSETS_OPTIONAL = [
  './icon-192.png',
  './icon-512.png',
  './favicon.png',
  './js/qrcode.min.js',
  './js/qrcode_tool.js',
  './js/digiboard/widgets/RandomNameWidget.js',
  './js/digiboard/widgets/DiceWidget.js',
  './js/digiboard/widgets/DrawingWidget.js',
  './js/digiboard/widgets/TextWidget.js',
  './js/digiboard/widgets/SymbolWidget.js',
  './js/digiboard/widgets/TrafficLightWidget.js',
  './js/digiboard/widgets/TimerWidget.js',
  './js/digiboard/widgets/ClockWidget.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        await cache.addAll(ASSETS_CRITICAL);
        console.log('[Service Worker] Critical assets cached');
      } catch (err) {
        console.error('[Service Worker] Critical asset cache failed:', err);
        throw err;
      }

      await Promise.allSettled(
        ASSETS_OPTIONAL.map(url =>
          cache.add(url).catch(e => console.warn(`[Service Worker] Failed to cache optional ${url}:`, e))
        )
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload if supported
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      const keyList = await caches.keys();
      await Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })()
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // NEVER cache API requests — always go to network for fresh data
  if (event.request.url.includes('/api/')) {
    return;
  }

  if (event.request.url.endsWith('.map')) {
    event.respondWith(new Response(null, { status: 404, statusText: 'Not Found' }));
    return;
  }

  // Navigation Logic (HTML) - Network First, then Cache, then Offline Page
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      (async () => {
        try {
          // 1. Try Network
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            }
          } catch (error) {
            console.log('[Service Worker] Network request failed, falling back to cache');
          }

          // 2. Try Cache
          const cache = await caches.open(CACHE_NAME);

          // Exact match
          let cachedResponse = await cache.match(event.request, { ignoreSearch: true });

          // Fuzzy match
          if (!cachedResponse) {
            const keys = await cache.keys();

            // 1. Try to find keys that match the request if we normalize it (e.g. / -> /index.html)
            let searchUrl = event.request.url;
            if (!searchUrl.endsWith('/') && !searchUrl.endsWith('index.html')) {
              // It's some other path, maybe we should try appending index.html? 
              // Actually, for a PWA SPA, we usually want to serve index.html for ANY navigation.
            }

            // Simple Logic: Find the app shell (root ./).
            const appShellKey = keys.find(request =>
              request.url.endsWith('/') && !request.url.endsWith('index.html')
            );

            if (appShellKey) {
              cachedResponse = await cache.match(appShellKey);
            }
          }

          if (cachedResponse) {
            return cachedResponse;
          }

          // 3. Fallback to offline.html
          const offlinePage = await cache.match('./offline.html');
          if (offlinePage) {
            return offlinePage;
          }

          // 4. Last Resort (Inline HTML)
          return new Response(
            '<h1>Offline</h1><p>Die Lerntoolbox ist offline nicht verfügbar.</p><button onclick="window.location.reload()">Neuladen</button>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );

        } catch (error) {
          console.error('[Service Worker] Navigation logic failed:', error);
          // Absolute fail-safe
          return new Response(
            '<h1>Offline</h1><p>Ein Fehler ist aufgetreten. Bitte laden Sie die Seite neu.</p><button onclick="window.location.reload()">Neuladen</button>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // Asset Logic (Stale-While-Revalidate)
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request, { ignoreSearch: true });

      const networkFetch = fetch(event.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') { // Only cache valid responses
          cache.put(event.request, res.clone());
        }
        return res;
      }).catch(() => null);

      return cachedResponse || await networkFetch;
    })()
  );
});
