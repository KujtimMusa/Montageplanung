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
  var url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        var urlObj;
        try {
          urlObj = new URL(url, self.location.origin);
        } catch (e) {
          if (clients.openWindow) return clients.openWindow(url);
          return undefined;
        }
        var targetPath = urlObj.pathname + urlObj.search + urlObj.hash;

        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          try {
            var cu = new URL(client.url);
            if (
              cu.origin === urlObj.origin &&
              cu.pathname + cu.search + cu.hash === targetPath &&
              "focus" in client
            ) {
              return client.focus();
            }
          } catch (e2) {
            /* continue */
          }
        }

        for (var j = 0; j < clientList.length; j++) {
          var cl = clientList[j];
          if ("navigate" in cl && typeof cl.navigate === "function") {
            return cl
              .navigate(url)
              .then(function (nc) {
                if (nc && "focus" in nc) return nc.focus();
                if ("focus" in cl) return cl.focus();
              })
              .catch(function () {
                if (clients.openWindow) return clients.openWindow(url);
              });
          }
        }

        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
