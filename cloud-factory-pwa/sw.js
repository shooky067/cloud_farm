"use strict";

const CACHE_PREFIX = "cloud-factory-pwa-";
const CACHE_NAME = CACHE_PREFIX + "v1";

self.addEventListener("install", function (event) {
  const scope = self.registration.scope;
  const shell = [
    scope,
    new URL("index.html", scope).href,
    new URL("manifest.webmanifest", scope).href,
    new URL("icons/icon-192.png", scope).href,
    new URL("icons/icon-512.png", scope).href,
    new URL("icons/icon-512-maskable.png", scope).href
  ];
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(shell); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) return caches.delete(key);
        return Promise.resolve(false);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);
  if (requestUrl.origin !== scopeUrl.origin || !requestUrl.href.startsWith(scopeUrl.href)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(async function () {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match(request) ||
          await cache.match(self.registration.scope) ||
          await cache.match(new URL("index.html", self.registration.scope).href) ||
          Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});
