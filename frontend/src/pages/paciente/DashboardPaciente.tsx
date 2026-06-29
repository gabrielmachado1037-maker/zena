import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Flame, Trophy } from "lucide-react";
import api from "../../lib/api";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";
import { tempoRelativo, type FeedPost } from "../Feed";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface MeData {
  nome: string;
  objetivo: string;
  pesoMeta: number | null;
  fotoUrl: string | null;
  medicoes: { peso: number; data: string }[];
  primeiroMedicao: { peso: number; data: string } | null;
  nutricionista: { nome: string; nomeConsultorio: string | null };
}

interface RankingData {
  ranking: { posicao: number; euMesmo: boolean; diasConsecutivosHabitos?: number }[];
  minhaPosicao: { posicao: number; diasConsecutivosHabitos?: number } | null;
}

interface PlanoAlimentar {
  cafeManha: string;
  lancheManha?: string | null;
  almoco: string;
  lancheTarde?: string | null;
  jantar: string;
  ceia?: string | null;
}

interface Pagamento {
  planoCobranca: { valor: number; periodicidade: string; diaVencimento: number; ativo: boolean } | null;
  cobrancas: { id: string; valor: number; vencimento: string; status: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SHADOW = "0 2px 10px rgba(0,0,0,0.05)";
const CARD   = "bg-white rounded-[20px] p-5";

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diasParaProxVenc(dia: number) {
  const hoje = new Date();
  let d = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
  if (d <= hoje) d = new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
  return Math.ceil((d.getTime() - hoje.getTime()) / 86400000);
}

function SkeletonCard({ h = 120 }: { h?: number }) {
  return <div className="rounded-[20px] bg-white animate-pulse" style={{ height: h, boxShadow: SHADOW }} />;
}

// ─── Card Meta de Peso ────────────────────────────────────────────────────────

function CardMeta({ me }: { me: MeData }) {
  const pesoAtual   = me.medicoes[0]?.peso;
  const pesoInicial = me.primeiroMedicao?.peso;
  const pesoMeta    = me.pesoMeta;

  if (!pesoMeta || !pesoAtual) {
    return (
      <div className={CARD} style={{ boxShadow: SHADOW }}>
        <p className="text-[13px] text-[#999] mb-2">Sua meta</p>
        <p className="text-[14px] font-semibold text-[#1B4332]">{me.objetivo}</p>
        <p className="text-[12px] text-[#bbb] mt-1">Aguardando sua primeira medição.</p>
      </div>
    );
  }

  const diff  = Math.abs(pesoMeta - (pesoInicial ?? pesoAtual));
  const done  = Math.abs(pesoAtual - (pesoInicial ?? pesoAtual));
  const pct   = diff > 0 ? Math.min(100, Math.round((done / diff) * 100)) : 100;
  const falta = Math.max(0, Math.abs(pesoAtual - pesoMeta)).toFixed(1);

  return (
    <div className={CARD} style={{ boxShadow: SHADOW }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] text-[#999]">Sua meta</span>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: "#D1FAE5", color: "#1B4332" }}>
          {pct}% atingida
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-[28px] font-bold text-[#111] tabular-nums">{pesoAtual}kg</span>
        <ArrowRight size={18} className="text-[#bbb]" />
        <span className="text-[20px] font-semibold tabular-nums" style={{ color: "#52B788" }}>{pesoMeta}kg</span>
      </div>

      <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "#E5E7EB" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: "#1B4332" }} />
      </div>

      <div className="flex justify-between text-[11px] text-[#999]">
        <span>Início: {pesoInicial ?? "—"}kg</span>
        <span>{pct < 100 ? `Faltam ${falta}kg` : "🎉 Meta atingida!"}</span>
      </div>
    </div>
  );
}

// ─── Card Stats ───────────────────────────────────────────────────────────────

function CardStats({ rankingData }: { rankingData: RankingData | null }) {
  const minha = rankingData?.minhaPosicao;
  const posicao = minha?.posicao ?? null;
  const streak  = (minha as any)?.diasConsecutivosHabitos ?? 0;

  return (
    <div className={CARD} style={{ boxShadow: SHADOW }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] text-[#999] mb-2">Sequência atual</p>
          <div className="flex items-end gap-1.5">
            <Flame size={22} style={{ color: streak >= 3 ? "#F97316" : "#bbb" }} />
            <span className="text-[26px] font-bold text-[#111] leading-none tabular-nums">{streak}</span>
            <span className="text-[13px] text-[#999] mb-0.5">dias</span>
          </div>
          <p className="text-[11px] mt-1.5 font-medium" style={{ color: "#52B788" }}>
            {streak === 0 ? "Comece hoje!" : streak >= 7 ? "Incrível! 🔥" : "Continue assim!"}
          </p>
        </div>

        <div className="border-l border-[#F0F0EE] pl-4">
          <p className="text-[11px] text-[#999] mb-2">Posição no ranking</p>
          <div className="flex items-end gap-1.5">
            <Trophy size={22} style={{ color: posicao && posicao <= 3 ? "#FFB900" : "#bbb" }} />
            <span className="text-[26px] font-bold text-[#111] leading-none tabular-nums">
              {posicao ? `#${posicao}` : "—"}
            </span>
          </div>
          <p className="text-[11px] mt-1.5 font-medium" style={{ color: "#52B788" }}>
            {posicao === 1 ? "Líder! 🏆" : posicao ? "do consultório" : "Sem dados ainda"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Card Plano Alimentar ─────────────────────────────────────────────────────

const REFEICOES = [
  { key: "cafeManha"  as const, label: "Café da manhã", emoji: "☕", bg: "#FEF3C7", color: "#B45309" },
  { key: "almoco"     as const, label: "Almoço",         emoji: "🥗", bg: "#DCFCE7", color: "#166534" },
  { key: "jantar"     as const, label: "Jantar",          emoji: "🍽️", bg: "#EDE9FE", color: "#6D28D9" },
];

function CardPlano({ plano, navigate }: { plano: PlanoAlimentar | null; navigate: (p: string) => void }) {
  return (
    <div className={CARD} style={{ boxShadow: SHADOW }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[14px] font-bold text-[#111]">Plano alimentar de hoje</p>
        {plano && (
          <button onClick={() => navigate("/app/planos-alimentares")}
            className="text-[12px] font-semibold flex items-center gap-0.5"
            style={{ color: "#1B4332" }}>
            ver completo <ArrowRight size={12} />
          </button>
        )}
      </div>

      {!plano ? (
        <div className="py-4 text-center">
          <p className="text-[14px] font-medium text-[#999]">Plano não configurado.</p>
          <p className="text-[12px] text-[#bbb] mt-1">Sua nutricionista criará seu plano em breve.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {REFEICOES.map(r => {
            const desc = plano[r.key];
            return (
              <div key={r.key} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[18px]"
                  style={{ background: r.bg }}>
                  {r.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#555]">{r.label}</p>
                  <p className="text-[13px] text-[#111] leading-snug line-clamp-2">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Card Pagamento ───────────────────────────────────────────────────────────

function CardPagamento({ pag, navigate }: { pag: Pagamento | null; navigate: ReturnType<typeof useNavigate> }) {
  const plano = pag?.planoCobranca;
  const pendente = pag?.cobrancas.find(c => c.status === "pendente");
  const vencido  = pag?.cobrancas.find(c => c.status === "vencido");

  if (!plano) return (
    <div className={CARD} style={{ boxShadow: SHADOW }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[14px] font-bold text-[#111]">Pagamento</p>
        <button onClick={() => navigate("/paciente/pagamentos")}
          className="text-[12px] font-medium" style={{ color: "#1B4332" }}>
          Ver histórico →
        </button>
      </div>
      <p className="text-[13px] text-[#999]">Nenhum plano configurado.</p>
    </div>
  );

  const dias     = diasParaProxVenc(plano.diaVencimento);
  const periodo  = plano.periodicidade === "mensal" ? "mês"
    : plano.periodicidade === "trimestral" ? "trimestre" : "ano";
  const emDia    = !pendente && !vencido;

  return (
    <div className="rounded-[20px] p-5 text-white overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)",
        boxShadow: SHADOW,
      }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "rgba(255,255,255,0.6)" }}>
            Meu plano
          </p>
          <p className="text-[30px] font-bold tabular-nums leading-tight">{fmtMoney(plano.valor)}</p>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.65)" }}>por {periodo}</p>
        </div>
        {emDia ? (
          <span className="px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: "#52B788", color: "#fff" }}>
            ✅ Em dia
          </span>
        ) : vencido ? (
          <span className="px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: "#FEE2E2", color: "#DC2626" }}>
            ❌ Vencido
          </span>
        ) : (
          <span className="px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: "#FEF3C7", color: "#B45309" }}>
            ⏳ Pendente
          </span>
        )}
      </div>

      <div className="border-t pt-4 flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.15)" }}>
        <div>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>Vencimento</p>
          <p className="text-[14px] font-bold">Todo dia {plano.diaVencimento}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "#52B788" }}>
            <span className="text-[13px] font-bold text-white">em {dias}d</span>
          </div>
          <button onClick={() => navigate("/paciente/pagamentos")}
            className="text-[12px] font-semibold"
            style={{ color: "rgba(255,255,255,0.75)" }}>
            Ver histórico →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Prévia do Feed ──────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = { REFEICAO: "🍽️", TREINO: "💪", MOMENTO: "✨" };
const CAT_COLOR: Record<string, string> = { REFEICAO: "#DCFCE7", TREINO: "#FEF3C7", MOMENTO: "#F3E8FF" };

function CardFeed({ posts, navigate }: { posts: FeedPost[]; navigate: (p: string) => void }) {
  return (
    <div className={CARD} style={{ boxShadow: SHADOW }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[14px] font-bold text-[#111]">Prévia do Feed</p>
        <button onClick={() => navigate("/paciente/feed")}
          className="text-[12px] font-semibold flex items-center gap-0.5"
          style={{ color: "#1B4332" }}>
          ver tudo <ArrowRight size={12} />
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-[13px] text-[#bbb] text-center py-4">Nenhuma publicação ainda.</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {posts.map(post => (
            <div key={post.id} onClick={() => navigate("/paciente/feed")}
              className="flex-shrink-0 w-28 cursor-pointer"
              style={{ WebkitTapHighlightColor: "transparent" }}>
              {post.fotoUrl ? (
                <div className="w-28 h-20 rounded-2xl overflow-hidden mb-2">
                  <img src={post.fotoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-28 h-20 rounded-2xl flex items-center justify-center mb-2 text-[28px]"
                  style={{ background: CAT_COLOR[post.categoria] ?? "#F5F5F3" }}>
                  {CAT_EMOJI[post.categoria] ?? "✨"}
                </div>
              )}
              <p className="text-[11px] font-semibold text-[#111] truncate">{post.paciente.nome.split(" ")[0]}</p>
              <p className="text-[10px] text-[#999]">{tempoRelativo(post.criadoEm)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function DashboardPaciente() {
  const { token } = usePacienteAuth();
  const navigate  = useNavigate();

  const [me,      setMe]      = useState<MeData | null>(null);
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [plano,   setPlano]   = useState<PlanoAlimentar | null>(null);
  const [pag,     setPag]     = useState<Pagamento | null>(null);
  const [feed,    setFeed]    = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.allSettled([
      api.get<MeData>("/paciente-app/me",                              { headers: authHeader }),
      api.get<RankingData>("/paciente-app/ranking?periodo=semanal",    { headers: authHeader }),
      api.get<{ plano: PlanoAlimentar | null }>("/paciente-app/plano-alimentar", { headers: authHeader }),
      api.get<Pagamento>("/paciente-app/pagamentos",                    { headers: authHeader }),
      api.get<FeedPost[]>("/paciente-app/feed",                        { headers: authHeader }),
    ]).then(([r1, r2, r3, r4, r5]) => {
      if (r1.status === "fulfilled") setMe(r1.value.data);
      if (r2.status === "fulfilled") setRanking(r2.value.data);
      if (r3.status === "fulfilled") setPlano(r3.value.data.plano);
      if (r4.status === "fulfilled") setPag(r4.value.data);
      if (r5.status === "fulfilled") setFeed(r5.value.data.slice(0, 6));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="pt-4 pb-4 px-4 space-y-3">
        <SkeletonCard h={120} />
        <SkeletonCard h={100} />
        <SkeletonCard h={160} />
        <SkeletonCard h={130} />
        <SkeletonCard h={140} />
      </div>
    );
  }

  return (
    <div className="pt-4 pb-4 px-4 space-y-3">
      {me    && <CardMeta me={me} />}
      <CardStats rankingData={ranking} />
      <CardPlano plano={plano} navigate={navigate} />
      <CardPagamento pag={pag} navigate={navigate} />
      <CardFeed posts={feed} navigate={navigate} />
      <div className="h-1" />
    </div>
  );
}
