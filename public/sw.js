const CACHE_NAME = 'crosswire-v1'
const OFFLINE_URL = '/offline.html'

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE)
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL)
      })
    )
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request)
      })
    )
  }
})

// Web Push Notification Event Listener
self.addEventListener('push', event => {
  try {
    const data = event.data ? event.data.json() : { title: 'CrossWire Notification', body: 'New wire transfer update.' }
    const options = {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard'
      }
    }
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  } catch (err) {
    console.error('Error rendering push event:', err)
  }
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow(event.notification.data.url)
  )
})
