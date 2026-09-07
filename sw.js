// Service worker : cache "reseau d'abord, cache en secours" pour que l'app marche hors-ligne.
// CACHE porte un numero de version : le changer suffit a purger l'ancien cache chez tout le monde
// (activate supprime tous les caches dont le nom differe). A incrementer a chaque mise en ligne
// qui change le code, sinon un appareil deja installe peut continuer a servir d'anciens fichiers.
const CACHE = 'evolve4-v0.2.0';
const CORE = ['./', './index.html', './style.css', './manifest.json', './app/main.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    // cache: 'no-cache' force la revalidation aupres du serveur (reponse 304 si rien n'a change) :
    // sans ca, le cache HTTP du navigateur peut resservir un ancien module sans jamais demander.
    fetch(e.request, { cache: 'no-cache' })
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
