// Service Worker untuk PWA Selinggonet
const CACHE_NAME = 'selinggonet-v1.5.2';
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/pelanggan.html',
  '/tagihan.html',
  '/pengeluaran.html',
  '/pelanggan_dashboard.html',
  '/pelanggan_profile.html',
  '/pelanggan_riwayat_lunas.html',
  '/pelanggan_info.html',
  '/profile.html',
  '/style.css',
  '/login.js',
  '/auth.js',
  '/datetime-display.js',
  '/dashboard.js',
  '/pelanggan.js',
  '/tagihan.js',
  '/pengeluaran.js',
  '/pelanggan_dashboard.js',
  '/pelanggan_profile.js',
  '/pelanggan_riwayat_lunas.js',
  '/pelanggan_info.js',
  '/profile.js',
  '/assets/selinggonet.png',
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
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        // For API calls, try network first, then show offline message
        if (event.request.url.includes('/api/') || event.request.url.includes('localhost:3000')) {
          return fetch(event.request).catch(() => {
            // Return a custom offline response for API calls
            return new Response(
              JSON.stringify({ 
                message: 'Aplikasi sedang offline. Silakan coba lagi ketika koneksi internet tersedia.' 
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        }
        
        // For other requests, try network first
        return fetch(event.request).catch(() => {
          // If network fails, return cached version if available
          return caches.match('/index.html');
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