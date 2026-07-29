// Service Worker — Minhas Plantas
// Faz cache apenas do "app shell" (arquivos estáticos locais) para permitir
// instalação e abertura offline. Chamadas ao Firebase/Firestore e recursos
// externos (fontes, CDN) NÃO são interceptadas — seguem direto pra rede,
// já que os dados das plantas dependem de sincronização online.

const CACHE_NAME = 'minhas-plantas-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só intercepta GET de mesma origem (o app shell). Tudo mais (Firebase,
  // fontes do Google, CDN do xlsx) segue direto para a rede.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached); // offline: cai pro cache

      // Estratégia "stale-while-revalidate": responde rápido do cache
      // se existir, e atualiza o cache em segundo plano.
      return cached || network;
    })
  );
});
