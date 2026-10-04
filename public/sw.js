// public/sw.js
// Service worker minimale: gestisce solo le notifiche push.
// Usando lo stesso "tag" per lo stesso volo, ogni nuova push
// sostituisce quella precedente invece di accumularsi.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, tag, url, icon } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,               // stesso tag = sostituisce la notifica precedente
      renotify: true,    // fa comunque vibrare/suonare anche se sostituisce
      icon: icon || "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
