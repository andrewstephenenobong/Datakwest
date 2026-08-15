const CACHE_VERSION = 'datakwest-shell-v1'
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = ['/', OFFLINE_URL, '/manifest.webmanifest', '/icons/datakwest-owl-192.png', '/icons/datakwest-owl-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function isPublicSameOriginGet(request) {
  const url = new URL(request.url)
  return request.method === 'GET' && url.origin === self.location.origin
}

function isStaticAsset(request) {
  const url = new URL(request.url)
  return /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname) || url.pathname === '/manifest.webmanifest'
}

async function networkFirst(request, fallbackRequest = null) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION)
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (fallbackRequest) return caches.match(fallbackRequest)
    throw new Error('Network unavailable')
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION)
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    return caches.match(OFFLINE_URL)
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (!isPublicSameOriginGet(request)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, OFFLINE_URL))
    return
  }

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request))
  }
})
