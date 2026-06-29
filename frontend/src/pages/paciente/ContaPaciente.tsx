import { useEffect, useRef, useState } from "react";
import { Camera, ChevronRight, LogOut, Bell, Lock, Trash2, Check, Eye, EyeOff, Globe } from "lucide-react";
import api from "../../lib/api";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";

interface MedData { peso: number; data: string; }
interface PacienteData {
  nome: string;
  objetivo: string;
  dataInicio: string;
  pesoMeta: number | null;
  fotoUrl: string | null;
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

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
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
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <p className="text-[14px] font-bold text-[#111] mb-4">Minhas conquistas</p>
      <div className="grid grid-cols-3 gap-3">
        {badges.map(b => (
          <div key={b.label}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl text-center ${
              b.ok ? "bg-[#F0FAF5]" : "bg-[#F5F5F3] opacity-40"
            }`}>
            <span className="text-[24px]">{b.emoji}</span>
            <span className="text-[9px] font-semibold leading-tight" style={{ color: b.ok ? "#1B4332" : "#999" }}>
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
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <p className="text-[14px] font-bold text-[#111] mb-4">Minha evolução</p>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Início",  val: pesoInicial ? `${pesoInicial}kg` : "—" },
          { label: "Atual",   val: pesoAtual   ? `${pesoAtual}kg`   : "—" },
          { label: "Meta",    val: pesoMeta    ? `${pesoMeta}kg`    : "—" },
        ].map(({ label, val }) => (
          <div key={label} className="bg-[#F9FAF8] rounded-xl p-3 text-center">
            <p className="text-[11px] text-[#999] mb-0.5">{label}</p>
            <p className="text-[16px] font-bold text-[#111]">{val}</p>
          </div>
        ))}
      </div>
      {pesoMeta && pesoInicial && (
        <div>
          <div className="flex justify-between text-[11px] text-[#999] mb-1.5">
            <span>Progresso</span>
            <span className="font-semibold" style={{ color: "#1B4332" }}>{pct}%</span>
          </div>
          <div className="h-2.5 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "#1B4332" }} />
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

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#E0F2E9" }}>
            <Lock size={16} style={{ color: "#1B4332" }} />
          </div>
          <span className="text-[14px] font-semibold text-[#111]">Alterar senha</span>
        </div>
        <ChevronRight size={16} className="text-[#bbb]"
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          <div className="relative">
            <input type={showA ? "text" : "password"} placeholder="Senha atual" value={atual}
              onChange={e => setAtual(e.target.value)}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-[#E8E8E8] text-[14px] focus:outline-none focus:border-[#1B4332]" />
            <button onClick={() => setShowA(s => !s)}
              className="absolute right-3 top-3.5 text-[#bbb]">
              {showA ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="relative">
            <input type={showN ? "text" : "password"} placeholder="Nova senha" value={nova}
              onChange={e => setNova(e.target.value)}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-[#E8E8E8] text-[14px] focus:outline-none focus:border-[#1B4332]" />
            <button onClick={() => setShowN(s => !s)}
              className="absolute right-3 top-3.5 text-[#bbb]">
              {showN ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <input type="password" placeholder="Confirmar nova senha" value={conf}
            onChange={e => setConf(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#E8E8E8] text-[14px] focus:outline-none focus:border-[#1B4332]" />
          {err && <p className="text-[12px] text-red-400">{err}</p>}
          {msg && <p className="text-[12px]" style={{ color: "#1B4332" }}>{msg}</p>}
          <button onClick={submit} disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold text-[14px] disabled:opacity-50"
            style={{ background: "#1B4332" }}>
            {loading ? "Salvando…" : "Salvar senha"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ContaPaciente() {
  const { paciente, token, logout, updateFoto } = usePacienteAuth();
  const [data, setData]             = useState<PacienteData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [uploadingFoto, setUploading] = useState(false);
  const [pushOn, setPushOn]         = useState(true);
  const [privDefault, setPrivDefault] = useState<"PUBLICO" | "APENAS_NUTRI">("PUBLICO");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    api.get<PacienteData>("/paciente-app/me", { headers: authHeader })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
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
        <div className="bg-white rounded-2xl animate-pulse h-48" />
        <div className="bg-white rounded-2xl animate-pulse h-32" />
      </div>
    );
  }

  const fotoUrl   = data.fotoUrl ?? paciente?.fotoUrl;
  const nome      = paciente?.nome ?? data.nome;
  const initials  = getInitials(nome);

  return (
    <div className="pt-4 pb-4 space-y-4 px-4">

      {/* Foto de perfil + nome */}
      <div className="bg-white rounded-2xl p-6 flex flex-col items-center"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#E0F2E9]">
            {fotoUrl ? (
              <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-[28px]"
                style={{ background: "#1B4332" }}>
                {initials}
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingFoto}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white border-2 border-white disabled:opacity-60"
            style={{ background: "#1B4332" }}>
            {uploadingFoto
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera size={14} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handleFotoChange} />
        </div>
        <p className="text-[20px] font-bold text-[#111]">{nome}</p>
        <p className="text-[13px] text-[#999] mt-0.5">
          {data.nutricionista.nomeConsultorio ?? data.nutricionista.nome}
        </p>
      </div>

      {/* Evolução */}
      <Evolucao data={data} />

      {/* Conquistas */}
      <Conquistas data={data} />

      {/* Configurações */}
      <div>
        <p className="text-[12px] font-bold text-[#888] uppercase tracking-wide mb-3">Configurações</p>
        <div className="space-y-2">

          {/* Notificações */}
          <div className="bg-white rounded-2xl px-5 py-4 flex items-center justify-between"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#E0F2E9" }}>
                <Bell size={16} style={{ color: "#1B4332" }} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111]">Notificações push</p>
                <p className="text-[11px] text-[#999]">Receber alertas da nutricionista</p>
              </div>
            </div>
            <button
              onClick={() => setPushOn(o => !o)}
              className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: pushOn ? "#1B4332" : "#D0D0D0" }}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${pushOn ? "left-7" : "left-1"}`} />
            </button>
          </div>

          {/* Privacidade padrão */}
          <div className="bg-white rounded-2xl px-5 py-4 flex items-center justify-between"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#E0F2E9" }}>
                <Globe size={16} style={{ color: "#1B4332" }} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111]">Posts públicos por padrão</p>
                <p className="text-[11px] text-[#999]">
                  {privDefault === "PUBLICO" ? "Todos do consultório veem" : "Só a nutricionista vê"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPrivDefault(p => p === "PUBLICO" ? "APENAS_NUTRI" : "PUBLICO")}
              className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: privDefault === "PUBLICO" ? "#1B4332" : "#D0D0D0" }}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                privDefault === "PUBLICO" ? "left-7" : "left-1"
              }`} />
            </button>
          </div>

          {/* Alterar senha */}
          {token && <AlterarSenha token={token} />}

        </div>
      </div>

      {/* Sair */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-[#F0F0EE] bg-white text-[14px] font-semibold"
        style={{ color: "#1B4332" }}>
        <LogOut size={16} />
        Sair da conta
      </button>

      {/* Excluir conta */}
      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-red-400">
          <Trash2 size={14} />
          Excluir minha conta
        </button>
      ) : (
        <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
          <p className="text-[14px] font-bold text-red-600 mb-1">Tem certeza?</p>
          <p className="text-[12px] text-red-400 mb-4">
            Esta ação é irreversível. Seus dados de acesso serão removidos.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2.5 rounded-xl border border-[#E0E0E0] text-[13px] font-semibold text-[#666]">
              Cancelar
            </button>
            <button onClick={handleDeleteConta} disabled={deleting}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-semibold disabled:opacity-50">
              {deleting ? "Excluindo…" : "Sim, excluir"}
            </button>
          </div>
        </div>
      )}

      <div className="h-2" />
    </div>
  );
}
