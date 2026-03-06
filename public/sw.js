// Service Worker for PWA offline support and push notifications
const CACHE_NAME = 'lit-club-v2';
const urlsToCache = [
  '/',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      // Cache only app shell. API responses should stay network-fresh.
      return cache.addAll(urlsToCache).catch((error) => {
        console.log('Cache addAll failed (this is OK in dev):', error);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always bypass SW cache for API to avoid stale DB data.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Skip caching for static files in development
  if (url.pathname.includes('_next/static') || url.pathname.includes('hot')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      
      // For network requests, add error handling
      return fetch(event.request).catch((error) => {
        console.error('Fetch failed:', error);
        
        // If it's a navigation request, show offline page if cached
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        
        // For other requests, return error response
        return new Response(
          JSON.stringify({ error: 'Network request failed' }),
          { status: 503, statusText: 'Service Unavailable' }
        );
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '文芸部ポータル';
  const options = {
    body: data.body || '新しい通知があります',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/',
    requireInteraction: false,
    tag: data.tag || 'default',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
