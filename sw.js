const CACHE = 'studio-whatsapp-v4';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

// Keep the poster preview compact while allowing the editor section to scroll.
const MOBILE_LAYOUT = `
<style id="mobile-layout-fix">
@media (max-width: 700px) {
  html, body {
    width: 100%;
    height: 100%;
    min-height: 0;
    margin: 0;
    overflow: hidden;
  }
  body {
    height: 100dvh;
    display: flex;
    flex-direction: column;
  }
  header {
    position: relative;
    top: auto;
    flex: 0 0 auto;
    padding: 10px 12px;
  }
  header h1 { font-size: 17px; }
  header p { font-size: 11px; }
  main {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: min(38dvh, 340px) minmax(0, 1fr);
    flex: 1 1 auto;
    gap: 8px;
    width: 100%;
    max-width: none;
    height: auto;
    min-height: 0;
    margin: 0;
    padding: 8px;
    overflow: hidden;
  }
  main > section,
  .preview-wrap,
  .controls,
  .field { min-width: 0; }
  main > section { width: 100%; min-height: 0; }
  .preview-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  #stage {
    width: min(100%, 38dvh, 340px);
    max-width: 100%;
    max-height: 100%;
    flex: 0 1 auto;
  }
  main > section:nth-of-type(2) {
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .panel { width: 100%; min-width: 0; padding: 12px; }
  .controls { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .field.full { grid-column: 1; }
  .tabs { max-width: 100%; overflow-x: auto; }
  .actions { flex-direction: column; }
  .actions button { width: 100%; min-width: 0; }
  input, select, textarea, button { max-width: 100%; }
  input[type=file] { min-width: 0; }
}
</style>`;

async function addMobileLayout(response) {
  const html = await response.text();
  if (html.includes('id="mobile-layout-fix"')) return new Response(html);
  const updatedHtml = html.replace('</head>', `${MOBILE_LAYOUT}\n</head>`);
  return new Response(updatedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
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
