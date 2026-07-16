import './instrument'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

// Após um deploy, a "casca" em cache pode apontar para chunks de rota cujo nome
// (com hash) já mudou. Quando um import dinâmico falha, o Vite dispara
// 'vite:preloadError' — aqui recarregamos 1x para pegar a versão nova, em vez de
// mostrar tela quebrada. O carimbo de tempo evita loop se o erro persistir.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'nx-chunk-reload-at'
  const last = Number(sessionStorage.getItem(KEY) || 0)
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(KEY, String(Date.now()))
    window.location.reload()
  }
})

function ErroFatal() {
  return (
    <div
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: '#09090B', color: '#E5E7EB', padding: 24, textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 18, fontWeight: 700 }}>Algo deu errado</p>
      <p style={{ fontSize: 14, color: '#9CA3AF', maxWidth: 320 }}>
        Tivemos um problema inesperado. Recarregue a página para continuar.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 4, padding: '10px 20px', borderRadius: 12,
          background: '#7CFF5B', color: '#08130A', fontWeight: 600, border: 'none', cursor: 'pointer',
        }}
      >
        Recarregar
      </button>
    </div>
  )
}

if ('serviceWorker' in navigator) {
  // Havia um SW controlando a página quando ela carregou? Se sim, um
  // controllerchange futuro significa "versão nova assumiu" → recarrega.
  // No primeiro acesso (sem controller) não recarregamos: a página já está fresca.
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !hadController) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      // Se já existe um SW novo esperando, manda ativar agora.
      if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');

      // Quando uma versão nova terminar de instalar com um SW antigo no controle,
      // ativa imediatamente (dispara controllerchange → reload acima).
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage('SKIP_WAITING');
          }
        });
      });

      // Força a checagem de nova versão: ao carregar, ao voltar pra aba e a cada 60s.
      const checkForUpdate = () => reg.update().catch(() => {});
      checkForUpdate();
      setInterval(checkForUpdate, 60_000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
    } catch {
      /* registro do SW falhou — segue sem PWA */
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErroFatal />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
