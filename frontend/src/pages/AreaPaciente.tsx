import { useEffect, useState, useRef, type ChangeEvent } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, TrendingDown, TrendingUp, CheckCircle, RefreshCw, ArrowLeft, Camera, ChevronRight } from "lucide-react";
import confetti from "canvas-confetti";
import api from "../lib/api";
import { comprimirImagem, calcularStreak, jaFezCheckinEstaSemana } from "../lib/utils";

// ---------- Types ----------
interface CheckIn {
  id: string;
  semana: number;
  ano: number;
  humor: number;
  adesao: number;
  peso?: number;
  foto?: string;
  nota?: string;
  criadoEm: string;
}

interface AnamnesePaciente {
  queixaPrincipal?: string;
  restricoes?: string;
}

interface DadosPaciente {
  id: string;
  nome: string;
  objetivo: string;
  pesoMeta: number | null;
  fotoInicial?: string;
  nutricionista: { nome: string; nomeConsultorio?: string | null; logoConsultorio?: string | null };
  medicoes: Array<{ id: string; data: string; peso: number; gordura?: number; musculo?: number }>;
  planosAlimentares: Array<{ cafeManha: string; lancheManha?: string; almoco: string; lancheTarde?: string; jantar: string; ceia?: string; observacoes?: string }>;
  consultas: Array<{ id: string; data: string; status: string }>;
  checkIns: CheckIn[];
  anamnese?: AnamnesePaciente | null;
}

// ---------- Helpers ----------
const humores = [
  { v: 1, emoji: "😔", label: "Difícil" },
  { v: 2, emoji: "😕", label: "Mais ou menos" },
  { v: 3, emoji: "😐", label: "Ok" },
  { v: 4, emoji: "🙂", label: "Bem" },
  { v: 5, emoji: "😊", label: "Ótimo!" },
];

const adesoes = [
  { v: 0, label: "Não segui", cls: "bg-nx-danger/15 text-nx-danger border-nx-danger/40" },
  { v: 25, label: "Um pouco", cls: "bg-nx-streak/15 text-nx-streak border-nx-streak/40" },
  { v: 50, label: "Metade", cls: "bg-nx-gold/15 text-nx-gold border-nx-gold/40" },
  { v: 75, label: "Quase tudo", cls: "bg-nx-evo/12 text-nx-evo border-nx-evo/30" },
  { v: 100, label: "100%! 🎉", cls: "bg-nx-evo/20 text-nx-evo border-nx-evo/50" },
];

function getMensagem(diff: number | null): string {
  if (diff === null) return "Acompanhando sua evolução com carinho. 💚";
  if (diff < -5) return `Incrível! Você já perdeu ${Math.abs(diff).toFixed(1)} kg! Continue assim! 💪`;
  if (diff < -2) return `Ótimo progresso! Menos ${Math.abs(diff).toFixed(1)} kg desde o início. Cada passo conta!`;
  if (diff < 0) return `Você está no caminho certo! Menos ${Math.abs(diff).toFixed(1)} kg desde que começou. 🌱`;
  return "Cada dia é uma nova oportunidade. Continue seguindo seu plano! 🌿";
}

// ---------- Main Component ----------
type View = "portal" | "checkin" | "celebracao" | "anamnese" | "agendamento";

