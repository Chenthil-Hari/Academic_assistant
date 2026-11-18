// Service Worker for Academic AI (Web Push & Notification Handling)

self.addEventListener("push", function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || "You have academic updates waiting.",
        icon: data.icon || "/icon.svg",
        badge: data.badge || "/icon.svg",
        data: data.data || { url: "/attendance" },
        vibrate: [100, 50, 100],
        actions: [
          { action: "checkin", title: "Mark Attendance" },
          { action: "dismiss", title: "Later" },
        ],
      };

      event.waitUntil(self.registration.showNotification(data.title || "Academic AI", options));
    } catch (e) {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification("Academic AI", {
          body: text,
          icon: "/icon.svg",
        })
      );
    }
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/attendance";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
