import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Share, Plus, MoreVertical, CheckCircle2, Copy, Check, Download,
  Smartphone, ShieldCheck, ExternalLink, Info,
} from "lucide-react";
import { NexvelLogo } from "./onboarding/components/NexvelLogo";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { getPlataforma, isStandalone, isInAppBrowser } from "../lib/pwaInstall";

/**
 * Guia de instalação inteligente do app Nexvel (PWA). Detecta a situação e mostra
 * o passo a passo certo: Android (1 toque + aviso Play Protect), iOS Safari
 * (Compartilhar → Adicionar à Tela de Início), navegador embutido (abra no
 * Safari/Chrome) e desktop. Página pública — a nutri pode mandar o link.
 */
export default function Instalar() {
  const navigate = useNavigate();
  const { install, isInstallable } = usePWAInstall();
  const [instalado] = useState(isStandalone());
  const plataforma = getPlataforma();
  const inApp = isInAppBrowser();
  const [copiado, setCopiado] = useState(false);

  const url = typeof window !== "undefined" ? window.location.origin : "https://nexvel.tech";
  const navBrowser = plataforma === "ios" ? "Safari" : "Chrome";

  async function copiarLink() {
    try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } catch { /* indisponível */ }
  }

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-black">
      <div className="relative flex w-full max-w-[440px] flex-col bg-[#0A0A0A] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className="flex items-center py-2">
          <button type="button" onClick={() => navigate(-1)} aria-label="Voltar"
            className="grid size-10 place-items-center rounded-full text-[#A1A1AA] transition-colors hover:bg-white/5 hover:text-white active:scale-95">
            <ArrowLeft className="size-5" />
          </button>
        </header>

        <div className="mt-6">
          <NexvelLogo className="h-[26px]" />
          <h1 className="mt-7 text-[28px] font-extrabold leading-tight tracking-tight text-white">
            Deixe o Nexvel na sua <span className="text-nx-evo">tela de início.</span>
          </h1>
          <p className="mt-2 text-body-md text-[#A1A1AA]">
            Fica com ícone próprio e abre com 1 toque — como um app normal.
          </p>

          <div className="mt-8">
            {instalado ? (
              <Sucesso onAbrir={() => navigate("/")} />
            ) : inApp ? (
              <AbraNoNavegador navBrowser={navBrowser} plataforma={plataforma} onCopiar={copiarLink} copiado={copiado} url={url} />
            ) : plataforma === "ios" ? (
              <GuiaIOS />
            ) : plataforma === "android" ? (
              <GuiaAndroid isInstallable={isInstallable} onInstalar={install} />
            ) : (
              <GuiaDesktop onCopiar={copiarLink} copiado={copiado} url={url} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── blocos ───────── */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-[#111318] p-5">{children}</div>;
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-nx-evo/15 text-body-sm font-extrabold text-nx-evo">{n}</span>
      <span className="pt-0.5 text-body-md leading-relaxed text-[#D4D4D8]">{children}</span>
    </li>
  );
}

function Sucesso({ onAbrir }: { onAbrir: () => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-full bg-nx-evo/12 text-nx-evo"><CheckCircle2 className="size-7" /></span>
        <p className="mt-4 text-body-lg font-bold text-white">App já instalado 🎉</p>
        <p className="mt-1 text-body-sm text-[#A1A1AA]">Você já pode abrir o Nexvel pelo ícone na sua tela de início.</p>
        <button onClick={onAbrir} className="mt-6 w-full rounded-2xl bg-nx-evo py-3.5 text-body-md font-bold text-nx-on-evo transition-colors hover:bg-nx-evo-2">
          Abrir o app
        </button>
      </div>
    </Card>
  );
}

function AbraNoNavegador({ navBrowser, plataforma, onCopiar, copiado, url }: {
  navBrowser: string; plataforma: string; onCopiar: () => void; copiado: boolean; url: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-lg bg-nx-evo/10"><ExternalLink className="size-5 text-nx-evo" /></span>
        <h2 className="text-body-lg font-bold text-white">Abra no {navBrowser} primeiro</h2>
      </div>
      <p className="mt-3 text-body-sm leading-relaxed text-[#A1A1AA]">
        Você abriu por um link dentro de outro app (WhatsApp, Instagram…). Para instalar, é preciso abrir no navegador do celular.
      </p>
      <ul className="mt-5 space-y-3.5">
        {plataforma === "ios" ? (
          <>
            <Passo n={1}>Toque no menu <span className="font-semibold text-white">•••</span> (ou <span className="font-semibold text-white">aA</span>) no canto da tela.</Passo>
            <Passo n={2}>Escolha <span className="font-semibold text-white">"Abrir no Safari"</span>.</Passo>
            <Passo n={3}>Depois é só seguir o passo a passo que aparece.</Passo>
          </>
        ) : (
          <>
            <Passo n={1}>Toque no menu <MoreVertical className="inline size-4 -mt-0.5 text-white" /> no canto da tela.</Passo>
            <Passo n={2}>Escolha <span className="font-semibold text-white">"Abrir no Chrome"</span> (ou no navegador).</Passo>
            <Passo n={3}>Depois é só seguir o passo a passo que aparece.</Passo>
          </>
        )}
      </ul>
      <button onClick={onCopiar} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-nx-border py-3 text-body-sm font-semibold text-white transition-colors hover:bg-white/[0.04]">
        {copiado ? <><Check className="size-4 text-nx-evo" /> Link copiado</> : <><Copy className="size-4" /> Copiar o link ({new URL(url).host})</>}
      </button>
    </Card>
  );
}

function GuiaIOS() {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-nx-evo/10"><Smartphone className="size-5 text-nx-evo" /></span>
          <h2 className="text-body-lg font-bold text-white">No iPhone</h2>
        </div>
        <p className="mt-2 text-body-sm text-[#8b8b93]">Funciona no Safari e no Chrome — os passos são os mesmos.</p>
        <ul className="mt-4 space-y-4">
          <Passo n={1}>
            Toque no ícone <span className="mx-1 inline-flex size-7 -translate-y-0.5 items-center justify-center rounded-md bg-nx-water/15 align-middle"><Share className="size-4 text-nx-water" /></span> <span className="font-semibold text-white">Compartilhar</span>. No <span className="font-semibold text-white">Safari</span> ele fica na barra de baixo (se não achar, toque em <span className="font-semibold text-white">•••</span>); no <span className="font-semibold text-white">Chrome</span>, no canto de cima.
          </Passo>
          <Passo n={2}>
            Na janela que abrir, <span className="font-semibold text-white">role para baixo</span> (ou toque em <span className="font-semibold text-white">"Ver mais"</span>) até achar <span className="inline-flex items-center gap-1 font-semibold text-white"><Plus className="size-4" /> Adicionar à Tela de Início</span>.
          </Passo>
          <Passo n={3}>Toque em <span className="font-semibold text-white">Adicionar</span> no canto superior.</Passo>
        </ul>
      </Card>
      <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
        <Info className="mt-0.5 size-4 shrink-0 text-[#8b8b93]" />
        <p className="text-body-sm leading-relaxed text-[#A1A1AA]">
          No iPhone, o mais tranquilo é pelo <span className="font-semibold text-white">Safari</span>. Se abriu por um link do WhatsApp, toque em <span className="font-semibold text-white">•••</span> → <span className="font-semibold text-white">"Abrir no Safari"</span> primeiro.
        </p>
      </div>
    </div>
  );
}

