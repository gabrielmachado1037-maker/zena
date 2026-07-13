import {
  LayoutDashboard, Users, Trophy, Target, ClipboardList, MessageSquare, BarChart3, Settings, ArrowUp,
} from "lucide-react";
import Avatar from "../../components/Avatar";
import { LeagueEmblem } from "../../components/ui-nx";
import { ProLogo } from "./components/shared";

/* ── dados FAKE (ilustrativo, não-funcional) ── */
const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Pacientes" },
  { icon: Trophy, label: "Ligas" },
  { icon: Target, label: "Desafios" },
  { icon: ClipboardList, label: "Registros" },
  { icon: MessageSquare, label: "Mensagens" },
  { icon: BarChart3, label: "Insights" },
  { icon: Settings, label: "Configurações" },
];
// Cor de identidade de cada liga = matiz dominante da própria arte 3D do emblema
// (lendário roxo, mestre vermelho, diamante azul, ouro, prata, bronze). Usada
// no rótulo E no glow, pra emblema + texto + halo ficarem na mesma cor.
const LIGAS = [
  { nome: "Lendário", cor: "#A855F7", n: 2 },
  { nome: "Mestre", cor: "#F0483E", n: 6 },
  { nome: "Diamante", cor: "#54B3F0", n: 12 },
  { nome: "Ouro", cor: "#F8C84B", n: 34 },
  { nome: "Prata", cor: "#C2C9D2", n: 61 },
  { nome: "Bronze", cor: "#C77B3C", n: 29 },
];
const RISCO = [
  { nome: "Helena Santos", dias: 5 },
  { nome: "Roberto Mendes", dias: 3 },
  { nome: "Juliana Costa", dias: 2 },
  { nome: "Ana Bronze Silva", dias: 2 },
];
const CHART = [28, 40, 38, 52, 58, 70, 86];

