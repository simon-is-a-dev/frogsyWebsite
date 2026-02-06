self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  const options = {
    body: data.body ?? 'Time to log your pain 🐸',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'pain-reminder',
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title ?? 'Frogsy Reminder',
      options
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) return client.focus();
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/main');
        }
      })
  );
});
