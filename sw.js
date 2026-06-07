const CACHE = 'asset-dashboard-v97';
const ASSETS = ['./index.html', './app.js', './style.css', './icon-192.svg', './icon-512.svg',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
    if (res.ok && e.request.url.startsWith(self.location.origin)) {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
    }
    return res;
  })));
});

// ===== 月末リマインダー =====
self.addEventListener('periodicsync', e => {
  if (e.tag === 'monthly-reminder') e.waitUntil(checkAndNotify());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./'));
});

async function checkAndNotify() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() !== lastDay) return;
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;
  await self.registration.showNotification('資産形成ダッシュボード 📊', {
    body: `${monthLabel}の資産を記録しましょう！`,
    icon: './icon-192.svg',
    badge: './icon-192.svg',
    tag: 'monthly-reminder',
    renotify: true,
    data: {url: './'}
  });
}
