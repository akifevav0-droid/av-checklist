/* Офлайн-кэш чек-листа: приложение, библиотеки 3D и фото с сайтов. */
const VER = 'av-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js'
];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VER);
    await c.addAll(SHELL);
    await Promise.all(LIBS.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VER) await caches.delete(k);
    await self.clients.claim();
  })());
});
async function warm(urls) {
  const c = await caches.open(VER);
  for (const u of urls) {
    if (await c.match(u)) continue;
    try { const r = await fetch(u, { mode: 'no-cors', referrerPolicy: 'no-referrer' }); await c.put(u, r); } catch (e) {}
  }
}
self.addEventListener('message', e => { if (e.data && e.data.type === 'warm') e.waitUntil(warm(e.data.urls || [])); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(VER);
      try { const r = await fetch(req); if (r.ok) c.put('index.html', r.clone()); return r; }
      catch (err) { return (await c.match('index.html')) || (await c.match('./')); }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(VER);
    const hit = await c.match(req.url);
    if (hit) {
      if (url.origin === location.origin) e.waitUntil(fetch(req).then(r => r.ok && c.put(req.url, r)).catch(() => {}));
      return hit;
    }
    try {
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') c.put(req.url, r.clone());
      return r;
    } catch (err) {
      return new Response('', { status: 504 });
    }
  })());
});
