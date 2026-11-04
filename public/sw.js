// Service worker do aluno: o treino abre mesmo sem internet.
// - /_next/static/* (arquivos com hash): cache primeiro, para sempre.
// - Página /treino: rede primeiro (máx. 4 s); sem rede, a última cópia guardada.
// - "/" sem rede: abre o treino guardado (o app instalado começa em "/").
// - Telas do professor e o login nunca são guardados. O "Sair" do aluno apaga a cópia.
const V = 'v1';
const PAGES = `treino-pages-${V}`;
const STATIC = `treino-static-${V}`;
const MAX_STATIC = 250;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== PAGES && k !== STATIC) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('message', e => {
  if (e.data === 'clear-pages') e.waitUntil(caches.delete(PAGES));
});

async function trim(cache) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_STATIC))) await cache.delete(k);
}

const timeout = ms => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

const OFFLINE = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sem internet</title><style>
body{margin:0;min-height:100svh;display:grid;place-items:center;background:#111214;color:#f5f6f8;font:16px/1.5 system-ui,sans-serif;padding:24px}
main{max-width:360px;text-align:center}h1{font-size:1.5rem;margin:0 0 8px}p{color:#a4a6b0;margin:0 0 24px}
button{width:100%;height:56px;border:0;border-radius:999px;background:#2f6bff;color:#fff;font:inherit;font-weight:700;cursor:pointer}
</style></head><body><main><h1>Sem internet</h1><p>Conecte-se uma vez para baixar o seu treino. Depois ele abre mesmo sem sinal.</p>
<button onclick="location.reload()">Tentar de novo</button></main></body></html>`;

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // arquivos do app: o nome muda a cada versão, então o cache nunca fica velho
  if (url.pathname.startsWith('/_next/static/') || url.pathname === '/icon.svg') {
    e.respondWith((async () => {
      const cache = await caches.open(STATIC);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { await cache.put(req, res.clone()); trim(cache); }
      return res;
    })());
    return;
  }

  // abrir o app: só a página do treino e a entrada "/"
  if (req.mode === 'navigate' && (url.pathname === '/treino' || url.pathname === '/')) {
    e.respondWith((async () => {
      try {
        const res = await Promise.race([fetch(req), timeout(4000)]);
        // só guarda o treino de verdade (aluno logado), nunca um redirecionamento para o login
        if (url.pathname === '/treino' && res.ok && res.type === 'basic' && !res.redirected) {
          await (await caches.open(PAGES)).put('/treino', res.clone());
        }
        return res;
      } catch {
        const hit = await caches.match('/treino', { cacheName: PAGES });
        return hit ?? new Response(OFFLINE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
      }
    })());
  }
});
