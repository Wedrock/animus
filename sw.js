const CACHE = 'animus-v11';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'sync.js', 'firebase-config.js', 'manifest.json', 'icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Rede primeiro (para pegar atualizações), cache se estiver offline.
// Só cuida dos arquivos do app e das bibliotecas do Firebase; a conexão com o
// banco de dados (firestore.googleapis.com) passa direto.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const { origin, host } = new URL(e.request.url);
  if (origin !== self.location.origin && host !== 'www.gstatic.com') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Tocar na notificação abre (ou traz para frente) o app.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c);
      return open ? open.focus() : self.clients.openWindow('./');
    })
  );
});
