// Түшиг — Постын туслах / Service Worker
// キャッシュ名。ツールを更新したら、この番号を上げると新しい内容が反映されます。
const CACHE_NAME = 'tushig-postyn-tuslakh-v1';

// オフラインでも開けるようにキャッシュしておくファイル
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// インストール時：必要なファイルをキャッシュに保存
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

// 有効化時：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// 取得時：ネットワーク優先、失敗したらキャッシュから返す
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET以外（送信など）は素通し
  if (req.method !== 'GET') return;

  // 外部ドメイン（Google Analyticsなど）は素通し
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // 成功したらキャッシュを更新しておく
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
