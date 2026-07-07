import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
    <App />
  </StrictMode>,
)
