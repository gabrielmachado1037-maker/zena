import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const STORAGE_KEY = "nexvel_install_fechado";

export default function BannerInstalacao() {
  const { pathname } = useLocation();
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

  if (!mostrar || pathname === "/instalar") return null;

  return (
    <div
      className="install-banner fixed left-4 right-4 z-50 rounded-2xl p-4 shadow-2xl"
      style={{ bottom: "88px", background: "#111318", border: "1px solid #2A2F38" }}
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
          alt="Nexvel"
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-[14px] font-semibold">Instale o Nexvel</p>
          <p className="text-white/65 text-[12px] mt-0.5">
            Acesso rápido, com ícone próprio na tela de início.
          </p>
        </div>
        {isIOS ? (
          <Link
            to="/instalar"
            onClick={() => setMostrar(false)}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-[#7CFF5B] text-[#08130A] text-[13px] font-semibold"
          >
            Como instalar
          </Link>
        ) : (
          <button
            onClick={instalar}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-[#7CFF5B] text-[#08130A] text-[13px] font-semibold"
          >
            Instalar
          </button>
        )}
      </div>

      {!isIOS && (
        <Link to="/instalar" onClick={() => setMostrar(false)} className="mt-2.5 block text-[11px] font-medium text-[#7CFF5B]">
          Apareceu um aviso do Google? Veja o passo a passo →
        </Link>
      )}
    </div>
  );
}
