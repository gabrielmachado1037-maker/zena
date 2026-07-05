// Fonte única de verdade do Centro de Relatórios no client.
// Tipos da resposta de GET /api/relatorios + derivação/formatação dos KPIs.
// Consumido igualmente pelos layouts desktop e mobile — a UI só renderiza.

export type Periodo = "semanal" | "mensal";

export interface RelatoriosResp {
  periodo: Periodo;
  kpis: {
    adesaoMedia: number | null;   // média de CheckIn.adesao (1–10) no período; null = sem amostra
    adesaoAmostra: number;        // qtd de check-ins considerados
    retencao30: number;           // %
    pacientesAtivos: number;
    consultasMes: number;
  };
  distribuicaoLigas: { liga: string; count: number; cor: string }[];  // cumulativo
  engajamentoMensal: { label: string; pct: number }[];                // 6 meses
}

export interface KpiView {
  key: string;
  label: string;
  /** valor já formatado; null = "Sem dados ainda" */
  value: string | null;
  /** rótulo auxiliar sob o número (ex.: "de 10", "últimos 30 dias") */
  hint?: string;
  tone: "primary" | "tertiary" | "secondary" | "neutral";
}

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Deriva os 4 KPIs do topo a partir da resposta bruta — mesma lógica p/ web e mobile. */
export function derivarKpis(r: RelatoriosResp | null, periodo: Periodo): KpiView[] {
  const k = r?.kpis;
  const janela = periodo === "semanal" ? "na semana" : "no mês";
  return [
    {
      key: "adesao",
      label: "Adesão Média",
      value: k && k.adesaoMedia != null ? nf.format(k.adesaoMedia) : null,
      hint: k && k.adesaoMedia != null ? `de 10 · ${k.adesaoAmostra} check-ins ${janela}` : undefined,
      tone: "tertiary",
    },
    {
      key: "retencao",
      label: "Taxa de Retenção",
      value: k ? `${k.retencao30}%` : null,
      hint: "últimos 30 dias",
      tone: "primary",
    },
    {
      key: "ativos",
      label: "Pacientes Ativos",
      value: k ? String(k.pacientesAtivos) : null,
      tone: "neutral",
    },
    {
      key: "consultas",
      label: "Consultas do Mês",
      value: k ? String(k.consultasMes) : null,
      hint: "no mês atual",
      tone: "secondary",
    },
  ];
}

/** Distribuição por liga com contagem > 0, já com o total para % de legenda. */
export function ligasComDados(r: RelatoriosResp | null) {
  const data = (r?.distribuicaoLigas ?? []).filter((d) => d.count > 0);
  const total = data.reduce((s, d) => s + d.count, 0);
  return { data, total: total || 1, vazio: data.length === 0 };
}

export const TONE_TEXT: Record<KpiView["tone"], string> = {
  primary: "text-nx-primary",
  tertiary: "text-nx-tertiary",
  secondary: "text-nx-secondary",
  neutral: "text-nx-on-surface",
};
