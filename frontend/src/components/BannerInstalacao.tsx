import { useEffect, useState } from "react";

const STORAGE_KEY = "clinne_install_fechado";

export default function BannerInstalacao() {
  const [mostrar, setMostrar] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    if (standalone) return;

    if (localStorage.getItem(STORAGE_KEY)) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      setMostrar(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMostrar(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const instalar = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setMostrar(false);
  };

  const fechar = () => {
    setMostrar(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  if (!mostrar) return null;

  return (
    <div
      className="install-banner fixed left-4 right-4 z-50 rounded-2xl p-4 shadow-2xl"
      style={{ bottom: "88px", background: "#1C4A2E" }}
    >
      <button
        onClick={fechar}
        className="absolute top-2 right-3 text-white/50 text-lg leading-none"
        aria-label="Fechar"
      >
        ✕
      </button>

      <div className="flex items-center gap-3">
        <img
          src="/icons/icon-192.png"
          width={40}
          height={40}
          className="rounded-xl flex-shrink-0"
          alt="Clinne"
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-[14px] font-semibold">Instale o Clinne</p>
          <p className="text-white/65 text-[12px] mt-0.5">
            {isIOS
              ? "Toque em Compartilhar → Adicionar à Tela de Início"
              : "Acesso rápido sem abrir o navegador"}
          </p>
        </div>
        {!isIOS && (
          <button
            onClick={instalar}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-white text-[#1C4A2E] text-[13px] font-semibold"
          >
            Instalar
          </button>
        )}
      </div>

      {isIOS && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-white/75 text-[11px]">
          <span>1. Toque em</span>
          <span className="px-2 py-0.5 rounded bg-white/20 font-medium">⬆️ Compartilhar</span>
          <span>2. "Adicionar à Tela de Início"</span>
        </div>
      )}
    </div>
  );
}
