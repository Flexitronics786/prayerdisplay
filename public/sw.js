// Service Worker for Prayer Time Push Notifications

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body || 'Prayer time is approaching',
        icon: '/Logo 1.jpg',
        vibrate: [200, 100, 200],
        tag: data.tag || 'prayer-notification',
        renotify: true,
        data: {
            url: self.location.origin,
        },
    };

    event.waitUntil(
        self.registration.showNotification(data.title || '🕌 Prayer Time', options)
    );
});

// Open the app when notification is clicked
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            // Focus existing window or open new one
            for (const client of clients) {
                if (client.url === event.notification.data?.url && 'focus' in client) {
                    return client.focus();
                }
            }
            return self.clients.openWindow(event.notification.data?.url || '/');
        })
    );
});
