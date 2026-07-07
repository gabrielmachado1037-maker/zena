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
  dificuldadeRefeicoes: DificuldadeRefeicao[];                         // por refeição no período
  refeicoesBreakdown: RefeicaoBreakdown[];                             // Seguiu/Adaptou/Pulou por refeição
  piorRefeicao: { refeicao: string; label: string; pct: number } | null;
  pacientesRisco: PacienteRisco[];                                     // quem está escorregando
  riscoResumo: { emRisco: number; total: number };                    // risco de saída (inativos ≥4d)
  habitos: HabitoAd[];                                                 // adesão por hábito no período
  diasSemana: DiaSemana[];                                            // adesão por dia da semana (7)
}

export interface PacienteRisco {
  id: string;
  nome: string;
  avatarUrl: string | null;
  dias: number | null;          // dias sem check-in; null = nunca
  motivo: string;
  tone: "risco" | "atencao";
}

export interface HabitoAd {
  id: string;
  label: string;
  pct: number | null;
  amostra: number;
}

export interface DiaSemana {
  dow: number;
  label: string;
  pct: number | null;
  amostra: number;
}

export interface DificuldadeRefeicao {
  refeicao: string;
  label: string;
  cumpridas: number;
  total: number;         // dias com detalhe registrado
  pct: number | null;    // null = sem amostra
}

export interface RefeicaoBreakdown {
  refeicao: string;
  label: string;
  seguiu: number | null;
  adaptou: number | null;
  pulou: number | null;
  amostra: number;
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

/* ───────── Insights: derivações ───────── */

const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);

/** Hábito com menor adesão (o "mais difícil"). null se não há amostra. */
export function piorHabito(habitos: HabitoAd[]): HabitoAd | null {
  const com = habitos.filter((h) => h.pct != null);
  return com.length ? com.reduce((a, b) => ((a.pct as number) <= (b.pct as number) ? a : b)) : null;
}

const DOW_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Leitura de "dias críticos": fim de semana vs úteis, ou o pior dia isolado. */
export function diaCritico(dias: DiaSemana[]): { headline: string | null; pior: DiaSemana | null } {
  const com = dias.filter((d) => d.pct != null && d.amostra >= 1);
  if (com.length < 2) return { headline: null, pior: null };

  const fds = dias.filter((d) => (d.dow === 0 || d.dow === 6) && d.pct != null && d.amostra >= 1).map((d) => d.pct as number);
  const uteis = dias.filter((d) => d.dow >= 1 && d.dow <= 5 && d.pct != null && d.amostra >= 1).map((d) => d.pct as number);

  if (fds.length && uteis.length && avg(fds) < avg(uteis) * 0.85) {
    const queda = Math.round((1 - avg(fds) / avg(uteis)) * 100);
    const pior = com.reduce((a, b) => ((a.pct as number) <= (b.pct as number) ? a : b));
    return { headline: `Fim de semana: adesão cai ${queda}% vs. dias úteis`, pior };
  }

  const pior = com.reduce((a, b) => ((a.pct as number) <= (b.pct as number) ? a : b));
  const geral = avg(com.map((d) => d.pct as number));
  if (geral > 0 && (pior.pct as number) < geral * 0.85) {
    return { headline: `${DOW_FULL[pior.dow]} é o dia mais fraco da carteira`, pior };
  }
  return { headline: "Adesão estável ao longo da semana", pior: null };
}
