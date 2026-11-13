// Affiche la notification reçue du serveur HubInvest.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() };
  }

  event.waitUntil(self.registration.showNotification(data.title || 'HubInvest', {
    body: data.body || '',
    icon: '/pwa-192.png',
    badge: '/badge-96.png',
    tag: data.tag,
    data: { url: data.url || '/' },
  }));
});

// Ouvre ou remet au premier plan la page liée à la notification.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => client.url === target) || windows.find((client) => new URL(client.url).origin === new URL(target).origin);
    if (existing) {
      if (existing.url !== target && 'navigate' in existing) await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  })());
});
