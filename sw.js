/* 個人記帳 PWA — Service Worker
   放在與 ledger.html(或你的入口 index.html)相同目錄。
   作用:離線快取 app 外殼(start_url),讓加入主畫面後可完全離線開啟。
   資料(IndexedDB)本來就離線可用,這支只負責讓「頁面本身」離線也載得起來。 */
const CACHE = 'ledger-v3';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.add('./'); })
      .catch(function () { /* 首次離線前若無法預抓,交給 fetch 時再補快取 */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== CACHE; })
                          .map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async function () {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      // 'cors' 涵蓋跨網域 CDN 函式庫(GIS、JSZip 等),讓它們首次上線載入後也能離線複用
      if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default' || res.type === 'cors')) {
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      if (req.mode === 'navigate') {
        const fb = await caches.match('./');
        if (fb) return fb;
      }
      throw err;
    }
  })());
});
