import { useEffect, useRef, useState } from "react";
import {
  Bell, UserCircle2, Pencil, BadgeCheck, MapPin, Camera, X, Loader2,
  IdCard, Lock, ShieldCheck, ChevronRight, Eye, EyeOff, LifeBuoy,
  FileText, ShieldQuestion, Activity, MessageCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import Avatar from "../components/Avatar";

/* GET /api/auth/me */
interface Me {
  id: string; nome: string; email: string; crn: string;
  nomeConsultorio?: string | null; enderecoConsultorio?: string | null;
}

const SUPORTE_EMAIL = "suporte@nexvel.com.br";

/* superfície sólida (glassmorphism fora — ban do DESIGN.md) */
const GLASS = "bg-nx-surface border border-nx-border rounded-nx-lg";

export default function Perfil() {
  const { nutricionista, updateAvatar, updateNutricionista } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [fotoLoading, setFotoLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function carregar() {
    setLoading(true); setError(null);
    api.get<Me>("/auth/me")
      .then((r) => setMe(r.data))
      .catch((e) => setError(e?.response?.data?.error ?? "Não foi possível carregar o perfil"))
      .finally(() => setLoading(false));
  }
  useEffect(carregar, []);

  function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { data } = await api.put<{ foto: string }>("/auth/perfil/foto", { fotoBase64: reader.result });
        updateAvatar(data.foto);
      } catch { /* ignora */ } finally { setFotoLoading(false); }
    };
    reader.readAsDataURL(file);
  }

  const nome = me?.nome ?? nutricionista?.nome ?? "";
  const subtitulo = me?.nomeConsultorio?.trim() || "Nutricionista";

  return (
    <div className="flex min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-0">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-5 md:px-8 h-16 border-b border-nx-outline-variant sticky top-0 z-30 bg-nx-bg-lowest">
          <h1 className="text-headline-md text-nx-on-surface font-bold">Configurações</h1>
          <div className="flex items-center gap-2">
            <button aria-label="Notificações" className="relative p-2 rounded-full hover:bg-nx-surface-hover transition-colors">
              <Bell size={20} /><span className="absolute top-2 right-2 size-2 rounded-full bg-nx-danger" />
            </button>
            <button aria-label="Conta" className="p-2 rounded-full hover:bg-nx-surface-hover transition-colors"><UserCircle2 size={22} /></button>
          </div>
        </header>

        <div className="p-5 md:p-8 mx-auto max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* ── Coluna principal ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Card de perfil */}
            {loading ? (
              <div className="h-48 animate-pulse rounded-2xl bg-nx-container/60" />
            ) : error ? (
              <div className={`${GLASS} p-8 text-center`}>
                <p className="text-nx-danger mb-3">{error}</p>
                <button onClick={carregar} className="text-nx-evo hover:underline text-label-md">Tentar de novo</button>
              </div>
            ) : (
              <div className={`${GLASS} p-6`}>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Avatar + editar foto */}
                  <div className="relative shrink-0">
                    <Avatar src={nutricionista?.foto} nome={nome} tamanho={112} className="rounded-2xl" />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={fotoLoading}
                      aria-label="Trocar foto"
                      className="absolute -bottom-2 -right-2 grid place-items-center size-9 rounded-full bg-nx-evo text-nx-on-evo shadow-nx-evo hover:bg-nx-evo-2 transition-colors disabled:opacity-60"
                    >
                      {fotoLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={escolherFoto} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex items-start justify-center sm:justify-between gap-3">
                      <div>
                        <h2 className="text-headline-lg font-extrabold leading-tight">{nome}</h2>
                        <p className="text-body-md text-nx-on-surface-variant mt-0.5">{subtitulo}</p>
                      </div>
                      <button
                        onClick={() => setEditOpen(true)}
                        className="hidden sm:flex items-center gap-1.5 text-label-md text-nx-on-surface-variant hover:text-nx-on-surface rounded-lg px-3 py-1.5 border border-nx-border"
                      >
                        <Pencil size={14} /> Editar
                      </button>
                    </div>

                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                      {me?.crn && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-nx-container px-3 py-1.5 text-label-md text-nx-on-surface-variant">
                          <BadgeCheck size={15} className="text-nx-evo" /> {me.crn}
                        </span>
                      )}
                      {me?.enderecoConsultorio?.trim() && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-nx-container px-3 py-1.5 text-label-md text-nx-on-surface-variant">
                          <MapPin size={15} className="text-nx-on-surface-variant" /> {me.enderecoConsultorio}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setEditOpen(true)}
                      className="sm:hidden mt-4 w-full flex items-center justify-center gap-1.5 text-label-md text-nx-evo rounded-xl py-2.5 border border-nx-border"
                    >
                      <Pencil size={14} /> Editar dados
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ajustes */}
            <section>
              <p className="text-label-md uppercase tracking-wider text-nx-outline px-1 mb-3">Ajustes</p>
              <div className={`${GLASS} divide-y divide-nx-border overflow-hidden`}>
                {/* Dados Pessoais → abre modal */}
                <AjusteRow
                  icon={<IdCard size={16} />}
                  titulo="Dados Pessoais"
                  descricao="Nome, CRN e endereço do consultório"
                  onClick={() => setEditOpen(true)}
                />

                {/* Segurança / senha (expansível) */}
                <SegurancaRow />

                {/* 2FA — Em breve */}
                <AjusteRow
                  icon={<ShieldCheck size={16} />}
                  titulo="Autenticação em duas etapas"
                  descricao="Camada extra de segurança no login"
                  tint="tertiary"
                  disabled
                  right={<span className="text-[11px] font-bold uppercase tracking-wider text-nx-outline bg-nx-container-high rounded-full px-2.5 py-1">Em breve</span>}
                />

                {/* Notificações push (toggle) */}
                <NotificacoesRow />
              </div>
            </section>
          </div>

          {/* ── Coluna lateral ───────────────────────────── */}
          <div className="space-y-5">
            <AjudaCard />
            <StatusCard />
          </div>
        </div>
      </main>

      {/* FAB — falar com suporte */}
      <a
        href={`mailto:${SUPORTE_EMAIL}`}
        className="fixed bottom-24 lg:bottom-8 right-6 lg:right-8 z-40 flex items-center gap-3 px-6 py-4 rounded-full bg-nx-container border border-nx-border shadow-nx-card hover:scale-105 transition-transform"
      >
        <MessageCircle size={22} className="text-nx-evo" />
        <span className="text-label-md font-bold uppercase tracking-wider text-nx-evo">Suporte</span>
      </a>

      {editOpen && me && (
        <EditarPerfilModal
          me={me}
          onClose={() => setEditOpen(false)}
          onSalvo={(patch) => {
            setMe((prev) => (prev ? { ...prev, ...patch } : prev));
            updateNutricionista({ nome: patch.nome, crn: patch.crn });
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ── Linha de ajuste genérica ─────────────────────────────────────────── */

function IconChip({ children, tint = "primary" }: { children: React.ReactNode; tint?: "primary" | "tertiary" | "secondary" }) {
  const map = {
    primary: "bg-nx-evo/12 text-nx-evo",
    tertiary: "bg-nx-container-high text-nx-on-surface-variant",
    secondary: "bg-nx-gold/15 text-nx-gold",
  } as const;
  return <div className={`grid place-items-center size-9 rounded-xl shrink-0 ${map[tint]}`}>{children}</div>;
}

function AjusteRow({ icon, titulo, descricao, onClick, right, disabled, tint = "primary" }: {
  icon: React.ReactNode; titulo: string; descricao?: string;
  onClick?: () => void; right?: React.ReactNode; disabled?: boolean;
  tint?: "primary" | "tertiary" | "secondary";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3.5 px-5 py-4 text-left transition-colors enabled:hover:bg-nx-surface-hover disabled:opacity-60 disabled:cursor-default"
    >
      <IconChip tint={tint}>{icon}</IconChip>
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-semibold text-nx-on-surface">{titulo}</p>
        {descricao && <p className="text-body-sm text-nx-on-surface-variant truncate">{descricao}</p>}
      </div>
      {right ?? <ChevronRight size={18} className="text-nx-outline shrink-0" />}
    </button>
  );
}

/* ── Segurança / alterar senha ────────────────────────────────────────── */

function SegurancaRow() {
  const [open, setOpen] = useState(false);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [conf, setConf] = useState("");
  const [showA, setShowA] = useState(false);
  const [showN, setShowN] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function submit() {
    if (!atual) { setErr("Informe a senha atual."); return; }
    if (nova.length < 6) { setErr("Nova senha deve ter pelo menos 6 caracteres."); return; }
    if (nova !== conf) { setErr("As senhas não coincidem."); return; }
    setLoading(true); setErr(""); setMsg("");
    try {
      await api.put("/auth/perfil", { senhaAtual: atual, novaSenha: nova });
      setMsg("Senha alterada com sucesso!");
      setAtual(""); setNova(""); setConf("");
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Erro ao alterar senha.");
    } finally { setLoading(false); }
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-nx-surface-hover"
      >
        <IconChip><Lock size={16} /></IconChip>
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold text-nx-on-surface">Segurança</p>
          <p className="text-body-sm text-nx-on-surface-variant">Alterar senha de acesso</p>
        </div>
        <ChevronRight size={18} className="text-nx-outline shrink-0 transition-transform" style={{ transform: open ? "rotate(90deg)" : "none" }} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          <div className="relative">
            <input
              type={showA ? "text" : "password"} placeholder="Senha atual" value={atual}
              onChange={(e) => setAtual(e.target.value)}
              className="w-full bg-nx-container border border-nx-border rounded-xl px-3 py-2.5 pr-10 text-body-sm text-nx-on-surface focus:outline-none focus:ring-1 focus:ring-nx-evo"
            />
            <button onClick={() => setShowA((s) => !s)} aria-label="Mostrar senha" className="absolute right-3 top-2.5 text-nx-outline hover:text-nx-on-surface">
              {showA ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showN ? "text" : "password"} placeholder="Nova senha" value={nova}
              onChange={(e) => setNova(e.target.value)}
              className="w-full bg-nx-container border border-nx-border rounded-xl px-3 py-2.5 pr-10 text-body-sm text-nx-on-surface focus:outline-none focus:ring-1 focus:ring-nx-evo"
            />
            <button onClick={() => setShowN((s) => !s)} aria-label="Mostrar senha" className="absolute right-3 top-2.5 text-nx-outline hover:text-nx-on-surface">
              {showN ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <input
            type="password" placeholder="Confirmar nova senha" value={conf}
            onChange={(e) => setConf(e.target.value)}
            className="w-full bg-nx-container border border-nx-border rounded-xl px-3 py-2.5 text-body-sm text-nx-on-surface focus:outline-none focus:ring-1 focus:ring-nx-evo"
          />
          {err && <p className="text-nx-danger text-body-sm">{err}</p>}
          {msg && <p className="text-nx-evo text-body-sm">{msg}</p>}
          <button
            onClick={submit} disabled={loading}
            className="w-full bg-nx-evo hover:bg-nx-evo-2 disabled:opacity-50 text-nx-on-evo text-label-md font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : "Salvar senha"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Notificações push (toggle real via VAPID) ────────────────────────── */

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

function NotificacoesRow() {
  const supported = typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setOn(!!sub))
      .catch(() => {});
  }, [supported]);

  async function toggle() {
    if (busy || !supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (on) {
        const sub = await reg.pushManager.getSubscription();
        const endpoint = sub?.endpoint;
        if (sub) await sub.unsubscribe();
        if (endpoint) await api.delete("/notificacoes/subscribe", { data: { endpoint } }).catch(() => {});
        setOn(false);
      } else {
        const { data } = await api.get<{ key: string | null }>("/notificacoes/vapid-public-key");
        if (!data.key) return; // backend sem VAPID configurado
        if (Notification.permission !== "granted") {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") return;
        }
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.key),
        });
        await api.post("/notificacoes/subscribe", sub.toJSON());
        setOn(true);
      }
    } catch { /* ignora */ } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3.5 px-5 py-4">
      <IconChip><Bell size={16} /></IconChip>
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-semibold text-nx-on-surface">Notificações push</p>
        <p className="text-body-sm text-nx-on-surface-variant">
          {supported ? "Alertas de check-ins e atividade dos pacientes" : "Não suportado neste navegador"}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={!supported || busy}
        aria-label="Alternar notificações"
        className="relative w-12 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50"
        style={{ background: on ? "#7CFF5B" : "rgba(255,255,255,0.12)" }}
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin absolute top-1 left-4 text-white" />
        ) : (
          <span className={`absolute top-1 size-4 bg-white rounded-full shadow transition-all ${on ? "left-7" : "left-1"}`} />
        )}
      </button>
    </div>
  );
}

