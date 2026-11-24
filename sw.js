const CACHE_NAME = "oway-calc-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Map tiles နှင့် routing API များကို cache မသိမ်းဘဲ network ရှိမှ ယူမည်
  if (
    url.hostname.includes("cartocdn.com") ||
    url.hostname.includes("openstreetmap.org") ||
    url.hostname.includes("project-osrm.org")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => new Response("", { status: 503, statusText: "Offline" }))
    );
    return;
  }

  // App ဖိုင်များနှင့် Leaflet library ကို Cache First, Network Fallback ဖြင့် ပြန်ပေးမည်
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== "opaque") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("", { status: 503, statusText: "Offline" });
        });
    })
  );
});