function GuiaAndroid({ isInstallable, onInstalar }: { isInstallable: boolean; onInstalar: () => void }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-nx-evo/10"><Download className="size-5 text-nx-evo" /></span>
          <h2 className="text-body-lg font-bold text-white">No Android (Chrome)</h2>
        </div>
        {isInstallable ? (
          <>
            <p className="mt-3 text-body-sm text-[#A1A1AA]">É só um toque:</p>
            <button onClick={onInstalar} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-nx-evo py-3.5 text-body-md font-bold text-nx-on-evo transition-colors hover:bg-nx-evo-2">
              <Download className="size-5" /> Instalar aplicativo
            </button>
          </>
        ) : (
          <ul className="mt-5 space-y-4">
            <Passo n={1}>Toque no menu <MoreVertical className="inline size-4 -mt-0.5 text-white" /> no canto superior do Chrome.</Passo>
            <Passo n={2}>Toque em <span className="font-semibold text-white">"Instalar app"</span> (ou "Adicionar à tela inicial").</Passo>
            <Passo n={3}>Confirme em <span className="font-semibold text-white">Instalar</span>.</Passo>
          </ul>
        )}
      </Card>
      {/* aviso Play Protect — tranquiliza a pessoa pra não desistir */}
      <div className="flex items-start gap-2.5 rounded-xl border border-nx-evo/20 bg-nx-evo/[0.05] p-3.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-nx-evo" />
        <p className="text-body-sm leading-relaxed text-[#A1A1AA]">
          Se o Android mostrar um aviso do Google (<span className="text-white">"app de risco"</span> ou "versão mais antiga"), <span className="font-semibold text-white">é normal</span> em apps instalados assim. Toque em <span className="font-semibold text-white">"Mais detalhes"</span> → <span className="font-semibold text-white">"Instalar assim mesmo"</span>. O Nexvel é seguro e segue a LGPD.
        </p>
      </div>
    </div>
  );
}

function GuiaDesktop({ onCopiar, copiado, url }: { onCopiar: () => void; copiado: boolean; url: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-lg bg-nx-evo/10"><Smartphone className="size-5 text-nx-evo" /></span>
        <h2 className="text-body-lg font-bold text-white">Melhor no celular</h2>
      </div>
      <p className="mt-3 text-body-sm leading-relaxed text-[#A1A1AA]">
        O app do paciente é feito pro celular. Abra <span className="font-semibold text-white">{new URL(url).host}</span> no navegador do seu telefone (Safari no iPhone, Chrome no Android) para instalar.
      </p>
      <p className="mt-3 text-body-sm leading-relaxed text-[#A1A1AA]">
        No computador, você também pode instalar pelo ícone <span className="font-semibold text-white">Instalar</span> que aparece na barra de endereço do Chrome.
      </p>
      <button onClick={onCopiar} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-nx-border py-3 text-body-sm font-semibold text-white transition-colors hover:bg-white/[0.04]">
        {copiado ? <><Check className="size-4 text-nx-evo" /> Link copiado</> : <><Copy className="size-4" /> Copiar o link</>}
      </button>
    </Card>
  );
}
