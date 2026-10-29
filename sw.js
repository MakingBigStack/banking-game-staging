/**
 * Offline play (BG-07). Registered as sw.js?v=<build time>, so every deploy installs a new worker with its own
 * cache: installing caches the page and every file of the build (precache.json, written by the Vite build);
 * pages come from the network first, so a new version shows while online, and from the cache when offline;
 * everything else comes from the cache first. Saves live in localStorage and are never touched here.
 */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const PREFIX = 'ketoan-taptu-';
const CACHE = `${PREFIX}${VERSION}`;
const PAGE = new URL('./', self.location.href).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch(`./precache.json?v=${encodeURIComponent(VERSION)}`, { cache: 'no-store' });
      const { files } = await response.json();
      const cache = await caches.open(CACHE);
      await cache.addAll([PAGE, ...files]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const old = (await caches.keys()).filter((key) => key.startsWith(PREFIX) && key !== CACHE);
      await Promise.all(old.map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(PAGE, { ignoreVary: true })) ?? Response.error()),
    );
    return;
  }
  // ignoreVary: servers often send Vary: Origin, and a module script asks with an Origin header the install did not
  event.respondWith(
    caches.match(request, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit ?? fetch(request)),
  );
});
