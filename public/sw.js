const CACHE_NAME = 'endo-mini-shell-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request)
      if (cached) return cached
      try {
        const response = await fetch(event.request)
        if (response && response.status === 200 && response.type === 'basic') {
          cache.put(event.request, response.clone())
        }
        return response
      } catch (error) {
        if (event.request.mode === 'navigate') {
          const fallback = await cache.match('/index.html')
          if (fallback) return fallback
        }
        throw error
      }
    })
  )
})
