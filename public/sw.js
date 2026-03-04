// Genesis Pipeline — Service Worker
// Network-first strategy, offline fallback for navigation requests

const CACHE_NAME = "genesis-v1";
const OFFLINE_URL = "/offline.html";

// Install: cache offline fallback + icons
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([OFFLINE_URL, "/icon-192.png", "/icon-512.png"])
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first, serve cached offline.html for failed navigation
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});

// Push notification handler (wired in M4E)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    event.waitUntil(
      self.registration.showNotification(payload.title || "Genesis Pipeline", {
        body: payload.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: payload.url || "/m/" },
      })
    );
  } catch (e) {
    // Ignore malformed push payloads
  }
});

// Notification click: open or focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/m/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
