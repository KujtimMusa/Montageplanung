/* global self, clients */
self.addEventListener("push", function (event) {
  if (!event.data) return;
  var payload = { title: "Vlerafy", body: "", url: "/", icon: "/icons/icon-192.png" };
  try {
    payload = Object.assign(payload, event.data.json());
  } catch (e) {
    try {
      payload.body = event.data.text();
    } catch (e2) {
      return;
    }
  }
  var title = payload.title || "Vlerafy";
  var body = payload.body || "";
  var url = payload.url || "/";
  var icon = payload.icon || "/icons/icon-192.png";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      badge: "/icons/icon-192.png",
      data: { url: url },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url;
  if (!url) return;
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if ("focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
