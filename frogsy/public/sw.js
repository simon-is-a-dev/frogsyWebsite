self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  const data = event.data?.json() ?? {};
  console.log('Push data:', data);

  const options = {
    body: data.body ?? 'Time to log your pain 🐸',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'pain-reminder',
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Open Frogsy',
        icon: '/favicon.png'
      }
    ]
  };

  console.log('Showing notification with options:', options);

  event.waitUntil(
    self.registration.showNotification(
      data.title ?? 'Frogsy Reminder',
      options
    ).then(() => {
      console.log('Notification shown successfully');
    }).catch(error => {
      console.error('Error showing notification:', error);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ 
        type: 'window', 
        includeUncontrolled: true 
      })
      .then((clients) => {
        console.log('Found clients:', clients.length);
        
        // Focus existing window if available
        for (const client of clients) {
          if (client.url.includes('/main') && 'focus' in client) {
            console.log('Focusing existing client');
            return client.focus();
          }
        }
        
        // Open new window
        console.log('Opening new window');
        if (self.clients.openWindow) {
          return self.clients.openWindow('/main');
        }
      })
      .catch(error => {
        console.error('Error handling notification click:', error);
      })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
