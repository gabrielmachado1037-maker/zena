import {
  LayoutDashboard, Users, Target, MessageSquare, ClipboardList, Settings,
} from "lucide-react";
import Avatar from "../../components/Avatar";
import { NexvelLogo } from "../onboarding/components/NexvelLogo";

/* ── conteúdo ilustrativo (não-funcional), fiel à tela real do app ── */
const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Pacientes" },
  { icon: Target, label: "Desafios" },
  { icon: MessageSquare, label: "Mensagens" },
  { icon: ClipboardList, label: "Medições" },
  { icon: Settings, label: "Configurações" },
];
const METRICAS = [
  { label: "Pacientes", valor: "48", delta: "+12 este mês" },
  { label: "Adesão média", valor: "76%", delta: "+8% este mês" },
  { label: "Riscos", valor: "6", delta: "−2 este mês" },
];
const RISCO = [
  { nome: "Ana Souza", motivo: "5 dias sem check-in" },
  { nome: "Ricardo Alves", motivo: "Sequência zerada" },
  { nome: "Juliana Pires", motivo: "Adesão em queda" },
];
const CHART = [42, 55, 50, 63, 71, 84];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];

/** Preview ESTÁTICO do dashboard da nutri (tela do computador). */
export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-[16px] border border-nx-evo/15 bg-[#0B0F0C]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-[132px] shrink-0 flex-col justify-between border-r border-white/[0.06] bg-[#080B08] p-3 sm:flex">
          <div>
            <div className="mb-5 px-1"><NexvelLogo className="h-[15px]" /></div>
            <nav className="space-y-0.5">
              {NAV.map((n) => (
                <div key={n.label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10.5px] font-medium ${
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
          <h3 className="text-[14px] font-bold text-white">Dashboard</h3>

          {/* métricas */}
          <div className="grid grid-cols-3 gap-2">
            {METRICAS.map((m) => (
              <div key={m.label} className="rounded-lg border border-white/[0.06] bg-[#0E120E] p-2.5">
                <p className="truncate text-[8.5px] text-[#8b8b93]">{m.label}</p>
                <p className="mt-1 text-[22px] font-extrabold leading-none text-white">{m.valor}</p>
                <p className="mt-1.5 text-[8.5px] font-semibold text-nx-evo">{m.delta}</p>
              </div>
            ))}
          </div>

          {/* Evolução da adesão */}
          <div className="rounded-lg border border-white/[0.06] bg-[#0E120E] p-3">
            <p className="mb-2 text-[10px] font-bold text-white">Evolução da adesão</p>
            <MiniChart />
          </div>

          {/* Pacientes em risco */}
          <div className="rounded-lg border border-white/[0.06] bg-[#0E120E] p-3">
            <p className="mb-2 text-[10px] font-bold text-white">Pacientes em risco</p>
            <div className="space-y-1.5">
              {RISCO.map((r) => (
                <div key={r.nome} className="flex items-center gap-2">
                  <Avatar nome={r.nome} tamanho={20} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[9.5px] font-semibold text-white">{r.nome}</p>
                    <p className="truncate text-[8px] text-[#8b8b93]">{r.motivo}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-nx-danger/15 px-1.5 py-0.5 text-[8px] font-bold text-nx-danger">Risco</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniChart() {
  const W = 300, H = 96, padL = 20, padR = 8, padT = 8, padB = 16;
  const max = 100;
  const xs = CHART.map((_, i) => padL + (i * (W - padL - padR)) / (CHART.length - 1));
  const ys = CHART.map((v) => H - padB - (v / max) * (H - padT - padB));
  const line = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${xs[xs.length - 1].toFixed(1)} ${H - padB} L${xs[0].toFixed(1)} ${H - padB} Z`;
  const gridY = [0, 50, 100];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {gridY.map((g) => {
        const y = H - padB - (g / max) * (H - padT - padB);
        return (
          <g key={g}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.6" />
            <text x={2} y={y + 2.5} fill="#8b8b93" fontSize="6.5">{g}%</text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="dpf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7CFF5B" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7CFF5B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#dpf)" />
      <path d={line} fill="none" stroke="#7CFF5B" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.6" fill="#7CFF5B" stroke="#0B0F0C" strokeWidth="1.4" />
      {MESES.map((m, i) => (
        <text key={m} x={xs[i]} y={H - 4} fill="#8b8b93" fontSize="6.5" textAnchor="middle">{m}</text>
      ))}
    </svg>
  );
}