/* ── Card de Ajuda ────────────────────────────────────────────────────── */

function AjudaCard() {
  const links = [
    { icon: <LifeBuoy size={16} />, label: "Falar com o suporte", href: `mailto:${SUPORTE_EMAIL}`, external: false },
    { icon: <FileText size={16} />, label: "Termos de uso", href: "/termos", external: true },
    { icon: <ShieldQuestion size={16} />, label: "Política de privacidade", href: "/privacidade", external: true },
  ];
  return (
    <section>
      <p className="text-label-md uppercase tracking-wider text-nx-outline px-1 mb-3">Ajuda</p>
      <div className={`${GLASS} divide-y divide-nx-border overflow-hidden`}>
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-nx-surface-hover"
          >
            <IconChip>{l.icon}</IconChip>
            <span className="flex-1 min-w-0 text-body-md font-semibold text-nx-on-surface">{l.label}</span>
            <ChevronRight size={18} className="text-nx-outline shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
}

/* ── Status do sistema (estático) ─────────────────────────────────────── */

function StatusCard() {
  const servicos = ["API principal", "Notificações", "Sincronização"];
  return (
    <section>
      <p className="text-label-md uppercase tracking-wider text-nx-outline px-1 mb-3">Status do sistema</p>
      <div className={`${GLASS} p-5`}>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-nx-evo opacity-60 animate-ping" />
            <span className="relative inline-flex size-2.5 rounded-full bg-nx-evo" />
          </span>
          <p className="text-body-md font-bold text-nx-on-surface">Todos os sistemas operacionais</p>
        </div>
        <ul className="space-y-2.5">
          {servicos.map((s) => (
            <li key={s} className="flex items-center justify-between text-body-sm">
              <span className="flex items-center gap-2 text-nx-on-surface-variant">
                <Activity size={14} className="text-nx-outline" /> {s}
              </span>
              <span className="text-nx-evo font-semibold">Operacional</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Modal de edição de dados ─────────────────────────────────────────── */

function EditarPerfilModal({ me, onClose, onSalvo }: {
  me: Me; onClose: () => void; onSalvo: (patch: Partial<Me>) => void;
}) {
  const [nome, setNome] = useState(me.nome);
  const [crn, setCrn] = useState(me.crn);
  const [endereco, setEndereco] = useState(me.enderecoConsultorio ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim() || !crn.trim()) { setErro("Nome e CRN são obrigatórios"); return; }
    setSalvando(true); setErro(null);
    try {
      await api.put("/auth/perfil", { nome, crn, enderecoConsultorio: endereco });
      onSalvo({ nome, crn, enderecoConsultorio: endereco });
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? "Erro ao salvar");
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full md:max-w-md bg-nx-surface border border-nx-border rounded-t-3xl md:rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-body-lg font-bold">Editar dados</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-nx-outline hover:text-nx-on-surface"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <Campo label="Nome" value={nome} onChange={setNome} />
          <Campo label="CRN" value={crn} onChange={setCrn} />
          <Campo label="Localização (endereço do consultório)" value={endereco} onChange={setEndereco} />
        </div>
        {erro && <p className="text-nx-danger text-body-sm mt-3">{erro}</p>}
        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full mt-5 bg-nx-evo hover:bg-nx-evo-2 disabled:opacity-50 text-nx-on-evo text-label-md font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {salvando ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : "Salvar"}
        </button>
      </div>
    </div>
  );
}

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-label-md text-nx-on-surface-variant">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-nx-container border border-nx-border rounded-xl px-3 py-2.5 text-body-sm text-nx-on-surface focus:outline-none focus:ring-1 focus:ring-nx-evo"
      />
    </label>
  );
}
