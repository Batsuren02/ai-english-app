const CACHE_NAME = 'english-app-v1'
const URLS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico',
]

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch((err) => {
        console.log('Cache addAll error:', err)
        // Fail silently - app will still work
      })
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return
  }

  // Network-first strategy for API calls
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const clonedResponse = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse)
            })
          }
          return response
        })
        .catch(() => {
          // Fall back to cache
          return caches.match(request).then((cached) => {
            return cached || new Response('Offline - Resource not cached', { status: 503 })
          })
        })
    )
  } else {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request)
      })
    )
  }
})

// Handle background sync for offline reviews
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reviews') {
    event.waitUntil(syncOfflineReviews())
  }
})

async function syncOfflineReviews() {
  try {
    // This will be called when connection is restored
    const message = { type: 'SYNC_REVIEWS' }
    const clients = await self.clients.matchAll()
    clients.forEach((client) => client.postMessage(message))
  } catch (err) {
    console.error('Sync error:', err)
  }
}

// Message handler for cache control
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME)
  }
})
