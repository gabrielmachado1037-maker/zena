import { useEffect, useRef, useState } from "react";
import { Camera, ChevronRight, LogOut, Bell, Lock, Trash2, Eye, EyeOff, Globe } from "lucide-react";
import api from "../../lib/api";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";
import Avatar from "../../components/Avatar";

interface MedData { peso: number; data: string; }
interface PacienteData {
  nome: string;
  objetivo: string;
  dataInicio: string;
  pesoMeta: number | null;
  fotoUrl: string | null;
  postPublicoPadrao: boolean;
  medicoes: MedData[];
  primeiroMedicao: MedData | null;
  nutricionista: { nome: string; nomeConsultorio: string | null };
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── Push helpers ─────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(b: string) {
  const padding = "=".repeat((4 - (b.length % 4)) % 4);
  const base64 = (b + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...atob(base64)].map(c => c.charCodeAt(0)));
}

function arrayBufferToBase64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

const pushSupported =
  typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

async function enablePush(token: string) {
  const { data } = await api.get<{ key: string | null }>("/notificacoes/vapid-public-key");
  if (!data.key) throw new Error("VAPID indisponível");
  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Permissão negada");
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.key),
  });
  await api.post(
    "/paciente-app/push/subscribe",
    {
      endpoint: sub.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(sub.getKey("p256dh")!),
        auth: arrayBufferToBase64(sub.getKey("auth")!),
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function disablePush(token: string) {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await api.delete("/paciente-app/push/subscribe", {
      data: { endpoint: sub.endpoint },
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}

// ─── Conquistas ──────────────────────────────────────────────────────────────

function calcDias(dataInicio: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(dataInicio).getTime()) / 86400000));
}

function Conquistas({ data, diasConsecutivos }: { data: PacienteData; diasConsecutivos?: number }) {
  const dias = calcDias(data.dataInicio);
  const pesoAtual  = data.medicoes[0]?.peso;
  const pesoMeta   = data.pesoMeta;
  const pesoInicial = data.primeiroMedicao?.peso;

  const badges = [
    { emoji: "🌱", label: `${dias} dia${dias !== 1 ? "s" : ""} de jornada`, ok: dias > 0 },
    { emoji: "📊", label: "Primeiro registro", ok: !!pesoAtual },
    { emoji: "🎯", label: "Meta definida", ok: !!pesoMeta },
    { emoji: "🔥", label: "7 dias seguidos", ok: (diasConsecutivos ?? 0) >= 7 },
    { emoji: "⭐", label: "Meio caminho", ok: pesoMeta && pesoInicial && pesoAtual
        ? Math.abs(pesoAtual - pesoInicial) / Math.abs(pesoMeta - pesoInicial) >= 0.5
        : false },
    { emoji: "🏆", label: "Meta batida!", ok: pesoMeta && pesoAtual
        ? Math.abs(pesoAtual - pesoMeta) <= 1
        : false },
  ];

  return (
    <div className="bg-nx-surface rounded-2xl p-5 border border-white/5">
      <p className="text-[14px] font-bold text-nx-on-surface mb-4">Minhas conquistas</p>
      <div className="grid grid-cols-3 gap-3">
        {badges.map(b => (
          <div key={b.label}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl text-center ${
              b.ok ? "bg-nx-tertiary/10" : "bg-nx-container opacity-40"
            }`}>
            <span className="text-[24px]">{b.emoji}</span>
            <span className={`text-[9px] font-semibold leading-tight ${
              b.ok ? "text-nx-tertiary" : "text-nx-outline"
            }`}>
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Evolução ─────────────────────────────────────────────────────────────────

function Evolucao({ data }: { data: PacienteData }) {
  const pesoAtual   = data.medicoes[0]?.peso;
  const pesoInicial = data.primeiroMedicao?.peso;
  const pesoMeta    = data.pesoMeta;

  const pct = pesoMeta && pesoInicial && pesoAtual
    ? Math.min(100, Math.round(Math.abs(pesoAtual - pesoInicial) / Math.abs(pesoMeta - pesoInicial) * 100))
    : 0;

  return (
    <div className="bg-nx-surface rounded-2xl p-5 border border-white/5">
      <p className="text-[14px] font-bold text-nx-on-surface mb-4">Minha evolução</p>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Início",  val: pesoInicial ? `${pesoInicial}kg` : "—" },
          { label: "Atual",   val: pesoAtual   ? `${pesoAtual}kg`   : "—" },
          { label: "Meta",    val: pesoMeta    ? `${pesoMeta}kg`    : "—" },
        ].map(({ label, val }) => (
          <div key={label} className="bg-nx-container-low rounded-xl p-3 text-center">
            <p className="text-[11px] text-nx-on-surface-variant mb-0.5">{label}</p>
            <p className="text-[16px] font-bold text-nx-on-surface">{val}</p>
          </div>
        ))}
      </div>
      {pesoMeta && pesoInicial && (
        <div>
          <div className="flex justify-between text-[11px] text-nx-on-surface-variant mb-1.5">
            <span>Progresso</span>
            <span className="font-semibold text-nx-primary">{pct}%</span>
          </div>
          <div className="h-2.5 bg-nx-container-high rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-nx-primary transition-all duration-700"
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Alterar senha ────────────────────────────────────────────────────────────

function AlterarSenha({ token }: { token: string }) {
  const [open, setOpen]       = useState(false);
  const [atual, setAtual]     = useState("");
  const [nova, setNova]       = useState("");
  const [conf, setConf]       = useState("");
  const [showA, setShowA]     = useState(false);
  const [showN, setShowN]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState("");
  const [err, setErr]         = useState("");

  async function submit() {
    if (nova !== conf) { setErr("As senhas não coincidem."); return; }
    if (nova.length < 6) { setErr("Mínimo 6 caracteres."); return; }
    setLoading(true); setErr(""); setMsg("");
    try {
      await api.put("/paciente-app/perfil", { senhaAtual: atual, novaSenha: nova },
        { headers: { Authorization: `Bearer ${token}` } });
      setMsg("Senha alterada com sucesso!");
      setAtual(""); setNova(""); setConf(""); setOpen(false);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Erro ao alterar senha.");
    } finally { setLoading(false); }
  }

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-white/10 bg-nx-container text-nx-on-surface text-[14px] placeholder:text-nx-outline focus:outline-none focus:border-nx-primary";

  return (
    <div className="bg-nx-surface rounded-2xl overflow-hidden border border-white/5">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-nx-primary/15">
            <Lock size={16} className="text-nx-primary" />
          </div>
          <span className="text-[14px] font-semibold text-nx-on-surface">Alterar senha</span>
        </div>
        <ChevronRight size={16} className="text-nx-outline"
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          <div className="relative">
            <input type={showA ? "text" : "password"} placeholder="Senha atual" value={atual}
              onChange={e => setAtual(e.target.value)}
              className={`${inputCls} pr-10`} />
            <button onClick={() => setShowA(s => !s)}
              className="absolute right-3 top-3.5 text-nx-outline">
              {showA ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="relative">
            <input type={showN ? "text" : "password"} placeholder="Nova senha" value={nova}
              onChange={e => setNova(e.target.value)}
              className={`${inputCls} pr-10`} />
            <button onClick={() => setShowN(s => !s)}
              className="absolute right-3 top-3.5 text-nx-outline">
              {showN ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <input type="password" placeholder="Confirmar nova senha" value={conf}
            onChange={e => setConf(e.target.value)}
            className={inputCls} />
          {err && <p className="text-[12px] text-nx-error">{err}</p>}
          {msg && <p className="text-[12px] text-nx-tertiary">{msg}</p>}
          <button onClick={submit} disabled={loading}
            className="w-full py-3 rounded-xl bg-nx-primary-container text-white font-semibold text-[14px] disabled:opacity-50">
            {loading ? "Salvando…" : "Salvar senha"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 disabled:opacity-50 ${
        on ? "bg-nx-primary-container" : "bg-nx-container-high"
      }`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ContaPaciente() {
  const { paciente, token, logout, updateFoto } = usePacienteAuth();
  const [data, setData]             = useState<PacienteData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [uploadingFoto, setUploading] = useState(false);
  const [pushOn, setPushOn]         = useState(false);
  const [pushBusy, setPushBusy]     = useState(false);
  const [postPublico, setPostPublico] = useState(true);
  const [privBusy, setPrivBusy]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    api.get<PacienteData>("/paciente-app/me", { headers: authHeader })
      .then(r => { setData(r.data); setPostPublico(r.data.postPublicoPadrao); })
      .finally(() => setLoading(false));
  }, []);

  // Estado inicial do push: reflete a subscription real no dispositivo.
  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setPushOn(!!sub && Notification.permission === "granted"))
      .catch(() => {});
  }, []);

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const base64 = await fileToBase64(f);
      const res = await api.put<{ fotoUrl: string }>("/paciente-app/foto-perfil",
        { fotoBase64: base64 }, { headers: authHeader });
      updateFoto(res.data.fotoUrl);
      setData(prev => prev ? { ...prev, fotoUrl: res.data.fotoUrl } : prev);
    } catch { /* silently */ } finally { setUploading(false); }
  }

  async function togglePush() {
    if (!token || pushBusy) return;
    if (!pushSupported) { alert("Seu navegador não suporta notificações push."); return; }
    setPushBusy(true);
    const next = !pushOn;
    try {
      if (next) await enablePush(token);
      else      await disablePush(token);
      setPushOn(next);
    } catch {
      setPushOn(false); // permissão negada ou falha → mantém desligado
    } finally { setPushBusy(false); }
  }

  async function togglePrivacidade() {
    if (!token || privBusy) return;
    const next = !postPublico;
    setPostPublico(next);          // otimista
    setPrivBusy(true);
    try {
      await api.put("/paciente-app/perfil", { postPublicoPadrao: next }, { headers: authHeader });
      setData(prev => prev ? { ...prev, postPublicoPadrao: next } : prev);
    } catch {
      setPostPublico(!next);       // reverte em caso de erro
    } finally { setPrivBusy(false); }
  }

  async function handleDeleteConta() {
    setDeleting(true);
    try {
      await api.delete("/paciente-app/conta", { headers: authHeader });
      logout();
    } catch { setDeleting(false); setConfirmDelete(false); }
  }

  if (loading || !data) {
    return (
      <div className="pt-4 pb-4 space-y-4 px-4">
        <div className="bg-nx-container/60 rounded-2xl animate-pulse h-48" />
        <div className="bg-nx-container/60 rounded-2xl animate-pulse h-32" />
      </div>
    );
  }

  const fotoUrl   = data.fotoUrl ?? paciente?.fotoUrl;
  const nome      = paciente?.nome ?? data.nome;

  return (
    <div className="pt-4 pb-4 space-y-4 px-4">

      {/* Foto de perfil + nome */}
      <div className="bg-nx-surface rounded-2xl p-6 flex flex-col items-center border border-white/5">
        <div className="relative mb-4">
          <div className="rounded-full overflow-hidden ring-4 ring-nx-primary/20">
            <Avatar src={fotoUrl} nome={nome} tamanho={96} />
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingFoto}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white border-2 border-nx-surface bg-nx-primary-container disabled:opacity-60">
            {uploadingFoto
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera size={14} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handleFotoChange} />
        </div>
        <p className="text-[20px] font-bold text-nx-on-surface">{nome}</p>
        <p className="text-[13px] text-nx-on-surface-variant mt-0.5">
          {data.nutricionista.nomeConsultorio ?? data.nutricionista.nome}
        </p>
      </div>

      {/* Evolução */}
      <Evolucao data={data} />

      {/* Conquistas */}
      <Conquistas data={data} />

      {/* Configurações */}
      <div>
        <p className="text-[12px] font-bold text-nx-outline uppercase tracking-wide mb-3">Configurações</p>
        <div className="space-y-2">

          {/* Notificações */}
          <div className="bg-nx-surface rounded-2xl px-5 py-4 flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-nx-primary/15">
                <Bell size={16} className="text-nx-primary" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-nx-on-surface">Notificações push</p>
                <p className="text-[11px] text-nx-on-surface-variant">Receber alertas da nutricionista</p>
              </div>
            </div>
            <Toggle on={pushOn} onClick={togglePush} disabled={pushBusy} />
          </div>

          {/* Privacidade padrão */}
          <div className="bg-nx-surface rounded-2xl px-5 py-4 flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-nx-primary/15">
                <Globe size={16} className="text-nx-primary" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-nx-on-surface">Posts públicos por padrão</p>
                <p className="text-[11px] text-nx-on-surface-variant">
                  {postPublico ? "Todos do consultório veem" : "Só a nutricionista vê"}
                </p>
              </div>
            </div>
            <Toggle on={postPublico} onClick={togglePrivacidade} disabled={privBusy} />
          </div>

          {/* Alterar senha */}
          {token && <AlterarSenha token={token} />}

        </div>
      </div>

      {/* Sair */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-white/5 bg-nx-surface text-[14px] font-semibold text-nx-primary">
        <LogOut size={16} />
        Sair da conta
      </button>

      {/* Excluir conta */}
      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-nx-error/80">
          <Trash2 size={14} />
          Excluir minha conta
        </button>
      ) : (
        <div className="bg-nx-error/10 rounded-2xl p-5 border border-nx-error/30">
          <p className="text-[14px] font-bold text-nx-error mb-1">Tem certeza?</p>
          <p className="text-[12px] text-nx-error/70 mb-4">
            Esta ação é irreversível. Seus dados de acesso serão removidos.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-[13px] font-semibold text-nx-on-surface-variant">
              Cancelar
            </button>
            <button onClick={handleDeleteConta} disabled={deleting}
              className="flex-1 py-2.5 rounded-xl bg-nx-error text-nx-bg-lowest text-[13px] font-semibold disabled:opacity-50">
              {deleting ? "Excluindo…" : "Sim, excluir"}
            </button>
          </div>
        </div>
      )}

      <div className="h-2" />
    </div>
  );
}