export default function AreaPaciente() {
  const { link } = useParams<{ link: string }>();
  const [dados, setDados] = useState<DadosPaciente | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<View>("portal");
  const [consultaAcao, setConsultaAcao] = useState<string | null>(null);
  const [novoCheckin, setNovoCheckin] = useState<CheckIn | null>(null);

  useEffect(() => {
    api.get(`/public/paciente/${link}`)
      .then((res) => { setDados(res.data); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [link]);

  async function confirmarConsulta(consultaId: string) {
    await api.patch(`/public/paciente/${link}/consulta/${consultaId}/confirmar`);
    setConsultaAcao("confirmada");
  }

  async function remarcarConsulta(consultaId: string) {
    await api.patch(`/public/paciente/${link}/consulta/${consultaId}/remarcar`);
    setConsultaAcao("remarcacao");
  }

  function onCheckinFeito(ci: CheckIn) {
    setNovoCheckin(ci);
    setDados((d) => d ? { ...d, checkIns: [ci, ...d.checkIns.filter((c) => !(c.semana === ci.semana && c.ano === ci.ano))] } : d);
    setView("celebracao");
  }

  if (loading) return (
    <div className="min-h-screen bg-nx-bg flex items-center justify-center">
      <img src="/nexvel-x-512.png" alt="Nexvel" className="h-10 w-auto animate-pulse" />
    </div>
  );

  if (notFound || !dados) return (
    <div className="min-h-screen bg-nx-bg flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-nx-on-surface-variant font-medium text-lg">Link inválido.</p>
        <p className="text-nx-on-surface-variant text-sm mt-2">Entre em contato com sua nutricionista.</p>
      </div>
    </div>
  );

  const checkInsOrdenados = [...dados.checkIns].sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.semana - a.semana);
  const streak = calcularStreak(checkInsOrdenados);
  const fezCheckin = jaFezCheckinEstaSemana(checkInsOrdenados);
  const medicoes = [...dados.medicoes].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  const pesoInicial = medicoes[0]?.peso ?? null;
  const pesoAtual = medicoes[medicoes.length - 1]?.peso ?? null;
  const diff = pesoAtual !== null && pesoInicial !== null ? pesoAtual - pesoInicial : null;
  const plano = dados.planosAlimentares[0];
  const proximaConsulta = dados.consultas[0];

  let progressoPct = 0;
  if (pesoInicial && pesoAtual && dados.pesoMeta) {
    const total = pesoInicial - dados.pesoMeta;
    const feito = pesoInicial - pesoAtual;
    progressoPct = Math.min(100, Math.max(0, Math.round((feito / (total || 1)) * 100)));
  }

  const fotoDepois = checkInsOrdenados.find((c) => c.foto)?.foto;

  if (view === "checkin") {
    return (
      <CheckInView
        link={link!}
        pacienteNome={dados.nome}
        nutricionistaNome={dados.nutricionista.nome}
        onFeito={onCheckinFeito}
        onBack={() => setView("portal")}
      />
    );
  }

  if (view === "celebracao") {
    return (
      <CelebracaoView
        streak={streak}
        ci={novoCheckin}
        onDone={() => setView("portal")}
      />
    );
  }

  if (view === "anamnese") {
    return (
      <AnamneseView
        link={link!}
        pacienteNome={dados.nome}
        onFeito={() => {
          setDados((d) => d ? { ...d, anamnese: { queixaPrincipal: "preenchida" } } : d);
          setView("portal");
        }}
        onBack={() => setView("portal")}
      />
    );
  }

  if (view === "agendamento") {
    return (
      <AgendamentoView
        link={link!}
        pacienteNome={dados.nome}
        nutricionistaNome={dados.nutricionista.nome}
        onFeito={() => setView("portal")}
        onBack={() => setView("portal")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-nx-bg pb-12">
      {/* Header */}
      <div className="bg-nx-surface px-6 pt-10 pb-10">
        {/* Branding do consultório */}
        <div className="flex items-center gap-3 mb-6">
          {dados.nutricionista.logoConsultorio ? (
            <img
              src={dados.nutricionista.logoConsultorio}
              alt={dados.nutricionista.nomeConsultorio || dados.nutricionista.nome}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#0A0A0A] flex items-center justify-center">
              <img src="/nexvel-x-512.png" alt="" className="h-5 w-auto" />
            </div>
          )}
          <div>
            <p className="text-white font-semibold text-sm leading-tight">
              {dados.nutricionista.nomeConsultorio || dados.nutricionista.nome.split(" ")[0]}
            </p>
            <p className="text-white/40 text-[10px]">via Nexvel</p>
          </div>
        </div>

        {/* Saudação ao paciente */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-nx-on-surface-variant text-sm mb-1">acompanhamento com {dados.nutricionista.nome.split(" ")[0]}</p>
            <h1 className="text-white text-3xl font-bold">Olá, {dados.nome.split(" ")[0]}! 🌿</h1>
            <p className="text-nx-outline text-sm mt-1">{dados.objetivo}</p>
          </div>
          {streak > 0 && (
            <div className="flex-shrink-0 flex items-center gap-2 bg-nx-container backdrop-blur-sm px-3 py-2 rounded-2xl">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="text-white font-bold text-sm leading-tight">{streak}</p>
                <p className="text-white/60 text-xs leading-tight">{streak === 1 ? "semana" : "semanas"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-4">

        {/* Anamnese CTA */}
        {!dados.anamnese && (
          <div
            onClick={() => setView("anamnese")}
            className="bg-nx-container border-2 border-nx-border rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div className="flex-1">
                <p className="text-nx-on-surface font-semibold text-sm">Complete seu histórico de saúde</p>
                <p className="text-nx-on-surface-variant text-xs">Leva 3 minutos e ajuda muito sua nutricionista!</p>
              </div>
              <ChevronRight size={18} className="text-nx-on-surface-variant flex-shrink-0" />
            </div>
          </div>
        )}

        {/* Check-in card */}
        {!fezCheckin ? (
          <div
            onClick={() => setView("checkin")}
            className="bg-nx-container rounded-2xl p-5 shadow-lg border border-nx-border cursor-pointer hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-nx-evo/12 flex items-center justify-center text-2xl">✨</div>
                <div>
                  <p className="text-nx-on-surface font-semibold">Check-in semanal</p>
                  <p className="text-nx-on-surface-variant text-xs">2 minutinhos · me ajuda muito!</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-nx-on-surface-variant" />
            </div>
          </div>
        ) : (
          <div className="bg-nx-evo/10 border border-nx-evo/30 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-nx-evo flex-shrink-0" />
            <div>
              <p className="text-nx-evo font-medium text-sm">Check-in desta semana feito! ✅</p>
              <p className="text-nx-on-surface-variant text-xs">Você pode atualizar quando quiser.</p>
            </div>
            <button
              onClick={() => setView("checkin")}
              className="ml-auto text-xs text-nx-evo font-medium hover:underline flex-shrink-0"
            >
              Editar
            </button>
          </div>
        )}

        {/* Evolução */}
        {medicoes.length > 0 && (
          <div className="bg-nx-container rounded-2xl p-5 shadow-sm border border-nx-border">
            <h2 className="text-nx-on-surface font-semibold mb-1">Sua evolução</h2>
            <p className="text-nx-on-surface-variant text-sm mb-4">{getMensagem(diff)}</p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-nx-surface rounded-xl p-3 text-center">
                <p className="text-nx-on-surface-variant text-xs mb-0.5">Início</p>
                <p className="text-nx-on-surface font-bold font-mono-data">{pesoInicial} kg</p>
              </div>
              <div className="bg-nx-evo/10 rounded-xl p-3 text-center border border-nx-evo/20">
                <p className="text-nx-on-surface-variant text-xs mb-0.5">Agora</p>
                <p className="text-nx-evo font-bold font-mono-data text-lg">{pesoAtual} kg</p>
              </div>
              {dados.pesoMeta && (
                <div className="bg-nx-surface rounded-xl p-3 text-center">
                  <p className="text-nx-on-surface-variant text-xs mb-0.5">Meta</p>
                  <p className="text-nx-on-surface font-bold font-mono-data">{dados.pesoMeta} kg</p>
                </div>
              )}
            </div>

            {diff !== null && (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4 ${diff < 0 ? "bg-nx-evo/10" : "bg-nx-streak/10"}`}>
                {diff < 0 ? <TrendingDown size={15} className="text-nx-evo" /> : <TrendingUp size={15} className="text-nx-streak" />}
                <span className="text-sm font-medium text-nx-on-surface">
                  {diff < 0 ? `Perdeu ${Math.abs(diff).toFixed(1)} kg` : diff > 0 ? `Ganhou ${diff.toFixed(1)} kg` : "Peso estável"} desde o início
                </span>
              </div>
            )}

            {dados.pesoMeta && progressoPct > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-nx-on-surface-variant mb-1.5">
                  <span>Progresso até a meta</span>
                  <span className="font-medium text-nx-evo">{progressoPct}%</span>
                </div>
                <div className="h-3 bg-nx-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-nx-evo to-nx-evo-2 rounded-full transition-all duration-700" style={{ width: `${progressoPct}%` }} />
                </div>
              </div>
            )}

            {medicoes.length > 1 && (
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={medicoes.map((m) => ({ data: format(new Date(m.data), "dd/MM"), peso: m.peso }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2F38" />
                  <XAxis dataKey="data" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} domain={["dataMin - 2", "dataMax + 2"]} width={32} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #2A2F38", background: "#111318", color: "#F8FAFC", fontSize: 11 }} />
                  <Line type="monotone" dataKey="peso" stroke="#7CFF5B" strokeWidth={2.5} dot={{ fill: "#7CFF5B", r: 3 }} name="Peso (kg)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Galeria de fotos de evolução */}
        {(dados.fotoInicial || checkInsOrdenados.some(c => c.foto)) && (
          <div className="bg-nx-container rounded-2xl p-5 shadow-sm border border-nx-border">
            <h2 className="text-nx-on-surface font-semibold mb-3">Fotos de evolução</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {dados.fotoInicial && (
                <div className="flex-shrink-0 text-center">
                  <img src={dados.fotoInicial} alt="Início" className="w-24 h-32 object-cover rounded-xl" />
                  <p className="text-[10px] text-nx-on-surface-variant mt-1">Início</p>
                </div>
              )}
              {[...checkInsOrdenados].reverse().filter(c => c.foto).map(c => (
                <div key={c.id} className="flex-shrink-0 text-center">
                  <img src={c.foto!} alt={`Semana ${c.semana}`} className="w-24 h-32 object-cover rounded-xl" />
                  <p className="text-[10px] text-nx-on-surface-variant mt-1">Sem. {c.semana}/{c.ano}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próxima consulta */}
        {proximaConsulta && (
          <div className="bg-nx-container rounded-2xl p-5 shadow-sm border border-nx-border">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={17} className="text-nx-evo" />
              <h2 className="text-nx-on-surface font-semibold">Próxima consulta</h2>
            </div>
            <p className="text-nx-on-surface font-medium capitalize">
              {format(new Date(proximaConsulta.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="text-nx-on-surface-variant text-sm">{format(new Date(proximaConsulta.data), "HH:mm")} h · com {dados.nutricionista.nome.split(" ")[0]}</p>

            {consultaAcao === "confirmada" && (
              <div className="flex items-center gap-2 mt-3 text-nx-evo text-sm bg-nx-evo/10 px-3 py-2.5 rounded-xl">
                <CheckCircle size={15} /> Presença confirmada!
              </div>
            )}
            {consultaAcao === "remarcacao" && (
              <div className="flex items-center gap-2 mt-3 text-nx-streak text-sm bg-nx-streak/10 px-3 py-2.5 rounded-xl">
                <RefreshCw size={15} /> Solicitação de remarcação enviada.
              </div>
            )}
            {!consultaAcao && proximaConsulta.status === "agendada" && (
              <div className="flex gap-2 mt-4">
                <button onClick={() => confirmarConsulta(proximaConsulta.id)} className="flex-1 bg-nx-evo text-nx-on-evo py-2.5 rounded-xl text-sm font-medium">Confirmar</button>
                <button onClick={() => remarcarConsulta(proximaConsulta.id)} className="flex-1 border border-nx-border text-nx-on-surface-variant py-2.5 rounded-xl text-sm">Remarcar</button>
              </div>
            )}
          </div>
        )}

        {/* Plano alimentar */}
        {plano && (
          <div className="bg-nx-container rounded-2xl p-5 shadow-sm border border-nx-border">
            <h2 className="text-nx-on-surface font-semibold mb-4">Meu plano alimentar</h2>
            <div className="space-y-2.5">
              {([
                { emoji: "☀️", label: "Café da manhã", val: plano.cafeManha },
                { emoji: "🍎", label: "Lanche da manhã", val: plano.lancheManha },
                { emoji: "🥗", label: "Almoço", val: plano.almoco },
                { emoji: "🥤", label: "Lanche da tarde", val: plano.lancheTarde },
                { emoji: "🌙", label: "Jantar", val: plano.jantar },
                { emoji: "🫖", label: "Ceia", val: plano.ceia },
              ] as const).filter((r) => r.val).map((r) => (
                <div key={r.label} className="flex gap-3 p-3 bg-nx-surface rounded-xl">
                  <span className="text-lg flex-shrink-0">{r.emoji}</span>
                  <div>
                    <p className="text-nx-on-surface-variant text-xs font-medium">{r.label}</p>
                    <p className="text-nx-on-surface text-sm mt-0.5">{r.val}</p>
                  </div>
                </div>
              ))}
              {plano.observacoes && (
                <div className="bg-nx-container border border-nx-border rounded-xl p-3">
                  <p className="text-nx-on-surface-variant text-xs font-medium mb-1">Observações</p>
                  <p className="text-nx-on-surface text-sm">{plano.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline de atividades */}
        {(checkInsOrdenados.length > 0 || medicoes.length > 0) && (
          <div className="bg-nx-container rounded-2xl p-5 shadow-sm border border-nx-border">
            <h2 className="text-nx-on-surface font-semibold mb-4">Histórico</h2>
            <div className="space-y-3">
              {checkInsOrdenados.slice(0, 5).map((ci) => (
                <div key={ci.id} className="flex gap-3 items-start p-3 bg-nx-surface rounded-xl">
                  <span className="text-xl flex-shrink-0">{humores.find((h) => h.v === ci.humor)?.emoji || "😐"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-nx-on-surface text-sm font-medium">Check-in semanal</p>
                      <p className="text-nx-on-surface-variant text-xs flex-shrink-0">Sem. {ci.semana}/{ci.ano}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-nx-on-surface-variant">Plano: <span className="font-medium text-nx-on-surface-variant">{ci.adesao}%</span></span>
                      {ci.peso && <span className="text-xs text-nx-on-surface-variant">Peso: <span className="font-mono-data font-medium text-nx-on-surface-variant">{ci.peso} kg</span></span>}
                    </div>
                    {ci.nota && <p className="text-xs text-nx-on-surface-variant mt-1 italic">"{ci.nota}"</p>}
                  </div>
                </div>
              ))}
              {medicoes.slice(-3).reverse().map((m) => (
                <div key={m.id} className="flex gap-3 items-center p-3 rounded-xl border border-nx-border">
                  <span className="text-xl">📊</span>
                  <div className="flex-1">
                    <p className="text-nx-on-surface text-sm font-medium">Medição registrada</p>
                    <p className="text-xs text-nx-on-surface-variant">{format(new Date(m.data), "dd 'de' MMM 'de' yyyy", { locale: ptBR })} · <span className="font-mono-data">{m.peso} kg</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agendar consulta */}
        <div
          onClick={() => setView("agendamento")}
          className="bg-nx-container rounded-2xl p-5 shadow-sm border border-nx-border cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-nx-evo/12 flex items-center justify-center text-2xl">📅</div>
              <div>
                <p className="text-nx-on-surface font-semibold">Agendar consulta</p>
                <p className="text-nx-on-surface-variant text-xs">Escolha um horário disponível</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-nx-on-surface-variant" />
          </div>
        </div>

        <p className="text-center text-nx-on-surface-variant text-xs pb-4">
          Powered by <span className="font-semibold text-nx-evo">Nexvel</span> · seu consultório. simplificado.
        </p>
      </div>
    </div>
  );
}

// ---------- Check-In View ----------
function CheckInView({ link, pacienteNome, nutricionistaNome, onFeito, onBack }: {
  link: string;
  pacienteNome: string;
  nutricionistaNome: string;
  onFeito: (ci: CheckIn) => void;
  onBack: () => void;
}) {
  const [humor, setHumor] = useState<number | null>(null);
  const [adesao, setAdesao] = useState<number | null>(null);
  const [peso, setPeso] = useState("");
  const [nota, setNota] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await comprimirImagem(file);
      setFoto(compressed);
      setFotoPreview(compressed);
    } catch {
      setError("Erro ao processar a foto.");
    }
  }

  async function enviar() {
    if (humor === null || adesao === null) {
      setError("Selecione seu humor e a adesão ao plano.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/public/paciente/${link}/checkin`, {
        humor,
        adesao,
        peso: peso || undefined,
        foto: foto || undefined,
        nota: nota || undefined,
      });
      onFeito(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const pronto = humor !== null && adesao !== null;

  return (
    <div className="min-h-screen bg-nx-bg">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-nx-on-surface-variant hover:text-nx-evo mb-6 text-sm">
          <ArrowLeft size={16} />Voltar
        </button>
        <div className="flex items-center gap-2 mb-2">
          <img src="/nexvel-x-512.png" alt="" className="h-[18px] w-auto" />
          <span className="text-white/70 text-sm">Nexvel</span>
        </div>
        <h1 className="text-white text-2xl font-bold">Check-in semanal ✨</h1>
        <p className="text-nx-on-surface-variant text-sm mt-1">Olá, {pacienteNome.split(" ")[0]}! Como foi sua semana?</p>
      </div>

      <div className="bg-nx-surface min-h-screen rounded-t-3xl px-5 py-8 space-y-6">

        {/* Humor */}
        <div>
          <p className="text-nx-on-surface font-semibold mb-1">Como você se sentiu esta semana?</p>
          <p className="text-nx-on-surface-variant text-xs mb-4">Seja honesta — isso me ajuda a te apoiar melhor 💚</p>
          <div className="grid grid-cols-5 gap-2">
            {humores.map((h) => (
              <button
                key={h.v}
                onClick={() => setHumor(h.v)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all ${
                  humor === h.v
                    ? "border-nx-evo bg-nx-evo/10 scale-105 shadow-md"
                    : "border-transparent bg-nx-container hover:border-nx-border"
                }`}
              >
                <span className="text-3xl">{h.emoji}</span>
                <span className="text-[10px] text-nx-on-surface-variant leading-tight text-center">{h.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Adesão ao plano */}
        <div>
          <p className="text-nx-on-surface font-semibold mb-1">Quanto você seguiu o plano alimentar?</p>
          <p className="text-nx-on-surface-variant text-xs mb-4">Sem julgamentos — cada semana é uma nova chance! 🌱</p>
          <div className="space-y-2">
            {adesoes.map((a) => (
              <button
                key={a.v}
                onClick={() => setAdesao(a.v)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  adesao === a.v
                    ? `${a.cls} border-current scale-[1.01] shadow-sm`
                    : "border-transparent bg-nx-container text-nx-on-surface-variant hover:border-nx-border"
                }`}
              >
                <span>{a.label}</span>
                {adesao === a.v && <CheckCircle size={16} />}
              </button>
            ))}
          </div>
        </div>

        {/* Peso (opcional) */}
        <div>
          <p className="text-nx-on-surface font-semibold mb-1">Seu peso hoje <span className="text-nx-on-surface-variant font-normal text-sm">(opcional)</span></p>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="ex: 68.5"
              inputMode="decimal"
              className="w-full px-5 py-4 text-xl font-mono-data bg-nx-container border-2 border-nx-border rounded-2xl text-nx-on-surface placeholder-nx-outline focus:outline-none focus:border-nx-evo"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-nx-on-surface-variant font-medium">kg</span>
          </div>
        </div>

        {/* Foto (opcional) */}
        <div>
          <p className="text-nx-on-surface font-semibold mb-1">Foto de progresso <span className="text-nx-on-surface-variant font-normal text-sm">(opcional)</span></p>
          <p className="text-nx-on-surface-variant text-xs mb-3">Acumula histórico visual da sua transformação 📸</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFoto}
            className="hidden"
          />
          {fotoPreview ? (
            <div className="relative">
              <img src={fotoPreview} alt="Preview" className="w-full h-48 object-cover rounded-2xl" />
              <button
                onClick={() => { setFoto(null); setFotoPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full"
              >
                Remover
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-6 border-2 border-dashed border-nx-border rounded-2xl flex flex-col items-center gap-2 text-nx-on-surface-variant hover:border-nx-evo hover:text-nx-evo transition-all bg-nx-container"
            >
              <Camera size={28} />
              <span className="text-sm">Tirar foto ou escolher da galeria</span>
            </button>
          )}
        </div>

        {/* Nota (opcional) */}
        <div>
          <p className="text-nx-on-surface font-semibold mb-1">Mensagem para sua nutricionista <span className="text-nx-on-surface-variant font-normal text-sm">(opcional)</span></p>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="Como foi a semana? Alguma dúvida, dificuldade ou conquista pra compartilhar?"
            className="w-full px-4 py-3 bg-nx-container border-2 border-nx-border rounded-2xl text-sm text-nx-on-surface placeholder-nx-outline resize-none focus:outline-none focus:border-nx-evo"
          />
        </div>

        {error && <p className="text-nx-danger text-sm bg-nx-danger/10 px-4 py-3 rounded-xl">{error}</p>}

        <button
          onClick={enviar}
          disabled={!pronto || loading}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            pronto && !loading
              ? "bg-nx-evo text-nx-on-evo hover:bg-nx-evo-2 shadow-lg shadow-nx-evo/30"
              : "bg-nx-container text-nx-on-surface-variant cursor-not-allowed"
          }`}
        >
          {loading ? "Enviando..." : "Enviar check-in ✓"}
        </button>
      </div>
    </div>
  );
}

// ---------- Celebração View ----------
function CelebracaoView({ streak, ci, onDone }: { streak: number; ci: CheckIn | null; onDone: () => void }) {
  useEffect(() => {
    const fire = (particleRatio: number, opts: object) =>
      confetti({ origin: { y: 0.6 }, colors: ["#7CFF5B", "#70F570", "#53F27C", "#09090B", "#ffffff"], ...opts, particleCount: Math.floor(200 * particleRatio) });

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  const humorObj = humores.find((h) => h.v === ci?.humor);

  return (
    <div className="fixed inset-0 bg-nx-bg flex flex-col items-center justify-center z-50 px-6 text-center">
      <div className="text-8xl mb-4 animate-bounce">🎉</div>
      <h1 className="text-white text-4xl font-bold mb-3">Check-in feito!</h1>
      {streak > 1 && (
        <div className="flex items-center gap-2 bg-nx-container rounded-2xl px-5 py-3 mb-4">
          <span className="text-3xl">🔥</span>
          <p className="text-white text-xl font-bold">{streak} semanas seguidas!</p>
        </div>
      )}
      {streak === 1 && (
        <p className="text-nx-evo text-lg mb-4">🌱 Primeira semana! Você começou incrível.</p>
      )}
      {ci && (
        <div className="bg-nx-container rounded-2xl px-6 py-4 mb-6 space-y-1">
          {humorObj && <p className="text-white text-sm">{humorObj.emoji} Humor: <span className="font-medium">{humorObj.label}</span></p>}
          <p className="text-white text-sm">📋 Adesão ao plano: <span className="font-medium">{ci.adesao}%</span></p>
          {ci.peso && <p className="text-white text-sm">⚖️ Peso: <span className="font-mono-data font-medium">{ci.peso} kg</span></p>}
        </div>
      )}
      <p className="text-nx-outline text-sm">Sua nutricionista vai adorar ver isso!</p>
      <button onClick={onDone} className="mt-8 text-white/40 text-sm hover:text-white/70 transition-colors">
        Voltar ao portal →
      </button>
    </div>
  );
}

// ---------- Anamnese View (multi-step) ----------
function AnamneseView({ link, pacienteNome, onFeito, onBack }: {
  link: string; pacienteNome: string; onFeito: () => void; onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    queixaPrincipal: "", historicoDieta: "", restricoes: "", medicamentos: "", condicoesSaude: "",
    nivelAtividade: "", horasSono: "", nivelEstresse: "",
    refeicoesDia: "", comeCozinha: "", comeForaCasa: "", consumoAgua: "",
    motivacao: "", expectativas: "",
  });

  const steps = [
    {
      titulo: "Queixas e histórico", emoji: "🩺",
      campos: [
        { key: "queixaPrincipal", label: "Qual sua queixa principal?", placeholder: "O que mais te incomoda hoje?", tipo: "textarea" },
        { key: "restricoes", label: "Alergias ou intolerâncias alimentares?", placeholder: "Lactose, glúten, amendoim...", tipo: "textarea" },
        { key: "condicoesSaude", label: "Condições de saúde relevantes?", placeholder: "Diabetes, hipertensão, hipotireoidismo...", tipo: "textarea" },
        { key: "medicamentos", label: "Medicamentos em uso?", placeholder: "Ex: metformina, levotiroxina...", tipo: "textarea" },
      ],
    },
    {
      titulo: "Estilo de vida", emoji: "🏃",
      campos: [
        {
          key: "nivelAtividade", label: "Nível de atividade física", tipo: "select",
          opcoes: [{ v: "", l: "Selecione..." }, { v: "sedentario", l: "Sedentário" }, { v: "leve", l: "Leve (1-2x/semana)" }, { v: "moderado", l: "Moderado (3-4x/semana)" }, { v: "intenso", l: "Intenso (5+x/semana)" }],
        },
        { key: "horasSono", label: "Quantas horas você dorme por noite?", placeholder: "7", tipo: "number" },
        { key: "nivelEstresse", label: "Nível de estresse (1 = baixo, 5 = muito alto)", placeholder: "3", tipo: "number" },
      ],
    },
    {
      titulo: "Hábitos alimentares", emoji: "🥗",
      campos: [
        { key: "refeicoesDia", label: "Quantas refeições você faz por dia?", placeholder: "3", tipo: "number" },
        {
          key: "comeCozinha", label: "Você cozinha em casa?", tipo: "select",
          opcoes: [{ v: "", l: "Selecione..." }, { v: "true", l: "Sim" }, { v: "false", l: "Não" }],
        },
        { key: "comeForaCasa", label: "Quantas vezes come fora de casa por semana?", placeholder: "2", tipo: "number" },
        { key: "consumoAgua", label: "Quantos litros de água bebe por dia?", placeholder: "1.5", tipo: "number" },
      ],
    },
    {
      titulo: "Motivação", emoji: "💪",
      campos: [
        { key: "motivacao", label: "O que te motivou a buscar acompanhamento nutricional?", placeholder: "Conte um pouco...", tipo: "textarea" },
        { key: "expectativas", label: "Quais são suas expectativas com o tratamento?", placeholder: "O que você espera alcançar?", tipo: "textarea" },
      ],
    },
  ];

  async function finalizar() {
    setLoading(true);
    try {
      const body: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        if (!v) continue;
        if (k === "comeCozinha") body[k] = v === "true";
        else if (["horasSono", "nivelEstresse", "refeicoesDia", "comeForaCasa"].includes(k)) body[k] = parseInt(v);
        else if (k === "consumoAgua") body[k] = parseFloat(v);
        else body[k] = v;
      }
      await api.post(`/public/paciente/${link}/anamnese`, body);
      onFeito();
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const s = steps[step];

  return (
    <div className="min-h-screen bg-nx-bg">
      <div className="px-5 pt-8 pb-6">
        <button onClick={step === 0 ? onBack : () => setStep(step - 1)} className="flex items-center gap-2 text-nx-on-surface-variant hover:text-nx-evo mb-6 text-sm">
          <ArrowLeft size={16} />{step === 0 ? "Voltar" : "Anterior"}
        </button>
        <div className="flex items-center gap-2 mb-2">
          <img src="/nexvel-x-512.png" alt="" className="h-[18px] w-auto" />
          <span className="text-white/70 text-sm">Nexvel</span>
        </div>
        <h1 className="text-white text-2xl font-bold">{s.emoji} {s.titulo}</h1>
        <p className="text-nx-on-surface-variant text-sm mt-1">Passo {step + 1} de {steps.length}</p>
        {/* Progress */}
        <div className="flex gap-1.5 mt-3">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-nx-container" : "bg-nx-container"}`} />
          ))}
        </div>
      </div>

      <div className="bg-nx-surface min-h-screen rounded-t-3xl px-5 py-8 space-y-5">
        {s.campos.map((campo) => (
          <div key={campo.key}>
            <label className="text-nx-on-surface font-semibold text-sm block mb-2">{campo.label}</label>
            {campo.tipo === "textarea" ? (
              <textarea
                value={form[campo.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [campo.key]: e.target.value })}
                rows={3}
                placeholder={(campo as any).placeholder}
                className="w-full px-4 py-3 bg-nx-container border-2 border-nx-border rounded-2xl text-sm text-nx-on-surface placeholder-nx-outline resize-none focus:outline-none focus:border-nx-evo"
              />
            ) : campo.tipo === "select" ? (
              <select
                value={form[campo.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [campo.key]: e.target.value })}
                className="w-full px-4 py-3 bg-nx-container border-2 border-nx-border rounded-2xl text-sm text-nx-on-surface focus:outline-none focus:border-nx-evo"
              >
                {(campo as any).opcoes.map((o: { v: string; l: string }) => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                value={form[campo.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [campo.key]: e.target.value })}
                placeholder={(campo as any).placeholder}
                className="w-full px-4 py-3 bg-nx-container border-2 border-nx-border rounded-2xl text-sm text-nx-on-surface placeholder-nx-outline focus:outline-none focus:border-nx-evo"
              />
            )}
          </div>
        ))}

        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="w-full py-4 rounded-2xl bg-nx-evo text-nx-on-evo font-bold text-base hover:bg-nx-evo-2 shadow-lg"
          >
            Próximo →
          </button>
        ) : (
          <button
            onClick={finalizar}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-nx-evo text-nx-on-evo font-bold text-base hover:bg-nx-evo-2 shadow-lg disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Concluir ✓"}
          </button>
        )}

        <p className="text-center text-nx-on-surface-variant text-xs">Seus dados são confidenciais e usados somente pela sua nutricionista.</p>
      </div>
    </div>
  );
}

// ---------- Agendamento View ----------
function AgendamentoView({ link, pacienteNome, nutricionistaNome, onFeito, onBack }: {
  link: string; pacienteNome: string; nutricionistaNome: string; onFeito: () => void; onBack: () => void;
}) {
  const [slots, setSlots] = useState<Array<{ data: string; hora: string; diaSemana: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<{ data: string; hora: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  useEffect(() => {
    api.get(`/public/paciente/${link}/horarios-disponiveis`)
      .then((res) => { setSlots(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [link]);

  async function agendar() {
    if (!selecionado) return;
    setEnviando(true);
    try {
      await api.post(`/public/paciente/${link}/agendar`, selecionado);
      setConcluido(true);
    } catch {
      // silent
    } finally {
      setEnviando(false);
    }
  }

  const slotsPorData: Record<string, Array<{ data: string; hora: string; diaSemana: number }>> = {};
  for (const s of slots) {
    if (!slotsPorData[s.data]) slotsPorData[s.data] = [];
    slotsPorData[s.data].push(s);
  }
  const datas = Object.keys(slotsPorData).sort();

  if (concluido) {
    return (
      <div className="min-h-screen bg-nx-bg flex flex-col items-center justify-center px-6 text-center">
        <span className="text-7xl mb-4">🎉</span>
        <h1 className="text-white text-3xl font-bold mb-2">Consulta solicitada!</h1>
        <p className="text-nx-evo text-lg mb-2">
          {selecionado && (() => {
            const d = new Date(selecionado.data + "T00:00:00");
            return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} às ${selecionado.hora}`;
          })()}
        </p>
        <p className="text-nx-on-surface-variant text-sm mb-8">{nutricionistaNome.split(" ")[0]} irá confirmar em breve.</p>
        <button onClick={onFeito} className="bg-nx-container text-white px-6 py-3 rounded-2xl font-medium hover:bg-nx-container transition-colors">
          Voltar ao portal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nx-bg">
      <div className="px-5 pt-8 pb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-nx-on-surface-variant hover:text-nx-evo mb-6 text-sm">
          <ArrowLeft size={16} />Voltar
        </button>
        <div className="flex items-center gap-2 mb-2">
          <img src="/nexvel-x-512.png" alt="" className="h-[18px] w-auto" />
          <span className="text-white/70 text-sm">Nexvel</span>
        </div>
        <h1 className="text-white text-2xl font-bold">📅 Agendar consulta</h1>
        <p className="text-nx-on-surface-variant text-sm mt-1">Escolha um horário disponível com {nutricionistaNome.split(" ")[0]}</p>
      </div>

      <div className="bg-nx-surface min-h-screen rounded-t-3xl px-5 py-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-nx-container rounded-2xl animate-pulse" />)}
          </div>
        ) : datas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-nx-on-surface-variant font-medium">Nenhum horário disponível no momento.</p>
            <p className="text-nx-on-surface-variant text-sm mt-2">Entre em contato com {nutricionistaNome.split(" ")[0]} pelo WhatsApp.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {datas.map((data) => {
              const d = new Date(data + "T00:00:00");
              const diaSlots = slotsPorData[data];
              return (
                <div key={data}>
                  <p className="text-nx-on-surface font-semibold mb-2">
                    {DIAS[d.getDay()]}, {d.getDate()} de {MESES[d.getMonth()]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {diaSlots.map((s) => {
                      const sel = selecionado?.data === s.data && selecionado?.hora === s.hora;
                      return (
                        <button
                          key={s.hora}
                          onClick={() => setSelecionado({ data: s.data, hora: s.hora })}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            sel
                              ? "bg-nx-evo text-nx-on-evo shadow-md scale-105"
                              : "bg-nx-container text-nx-on-surface border border-nx-border hover:border-nx-evo"
                          }`}
                        >
                          {s.hora}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {selecionado && (
              <div className="bg-nx-evo/10 border border-nx-evo/30 rounded-2xl p-4">
                <p className="text-nx-on-surface font-medium text-sm">
                  Selecionado: {(() => {
                    const d = new Date(selecionado.data + "T00:00:00");
                    return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} às ${selecionado.hora}`;
                  })()}
                </p>
              </div>
            )}

            <button
              onClick={agendar}
              disabled={!selecionado || enviando}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                selecionado && !enviando
                  ? "bg-nx-evo text-nx-on-evo hover:bg-nx-evo-2 shadow-lg"
                  : "bg-nx-container text-nx-on-surface-variant cursor-not-allowed"
              }`}
            >
              {enviando ? "Agendando..." : "Confirmar agendamento ✓"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
