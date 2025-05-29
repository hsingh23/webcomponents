const CACHE_NAME = 'webcomponent-hub-cache-v2'; // Incremented cache version
const DATA_CACHE_NAME = 'webcomponent-hub-data-cache-v2'; // Incremented data cache version

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  // Add paths to your icons here, e.g., '/icons/icon-192x192.png'
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/toolbar/prism-toolbar.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/copy-to-clipboard/prism-copy-to-clipboard.min.js'
];

const DEMOS_JSON_URL = '/public/data/demos.json';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Core assets cache opened');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        // Pre-cache demos.json separately in the data cache
        return caches.open(DATA_CACHE_NAME).then(cache => {
          console.log('Data cache opened, caching demos.json');
          return cache.add(DEMOS_JSON_URL);
        });
      })
      .then(() => self.skipWaiting()) // Activate new service worker immediately
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, DATA_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Take control of all open clients
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  // Strategy: Stale-While-Revalidate for demos.json
  if (requestUrl.pathname === DEMOS_JSON_URL) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const fetchPromise = fetch(request).then(networkResponse => {
            // Check if the fetched demos.json is different from the cached one
            if (cachedResponse) {
              cachedResponse.text().then(cachedText => {
                networkResponse.clone().text().then(networkText => {
                  if (cachedText !== networkText) {
                    console.log('demos.json has changed. Caching new version and notifying clients.');
                    cache.put(request, networkResponse.clone());
                    notifyClientsOfUpdate();
                  } else {
                    console.log('demos.json is unchanged.');
                  }
                });
              });
            } else {
              // If not cached, cache it directly
              console.log('demos.json not in cache. Caching new version.');
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(error => {
            console.error('Fetch failed for demos.json:', error);
            // Optionally, return a fallback if network fails and nothing is cached
            // return new Response(JSON.stringify({ error: "Failed to fetch demos" }), { headers: { 'Content-Type': 'application/json' } });
          });

          // Return cached response immediately if available, otherwise wait for network
          return cachedResponse || fetchPromise;
        });
      })
    );
  } 
  // Strategy: Cache First for core assets, then network fallback
  else if (CORE_ASSETS.some(assetUrl => requestUrl.href === new URL(assetUrl, self.location.origin).href) || requestUrl.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(networkResponse => {
          // Optional: Cache other same-origin GET requests dynamically if needed
          if (request.method === 'GET' && requestUrl.origin === self.location.origin) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
  } 
  // For all other requests (e.g., cross-origin, non-GET), just fetch from network
  else {
    event.respondWith(fetch(request));
  }
});

function notifyClientsOfUpdate() {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'NEW_CONTENT_AVAILABLE' });
    });
  });
}
