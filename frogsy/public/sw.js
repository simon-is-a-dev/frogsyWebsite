// Service Worker for handling notifications
self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked');
    event.notification.close();

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url.includes('/main') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise, open a new window
            if (self.clients.openWindow) {
                return self.clients.openWindow('/main');
            }
        })
    );
});

self.addEventListener('push', (event) => {
    console.log('Push notification received');

    const options = {
        body: event.data ? event.data.text() : 'Time to rate your pain!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'pain-reminder',
        requireInteraction: true,
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification('Time to Rate Your Pain! 🐸', options)
    );
});
