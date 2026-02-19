const CACHE_VERSION = "v1";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/manifest.json",
  "/instagram_icon.svg",
  "/tiktok_icon.svg",
  "/facebook_icon.svg",
  "/x_icon.svg",
  "/whatsapp_icon.svg",
  "/onlyfans_icon.svg",
  "/icons/qrcode_icon.svg",
  "/icons/youtube_icon.svg",
  "/icons/amazon_icon.svg",
  "/icons/strava_icon.svg",
  "/icons/snapchat_icon.svg",
  "/icons/spotify_icon.svg",
  "/icons/linkedin_icon.svg",
  "/icons/pinterest_icon.svg",
  "/icons/telegram_icon.svg",
  "/icons/app-icon-192.png",
  "/icons/app-icon-512.png",
];

/* ---------- Install ---------- */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

/* ---------- Activate ---------- */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ---------- Fetch strategies ---------- */

// Stale-while-revalidate for API config
function handleApiRequest(event) {
  event.respondWith(
    caches.open(API_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request)
        .then((res) => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
}

// Cache-first for images
function handleImageRequest(event) {
  event.respondWith(
    caches.open(IMAGE_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      } catch {
        return new Response("", { status: 404, statusText: "Offline" });
      }
    })
  );
}

// Network-first for navigation (HTML pages)
function handleNavigationRequest(event) {
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("/"))
      )
  );
}

// Cache-first for static assets
function handleStaticRequest(event) {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return res;
      });
    })
  );
}

/* ---------- Fetch router ---------- */

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") return;

  // API config → stale-while-revalidate
  if (url.pathname === "/api/admin/config" && url.searchParams.has("username")) {
    return handleApiRequest(event);
  }

  // Images from Firebase Storage, user-uploads, or proxy
  if (
    url.pathname.startsWith("/user-uploads/") ||
    url.pathname.startsWith("/profile-pictures/") ||
    url.pathname.startsWith("/api/proxy-image") ||
    url.hostname.includes("firebasestorage.googleapis.com") ||
    url.hostname.includes("storage.googleapis.com")
  ) {
    return handleImageRequest(event);
  }

  // Next.js static assets
  if (url.pathname.startsWith("/_next/static/")) {
    return handleStaticRequest(event);
  }

  // SVG/PNG icons in public/
  if (url.pathname.endsWith(".svg") || url.pathname.endsWith(".png")) {
    return handleStaticRequest(event);
  }

  // Google Fonts
  if (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com")
  ) {
    return handleStaticRequest(event);
  }

  // Navigation requests (HTML pages)
  if (event.request.mode === "navigate") {
    return handleNavigationRequest(event);
  }
});
