const CACHE_NAME = 'webcomponent-hub-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/public/data/demos.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/toolbar/prism-toolbar.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/copy-to-clipboard/prism-copy-to-clipboard.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all demo HTML files to cache. This assumes they are in demos/
        // This part might need to be dynamic if demo files change often or are numerous.
        // For now, we'll cache a few common ones if they exist or skip.
        fetch('/public/data/demos.json').then(response => response.json()).then(demos => {
          const demoFiles = demos.map(demo => `/${demo.file}`);
          cache.addAll(urlsToCache.concat(demoFiles));
        }).catch(error => {
          console.warn('Could not fetch demos.json for caching demo files, proceeding with main assets.', error);
          cache.addAll(urlsToCache);
        });
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Serve from cache
        }
        return fetch(event.request).then(
          fetchedResponse => {
            // Check if we received a valid response
            if (!fetchedResponse || fetchedResponse.status !== 200 || fetchedResponse.type !== 'basic') {
              return fetchedResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = fetchedResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // We don't want to cache every single request, e.g. chrome-extension requests
                if (event.request.url.startsWith('http')) {
                    cache.put(event.request, responseToCache);
                }
              });

            return fetchedResponse;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
