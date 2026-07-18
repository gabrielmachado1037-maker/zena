import {
  LayoutDashboard, Users, Trophy, Award, MessageSquare, ClipboardList, BarChart3, Settings,
  CheckCircle2, ShieldAlert, MessageSquareText, TrendingUp, Target, ArrowRight,
} from "lucide-react";
import Avatar from "../../components/Avatar";
import { NexvelLogo } from "../onboarding/components/NexvelLogo";

/* ── conteúdo ilustrativo (não-funcional), fiel à tela real do dashboard ── */
const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Pacientes" },
  { icon: Trophy, label: "Ligas" },
  { icon: Award, label: "Desafios" },
  { icon: MessageSquare, label: "Mensagens" },
  { icon: ClipboardList, label: "Registros" },
  { icon: BarChart3, label: "Insights" },
  { icon: Settings, label: "Configurações" },
];
const KPIS = [
  { label: "Check-ins hoje", valor: "32", icon: CheckCircle2, tone: "text-white" },
  { label: "Críticos", valor: "4", icon: ShieldAlert, tone: "text-white" },
  { label: "Mensagens", valor: "7", icon: MessageSquareText, tone: "text-white" },
  { label: "Evoluíram", valor: "12", icon: TrendingUp, tone: "text-nx-gold" },
  { label: "Desafios", valor: "5", icon: Target, tone: "text-white" },
];
const RISCO = [
  { nome: "Marina Costa", motivo: "5 dias sem check-in", foto: "https://i.pravatar.cc/80?img=47" },
  { nome: "Ricardo Alves", motivo: "Sequência zerada", foto: "https://i.pravatar.cc/80?img=13" },
  { nome: "Juliana Pires", motivo: "Adesão em queda", foto: "https://i.pravatar.cc/80?img=45" },
];

/** Preview ESTÁTICO do dashboard da nutri (tela do computador) — layout real. */
export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-nx-evo/15 bg-[#0A0C0A]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="flex w-[128px] shrink-0 flex-col justify-between border-r border-white/[0.06] bg-[#080A08] p-3">
          <div>
            <div className="mb-1 px-1"><NexvelLogo className="h-[14px]" /></div>
            <p className="mb-4 px-1 text-[6px] font-semibold uppercase tracking-[0.28em] text-[#6b6b73]">Nutrition Pro</p>
            <nav className="space-y-0.5">
              {NAV.map((n) => (
                <div key={n.label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[9.5px] font-medium ${
                    n.active ? "bg-nx-evo/12 text-nx-evo" : "text-[#8b8b93]"}`}>
                  <n.icon className="size-3" /> {n.label}
                </div>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3">
            <Avatar nome="Ana Paula" tamanho={20} />
            <div className="leading-tight">
              <p className="text-[8.5px] font-semibold text-white">Dra. Ana Paula</p>
              <p className="text-[7px] text-[#8b8b93]">Nutricionista</p>
            </div>
          </div>
        </aside>

        {/* Conteúdo */}
        <div className="min-w-0 flex-1 space-y-3 p-4">
          {/* saudação */}
          <div>
            <h3 className="text-[15px] font-extrabold text-white">Boa tarde, Dra. Ana 👋</h3>
            <p className="mt-0.5 text-[8.5px] text-[#8b8b93]">Hoje, <span className="font-semibold text-white">32</span> de 48 pacientes já registraram · aderência 76% na semana.</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-5 gap-1.5">
            {KPIS.map((k) => (
              <div key={k.label} className="rounded-lg border border-white/[0.06] bg-[#0E120E] p-2">
                <div className="flex items-center justify-between">
                  <p className="truncate text-[6.5px] font-semibold uppercase tracking-wide text-[#8b8b93]">{k.label}</p>
                  <k.icon className="size-2.5 text-[#6b6b73]" />
                </div>
                <p className={`mt-1 text-[17px] font-extrabold leading-none ${k.tone}`}>{k.valor}</p>
              </div>
            ))}
          </div>

          {/* Adesão da clínica */}
          <div className="rounded-lg border border-white/[0.06] bg-[#0E120E] p-3">
            <div className="flex items-center gap-2">
              <p className="text-[8px] font-semibold uppercase tracking-wide text-[#8b8b93]">Adesão da clínica</p>
              <span className="rounded bg-nx-evo/12 px-1.5 py-0.5 text-[7px] font-bold text-nx-evo">Saudável</span>
            </div>
            <div className="mt-1.5 flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[26px] font-extrabold leading-none text-white">76<span className="text-[13px]">%</span></span>
                  <span className="text-[9px] font-bold text-nx-evo">▲ 8 p.p.</span>
                </div>
                <p className="mt-1.5 text-[8px] text-[#8b8b93]">Retenção prevista <span className="font-semibold text-white">82%</span> · sequência viva</p>
              </div>
              <div className="flex items-end gap-3 pr-1">
                {[["Sem. passada", 62, "bg-white/20"], ["Esta semana", 76, "bg-nx-evo"]].map(([l, h, c]) => (
                  <div key={l as string} className="flex flex-col items-center gap-1">
                    <div className="flex h-8 w-3.5 items-end overflow-hidden rounded-sm bg-white/[0.05]">
                      <div className={`w-full rounded-sm ${c}`} style={{ height: `${h}%` }} />
                    </div>
                    <span className="text-[6px] text-[#8b8b93]">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pacientes que precisam de você */}
          <div className="rounded-lg border border-white/[0.06] bg-[#0E120E] p-3">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[9px] font-bold text-white">Pacientes que precisam de você</p>
              <span className="rounded-full bg-white/[0.08] px-1.5 text-[7px] font-bold text-white">4</span>
              <div className="ml-auto flex gap-1 text-[6.5px] font-medium text-[#8b8b93]">
                <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-white">Todos</span>
                <span className="px-1 py-0.5">Em risco</span>
                <span className="px-1 py-0.5">Ativos hoje</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {RISCO.map((r) => (
                <div key={r.nome} className="flex items-center gap-2">
                  <Avatar src={r.foto} nome={r.nome} tamanho={20} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[9px] font-semibold text-white">{r.nome}</p>
                    <p className="truncate text-[7.5px] text-[#8b8b93]">{r.motivo}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-nx-danger/15 px-1.5 py-0.5 text-[7px] font-bold text-nx-danger">Em risco</span>
                  <ArrowRight className="size-2.5 shrink-0 text-[#6b6b73]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
