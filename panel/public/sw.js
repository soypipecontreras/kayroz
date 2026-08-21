// Service worker de Kayroz — hace que la PWA instalada se sienta app:
// arranque instantáneo de los assets estáticos y una pantalla offline digna
// en vez del dinosaurio del navegador.
//
// Qué NO hace, a propósito: nunca cachea datos de Supabase ni URLs firmadas
// (expiran a la hora) ni ninguna respuesta de páginas dinámicas — el panel es
// server-rendered y una página cacheada mostraría datos viejos de otro user
// agent. Solo assets estáticos inmutables y el fallback de navegación.

const VERSION = "kayroz-v1";
const OFFLINE_URL = "/offline";

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.json",
  "/brand/kayroz-mark.png",
  "/brand/kayroz-wordmark.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Cache-first solo para lo verdaderamente estático. /_next/static lleva hash
// de contenido en la ruta, así que servirlo del caché nunca puede quedar viejo.
function esEstatico(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Red primero: el contenido siempre fresco. El caché solo entra cuando
    // no hay red, y entonces se muestra /offline.
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r ?? Response.error())),
    );
    return;
  }

  if (esEstatico(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copia = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copia));
            }
            return response;
          }),
      ),
    );
  }
});
