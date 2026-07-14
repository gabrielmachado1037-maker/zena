const CACHE = 'nexvel-v7';
const STATIC = ['/', '/index.html', '/onboarding', '/app/dashboard'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

// Permite que a página peça a ativação imediata da nova versão (auto-update).
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});

// ── Push notifications ────────────────────────────────────────────────────────

// Mapa de deep-links — ESPELHO de backend/src/lib/deepLink.ts. Mantê-los em sincronia.
function resolveDeepLink(destination, id) {
  switch (destination) {
    // paciente
    case 'conversation_paciente': return '/paciente/mensagens';
    case 'registro':              return id ? '/paciente/registro?foco=' + id : '/paciente/registro';
    case 'challenge':             return id ? '/paciente/desafios?d=' + id : '/paciente/desafios';
    case 'report':                return id ? '/paciente/relatorio/' + id : '/paciente/evolucao';
    case 'ligas':                 return '/paciente/ligas';
    case 'ranking':               return '/paciente/ranking';
    case 'dashboard_paciente':    return '/paciente/dashboard';
    case 'feed_paciente':         return '/paciente/feed';
    case 'evolucao_paciente':     return '/paciente/evolucao';
    case 'conta_paciente':        return '/paciente/conta';
    // nutricionista
    case 'conversation_nutri':    return id ? '/app/mensagens/' + id : '/app/mensagens';
    case 'patient':               return id ? '/app/pacientes/' + id : '/app/pacientes';
    case 'app_ranking':           return '/app/ranking';
    case 'app_feed':              return '/app/feed';
    default:                      return null;
  }
}

// Preserva o parâmetro de rastreio ?n=<logId> (vindo do url do backend) na rota resolvida.
function comRastreio(rota, urlOriginal) {
  try {
    const m = /[?&]n=([^&]+)/.exec(urlOriginal || '');
    if (!m) return rota;
    return rota + (rota.includes('?') ? '&' : '?') + 'n=' + m[1];
  } catch { return rota; }
}

// Resolve o destino final: prioriza destination+id, cai no url, e por fim no dashboard.
function alvoDaNotificacao(data) {
  const d = data || {};
  const resolvido = d.destination ? resolveDeepLink(d.destination, d.id) : null;
  if (resolvido) return comRastreio(resolvido, d.url);
  return d.url || '/app/dashboard';
}

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Nexvel', {
      body:  data.body  || '',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data:  { url: data.url || '/app/dashboard', destination: data.destination || null, id: data.id || null },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = alvoDaNotificacao(e.notification.data);
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(all => {
      for (const client of all) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
