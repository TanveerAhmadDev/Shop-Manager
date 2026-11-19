const CACHE_NAME = "furniture-manager-static-v6";
const OFFLINE_PAGE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Cache only the common offline screen.
      await cache.add(OFFLINE_PAGE);

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      // Remove previous Furniture Manager cache versions.
      await Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith("furniture-manager-") && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Handle only requests from this application.
  if (url.origin !== self.location.origin) return;

  // Never cache API requests.
  if (url.pathname.startsWith("/api/")) return;

  // Handle every page navigation.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Always try the actual page first.
          return await fetch(request);
        } catch {
          // If internet is unavailable, show one common page.
          const cache = await caches.open(CACHE_NAME);

          return (
            (await cache.match(OFFLINE_PAGE)) ||
            new Response("Internet connection unavailable.", {
              status: 503,
              headers: {
                "Content-Type": "text/plain",
              },
            })
          );
        }
      })(),
    );

    return;
  }

  // Cache only static resources.
  const isStaticResource =
    url.pathname.startsWith("/_next/static/") ||
    /\.(js|css|svg|png|jpg|jpeg|webp|ico|woff2)$/i.test(url.pathname);

  if (!isStaticResource) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request);

        if (response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch {
        return (
          (await cache.match(request)) ||
          new Response("Resource unavailable.", {
            status: 503,
          })
        );
      }
    })(),
  );
});
