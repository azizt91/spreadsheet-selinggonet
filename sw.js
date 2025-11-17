// Service Worker untuk PWA Selinggonet
const CACHE_NAME = 'selinggonet-v1.5.2';
const urlsToCache = [
  '/',
  '/app-settings.html',
  '/index.html',
  '/dashboard.html',
  '/faq_wifi_modem.html',
  '/ganti-wifi.html',
  '/laporan.html',
  '/menu_bantuan.html',
  '/notifikasi.html',
  '/paket.html',
  '/payment-methods.html',
  '/pelanggan.html',
  '/tagihan.html',
  '/pengeluaran.html',
  '/pelanggan_dashboard.html',
  '/pelanggan_profile.html',
  '/pelanggan_riwayat_lunas.html',
  '/pelanggan_info.html',
  '/profile.html',
  '/tutorial_ganti_wifi.html',
  '/style.css',
  '/app-settings.js',
  '/apply-settings.js',
  '/login.js',
  '/auth.js',
  '/datetime-display.js',
  '/dashboard.js',
  '/ganti-wifi.js',
  '/laporan.js',
  '/notification-badge.js',
  '/notification-service.js',
  '/notifikasi.js',
  '/paket.js',
  '/payment-methods.js',
  '/pelanggan.js',
  '/tagihan.js',
  '/pengeluaran.js',
  '/pelanggan_dashboard.js',
  '/pelanggan_profile.js',
  '/pelanggan_riwayat_lunas.js',
  '/pelanggan_info.js',
  '/profile.js',
  '/assets/selinggonet.png',
  '/assets/qris.jpeg',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'
];

// Install Event - Cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Network-first for Supabase functions to avoid caching API responses.
  if (event.request.url.includes('/functions/v1/')) {
    // Always go to the network.
    event.respondWith(
      fetch(event.request).catch(() => {
        // Optional: return a generic offline error for API calls
        return new Response(
          JSON.stringify({ error: 'Anda sedang offline. Tidak dapat mengambil data.' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return; // Stop further processing
  }

  // Cache-first for all other assets (like HTML, CSS, JS, images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network, cache it, and then return it.
      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // IMPORTANT: Clone the response. A response is a stream
        // and because we want the browser to consume the response
        // as well as the cache consuming the response, we need
        // to clone it so we have two streams.
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});

// Background Sync (for when connection is restored)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    // Handle background sync tasks here
  }
});

// Push Notification (optional for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/assets/selinggonet.png',
      badge: '/assets/selinggonet.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    
    event.waitUntil(
      self.registration.showNotification('Selinggonet', options)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked, opening notification center.');
  event.notification.close();
  
  // Arahkan ke HALAMAN NOTIFIKASI BARU
  event.waitUntil(
    clients.openWindow('/notifikasi.html')
  );
});