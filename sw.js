const CACHE = 'studio-whatsapp-v2';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

const MOBILE_LAYOUT = `
<style id="mobile-layout-fix">
@media (max-width: 700px) {
  html, body { width: 100%; min-width: 0; overflow-x: hidden; }
  main {
    width: 100%;
    max-width: none;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    padding: 10px;
  }
  main > section, .preview-wrap, .controls, .field { min-width: 0; }
  main > section, .preview-wrap { width: 100%; }
  .preview-wrap { justify-content: center; }
  #stage {
    width: min(100%, 38vh);
    max-width: 100%;
    flex: none;
  }
  .controls { grid-template-columns: minmax(0, 1fr); }
  .field.full { grid-column: 1; }
  .panel { min-width: 0; padding: 12px; }
  .tabs { max-width: 100%; overflow-x: auto; }
  .actions { flex-direction: column; }
  .actions button { width: 100%; min-width: 0; }
  input, select, textarea, button { max-width: 100%; }
}
</style>`;

async function addMobileLayout(response) {
  const html = await response.text();
  if (html.includes('id="mobile-layout-fix"')) return new Response(html, response);
  const updatedHtml = html.replace('</head>', `${MOBILE_LAYOUT}\n</head>`);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(updatedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const isPage = request.mode === 'navigate' || new URL(request.url).pathname.endsWith('/index.html');
    try {
      const response = await fetch(request);
      if (!response.ok) return response;
      const result = isPage ? await addMobileLayout(response) : response;
      const cache = await caches.open(CACHE);
      await cache.put(request, result.clone());
      return result;
    } catch (error) {
      const cached = await caches.match(request) || (isPage ? await caches.match('./index.html') : null);
      if (!cached) return Response.error();
      return isPage ? addMobileLayout(cached) : cached;
    }
  })());
});
