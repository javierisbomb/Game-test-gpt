const CACHE = 'friendpick-v1';
const ASSETS = [
  './','./index.html','./styles.css','./app.js','./manifest.json',
  './data/categories.json',
  './icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(c=> c || fetch(e.request).then(r=>{
      const copy = r.clone();
      caches.open(CACHE).then(cache=> cache.put(e.request, copy));
      return r;
    }).catch(()=>c))
  );
});