/** Preview ESTÁTICO do dashboard da nutri (dentro de um card com glow verde). */
export function DashboardPreview() {
  return (
    <div className="relative">
      {/* glow verde atrás do preview */}
      <div className="pointer-events-none absolute -inset-6 -z-10"
        style={{ background: "radial-gradient(60% 45% at 60% 8%, rgba(124,255,91,0.20), transparent 70%)" }} />

      <div className="overflow-hidden rounded-[18px] border border-nx-evo/20 bg-[#0C100D] shadow-[0_0_60px_-15px_rgba(124,255,91,0.25)]">
        <div className="flex">
          {/* Sidebar */}
          <aside className="flex w-[132px] shrink-0 flex-col justify-between border-r border-white/[0.06] bg-[#0A0D0A] p-3">
            <div>
              <ProLogo size="h-[15px]" className="mb-4 px-1 [&_p]:text-[8px] [&_p]:tracking-[0.2em]" />
              <nav className="space-y-0.5">
                {NAV.map((n) => (
                  <div key={n.label}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium ${
                      n.active ? "bg-nx-evo/12 text-nx-evo" : "text-[#8b8b93]"}`}>
                    <n.icon className="size-3.5" /> {n.label}
                  </div>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3">
              <Avatar nome="Ana Paula" tamanho={22} />
              <div className="leading-tight">
                <p className="text-[9px] font-semibold text-white">Dra. Ana Paula</p>
                <p className="text-[8px] text-[#8b8b93]">Nutricionista</p>
              </div>
            </div>
          </aside>

          {/* Conteúdo */}
          <div className="min-w-0 flex-1 space-y-3 p-4">
            <h3 className="text-[13px] font-bold text-white">Visão geral da clínica</h3>

            {/* 3 métricas */}
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Índice de aderência" valor="86%" delta="6%" sub="vs semana anterior" />
              <Metric label="Pacientes ativos" valor="144" delta="12" sub="vs semana anterior" />
              <Metric label="Em risco" valor="8" sub="Precisam da sua atenção" danger />
            </div>

            {/* Evolução das ligas */}
            <Panel titulo="Evolução das ligas">
              <div className="grid grid-cols-6 gap-1">
                {LIGAS.map((l) => (
                  <div key={l.nome} className="flex flex-col items-center gap-1 text-center">
                    <span style={{ filter: `drop-shadow(0 0 6px ${l.cor}66)` }}>
                      <LeagueEmblem liga={l.nome} size={38} />
                    </span>
                    <span className="text-[8.5px] font-bold leading-none" style={{ color: l.cor }}>{l.nome}</span>
                    <span className="text-[13px] font-extrabold leading-none text-white">{l.n}</span>
                    <span className="text-[7.5px] text-[#8b8b93]">pacientes</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Gráfico + lista de risco */}
            <div className="grid grid-cols-[1.6fr_1fr] gap-2">
              <Panel titulo="Aderência média da clínica">
                <MiniChart />
              </Panel>
              <Panel titulo="Pacientes que precisam da sua atenção">
                <div className="space-y-1.5">
                  {RISCO.map((r) => (
                    <div key={r.nome} className="flex items-center gap-1.5">
                      <Avatar nome={r.nome} tamanho={18} />
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-[9px] font-semibold text-white">{r.nome}</p>
                        <p className="text-[8px] font-medium text-nx-danger">{r.dias} dias sem check-in</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 rounded-md border border-white/10 py-1 text-center text-[8.5px] font-semibold text-[#A1A1AA]">Ver todos</div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, valor, delta, sub, danger }: { label: string; valor: string; delta?: string; sub: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#111311] p-2.5">
      <p className="truncate text-[8.5px] text-[#8b8b93]">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className={`text-[19px] font-extrabold leading-none ${danger ? "text-nx-danger" : "text-white"}`}>{valor}</span>
        {delta && <span className="flex items-center text-[8.5px] font-bold text-nx-evo"><ArrowUp className="size-2.5" />{delta}</span>}
      </div>
      <p className="mt-1 text-[7.5px] text-[#8b8b93]">{sub}</p>
    </div>
  );
}

function Panel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#111311] p-2.5">
      <p className="mb-2 text-[9.5px] font-bold text-white">{titulo}</p>
      {children}
    </div>
  );
}

function MiniChart() {
  const W = 220, H = 92, pad = 18;
  const max = 100;
  const xs = CHART.map((_, i) => pad + (i * (W - pad - 6)) / (CHART.length - 1));
  const ys = CHART.map((v) => H - 12 - (v / max) * (H - 24));
  const line = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${xs[xs.length - 1].toFixed(1)} ${H - 12} L${xs[0].toFixed(1)} ${H - 12} Z`;
  const gridY = [0, 25, 50, 75, 100];
  const datas = ["01/07", "02/07", "03/07", "04/07", "05/07", "06/07", "07/07"];
  return (
    <div className="flex gap-2">
      <svg viewBox={`0 0 ${W} ${H + 12}`} className="min-w-0 flex-1">
        {gridY.map((g) => {
          const y = H - 12 - (g / max) * (H - 24);
          return (
            <g key={g}>
              <line x1={pad} y1={y} x2={W - 6} y2={y} stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.6" />
              <text x={2} y={y + 2.5} fill="#8b8b93" fontSize="6">{g}%</text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="af" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7CFF5B" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7CFF5B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#af)" />
        <path d={line} fill="none" stroke="#7CFF5B" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        {xs.map((x, i) => i === xs.length - 1 && (
          <circle key={i} cx={x} cy={ys[i]} r="2.4" fill="#7CFF5B" stroke="#0C100D" strokeWidth="1.2" />
        ))}
        {datas.map((d, i) => (
          <text key={d} x={xs[i]} y={H + 6} fill="#8b8b93" fontSize="5.4" textAnchor="middle">{d}</text>
        ))}
      </svg>
      <div className="shrink-0 self-start text-right">
        <p className="text-[16px] font-extrabold leading-none text-white">86%</p>
        <p className="flex items-center justify-end text-[8px] font-bold text-nx-evo"><ArrowUp className="size-2.5" />6%</p>
        <p className="text-[7px] text-[#8b8b93]">vs semana<br />anterior</p>
      </div>
    </div>
  );
}
