import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  FILTROS, getRegistrosFeed, validarRegistro, enviarNudge, type FeedData,
} from "../lib/registros";
import FeedFilters from "../components/registros/FeedFilters";
import DaySummary from "../components/registros/DaySummary";
import RecordCard from "../components/registros/RecordCard";
import UrgencyRadar from "../components/registros/UrgencyRadar";
import CommunityGoal from "../components/registros/CommunityGoal";
import AdjustFab from "../components/registros/AdjustFab";

// Tela "Registros Diários" — feed real dos check-ins diários de todos os pacientes.
export default function Feed() {
  const navigate = useNavigate();
  const [data, setData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<Record<string, boolean>>({});
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const carregar = useCallback(async () => {
    try {
      setData(await getRegistrosFeed());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const visiveis = useMemo(() => {
    const registros = data?.registros ?? [];
    const tiposAtivos = FILTROS.filter((f) => filtros[f.id]).map((f) => f.tipo);
    const q = busca.trim().toLowerCase();
    return registros.filter((r) => {
      if (tiposAtivos.length > 0 && !tiposAtivos.includes(r.tipo)) return false;
      if (q && ![r.paciente, r.tipoTexto, r.texto ?? ""].some((s) => s.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [data, busca, filtros]);

  async function onValidar(id: string) {
    setEnviandoId(id);
    try {
      await validarRegistro(id);
      setData((d) => (d ? { ...d, registros: d.registros.map((r) => (r.id === id ? { ...r, revisado: true } : r)) } : d));
    } catch {
      flash("Não foi possível validar o registro.");
    } finally {
      setEnviandoId(null);
    }
  }

  async function onNudge(pacienteId: string) {
    setEnviandoId(pacienteId);
    try {
      await enviarNudge(pacienteId);
      flash("Incentivo enviado ao paciente 💪");
    } catch {
      flash("Falha ao enviar o incentivo.");
    } finally {
      setEnviandoId(null);
    }
  }

  const onAjustar = (pacienteId: string) => navigate(`/app/pacientes/${pacienteId}`);
  const onChat = () => navigate("/app/mensagens");

  return (
    <div className="min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans px-4 md:px-8 py-6 custom-scrollbar">
      {/* Header (título + busca) */}
      <header className="flex items-center gap-4 mb-6 flex-wrap">
        <h2 className="text-headline-md font-bold text-nx-on-surface">Registros Diários</h2>
        <div className="hidden md:flex bg-nx-container-high px-4 py-1.5 rounded-full items-center gap-2 border border-nx-border focus-within:ring-1 focus-within:ring-nx-evo transition-all">
          <Search size={16} className="text-nx-on-surface-variant" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            type="text"
            placeholder="Buscar paciente ou registro..."
            className="bg-transparent border-none focus:ring-0 text-body-sm w-64 placeholder:text-nx-on-surface-variant/50 outline-none"
          />
        </div>
      </header>

      {/* 3 colunas */}
      <div className="flex gap-8">
        {/* Coluna esquerda — filtros */}
        <div className="w-72 flex-shrink-0 space-y-6 hidden lg:block">
          <FeedFilters
            valores={filtros}
            onChange={(id, checked) => setFiltros((s) => ({ ...s, [id]: checked }))}
          />
          <DaySummary registros={data?.resumo.registros ?? 0} alertas={data?.resumo.alertas ?? 0} />
        </div>

        {/* Coluna central — feed */}
        <div className="flex-1 min-w-0 max-w-3xl space-y-6">
          {loading ? (
            <div className="text-center text-body-sm text-nx-on-surface-variant py-16">Carregando registros…</div>
          ) : visiveis.length === 0 ? (
            <div className="text-center text-body-sm text-nx-on-surface-variant py-16">
              {(data?.registros.length ?? 0) === 0
                ? "Nenhum registro dos seus pacientes nos últimos 7 dias."
                : "Nenhum registro corresponde aos filtros."}
            </div>
          ) : (
            visiveis.map((r) => (
              <RecordCard
                key={r.id}
                registro={r}
                onValidar={onValidar}
                onAjustar={onAjustar}
                onNudge={onNudge}
                onChat={onChat}
                enviando={enviandoId === r.id || enviandoId === r.pacienteId}
              />
            ))
          )}
        </div>

        {/* Coluna direita — contexto */}
        <div className="w-80 flex-shrink-0 space-y-6 hidden xl:block">
          <UrgencyRadar alertas={data?.radar ?? []} onNudge={onNudge} />
          <CommunityGoal pct={data?.comunidade.pct ?? 0} deltaSemana={data?.comunidade.deltaSemana ?? 0} />
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 right-8 z-50 bg-nx-container-high border border-nx-border text-nx-on-surface px-5 py-3 rounded-xl shadow-nx-card text-body-sm">
          {toast}
        </div>
      )}

      <AdjustFab onRefresh={() => { setRefreshing(true); void carregar(); }} refreshing={refreshing} />
    </div>
  );
}
