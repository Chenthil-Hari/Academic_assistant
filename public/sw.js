// Service Worker for Academic AI (PWA Offline Caching + Web Push & Notification Handling)

const CACHE_NAME = "academic-ai-v2";
const STATIC_ASSETS = [
  "/manifest.json",
  "/icon.svg"
];

// Install Event - Pre-cache essential static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Service Worker pre-caching non-fatal warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale-while-revalidate for static assets, network-first for API
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests, non-http URLs, or page navigations (prevents Chrome net::ERR_FAILED on cached redirects)
  if (
    event.request.method !== "GET" ||
    !url.protocol.startsWith("http") ||
    event.request.mode === "navigate"
  ) {
    return;
  }

  // Network-first for API routes
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: "Offline mode active" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      })
    );
    return;
  }

  // Cache-first / Stale-while-revalidate for static files & page navigation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Notifications Handling
self.addEventListener("push", function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || "You have academic updates waiting.",
        icon: data.icon || "/icon.svg",
        badge: data.badge || "/icon.svg",
        data: data.data || { url: "/dashboard" },
        vibrate: [100, 50, 100],
        actions: [
          { action: "open", title: "Open App" },
          { action: "dismiss", title: "Dismiss" },
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

// Notification Click Handling
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/dashboard";

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
