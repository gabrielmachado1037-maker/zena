import { useMemo, useState } from "react";
import { REGISTROS, FILTROS } from "../lib/registros";
import FeedFilters from "../components/registros/FeedFilters";
import DaySummary from "../components/registros/DaySummary";
import RecordCard from "../components/registros/RecordCard";
import UrgencyRadar from "../components/registros/UrgencyRadar";
import CommunityGoal from "../components/registros/CommunityGoal";
import AdjustFab from "../components/registros/AdjustFab";

// Tela "Registros Diários" — feed de logs clínicos (mock, fiel ao code.html).
export default function Feed() {
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<Record<string, boolean>>({});

  const visiveis = useMemo(() => {
    const tiposAtivos = FILTROS.filter((f) => filtros[f.id]).map((f) => f.tipo);
    const q = busca.trim().toLowerCase();
    return REGISTROS.filter((r) => {
      if (tiposAtivos.length > 0 && !tiposAtivos.includes(r.tipo)) return false;
      if (q && ![r.paciente, r.tipoTexto, r.texto ?? ""].some((s) => s.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [busca, filtros]);

  return (
    <div className="min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans px-4 md:px-8 py-6 custom-scrollbar">
      {/* Header (título + busca) */}
      <header className="flex items-center gap-4 mb-6 flex-wrap">
        <h2 className="text-headline-md font-bold text-nx-primary">Registros Diários</h2>
        <div className="hidden md:flex bg-nx-container-high px-4 py-1.5 rounded-full items-center gap-2 border border-nx-outline-variant focus-within:ring-1 focus-within:ring-nx-primary transition-all">
          <span className="material-symbols-outlined text-nx-on-surface-variant text-sm" data-icon="search">search</span>
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
          <DaySummary />
        </div>

        {/* Coluna central — feed */}
        <div className="flex-1 min-w-0 max-w-3xl space-y-6">
          {visiveis.length === 0 ? (
            <div className="text-center text-body-sm text-nx-on-surface-variant py-16">
              Nenhum registro corresponde aos filtros.
            </div>
          ) : (
            visiveis.map((r) => <RecordCard key={r.id} registro={r} />)
          )}
        </div>

        {/* Coluna direita — contexto */}
        <div className="w-80 flex-shrink-0 space-y-6 hidden xl:block">
          <UrgencyRadar />
          <CommunityGoal />
        </div>
      </div>

      <AdjustFab />
    </div>
  );
}
