/**
 * Motor de insights automáticos da nutri — deriva leituras prontas dos registros
 * que o app JÁ tem (sem backend, sem IA). Puro: não importa React.
 *
 * Insights: último check-in, sequência, maior dificuldade (refeição/hábito),
 * maior risco (dia da semana), tendência (7d vs 7d), ponto forte.
 */

export type InsightTone = "risco" | "atencao" | "positivo" | "neutro";
export type InsightCategoria =
  | "checkin" | "sequencia" | "refeicao" | "dia_semana" | "tendencia" | "forte";

export interface Insight {
  id: InsightCategoria;
  tone: InsightTone;
  titulo: string;
  texto: string;
}

export interface RegistroInsight {
  data: string; // ISO (date)
  alimentacaoOk: boolean;
  treinoOk: boolean;
  aguaOk: boolean;
  sonoOk: boolean;
  cafeOk?: boolean | null;
  almocoOk?: boolean | null;
  lancheOk?: boolean | null;
  jantarOk?: boolean | null;
}

export interface PacienteInsight {
  streakAtual: number;
  streakMaximo: number;
  ultimoCheckin: string | null;
}

const SEVERIDADE: Record<InsightTone, number> = { risco: 0, atencao: 1, neutro: 2, positivo: 3 };

const REFS = [
  { key: "cafeOk", label: "Café da manhã" },
  { key: "almocoOk", label: "Almoço" },
  { key: "lancheOk", label: "Lanche da tarde" },
  { key: "jantarOk", label: "Jantar" },
] as const;

const HABITOS = [
  { key: "alimentacaoOk", label: "Alimentação" },
  { key: "treinoOk", label: "Treino" },
  { key: "aguaOk", label: "Água" },
  { key: "sonoOk", label: "Sono" },
] as const;

const NOMES_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Dia da semana local a partir de "YYYY-MM-DD" (evita shift de fuso). */
function diaSemana(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Aderência de um registro = fração dos 4 hábitos cumpridos (0..1). */
function aderencia(r: RegistroInsight): number {
  return (Number(r.alimentacaoOk) + Number(r.treinoOk) + Number(r.aguaOk) + Number(r.sonoOk)) / 4;
}

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((hoje.getTime() - d.getTime()) / 86_400_000);
}

const media = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);

export function gerarInsights(
  registrosRaw: RegistroInsight[],
  paciente: PacienteInsight,
): Insight[] {
  const regs = [...registrosRaw].sort((a, b) => (a.data < b.data ? 1 : -1));
  const janela = regs.slice(0, 30);
  const out: Insight[] = [];

  // 1) Último check-in ────────────────────────────────────────────────
  const dias = diasDesde(paciente.ultimoCheckin);
  if (dias == null) {
    out.push({ id: "checkin", tone: "atencao", titulo: "Último check-in", texto: "Nunca registrou" });
  } else if (dias >= 4) {
    out.push({ id: "checkin", tone: "risco", titulo: "Último check-in", texto: `Há ${dias} dias — risco de abandono` });
  } else if (dias >= 2) {
    out.push({ id: "checkin", tone: "atencao", titulo: "Último check-in", texto: `Há ${dias} dias` });
  } else {
    out.push({ id: "checkin", tone: "positivo", titulo: "Último check-in", texto: dias === 0 ? "Hoje — em dia" : "Ontem — em dia" });
  }

  // 2) Sequência ───────────────────────────────────────────────────────
  if (paciente.streakAtual === 0 && paciente.streakMaximo > 0) {
    out.push({ id: "sequencia", tone: "atencao", titulo: "Sequência", texto: `Quebrada · recorde de ${paciente.streakMaximo} dias` });
  } else if (paciente.streakAtual >= 3) {
    out.push({ id: "sequencia", tone: "positivo", titulo: "Sequência", texto: `${paciente.streakAtual} dias seguidos 🔥` });
  }

  // 3) Maior dificuldade — por refeição (fallback: por hábito) ──────────
  const comRefeicao = janela.filter((r) => REFS.some((f) => r[f.key] != null));
  if (comRefeicao.length >= 5) {
    const linhas = REFS.map((f) => {
      const comDado = comRefeicao.filter((r) => r[f.key] != null);
      const cumpridas = comDado.filter((r) => r[f.key]).length;
      return { label: f.label, pct: comDado.length ? Math.round((cumpridas / comDado.length) * 100) : 100 };
    });
    const pior = linhas.reduce((a, b) => (a.pct <= b.pct ? a : b));
    const melhor = linhas.reduce((a, b) => (a.pct >= b.pct ? a : b));
    if (pior.pct < 80) {
      out.push({
        id: "refeicao",
        tone: pior.pct < 50 ? "risco" : "atencao",
        titulo: "Maior dificuldade",
        texto: `${pior.label} — cumprido ${pior.pct}% das vezes`,
      });
    }
    if (melhor.pct >= 85) {
      out.push({ id: "forte", tone: "positivo", titulo: "Ponto forte", texto: `${melhor.label} — ${melhor.pct}% de adesão` });
    }
  } else if (janela.length >= 5) {
    // sem detalhe de refeição ainda → cai no nível do hábito
    const linhas = HABITOS.map((h) => ({
      label: h.label,
      pct: Math.round((janela.filter((r) => r[h.key]).length / janela.length) * 100),
    }));
    const pior = linhas.reduce((a, b) => (a.pct <= b.pct ? a : b));
    if (pior.pct < 70) {
      out.push({
        id: "refeicao",
        tone: pior.pct < 45 ? "risco" : "atencao",
        titulo: "Maior dificuldade",
        texto: `${pior.label} — ${pior.pct}% de adesão`,
      });
    }
  }

  // 4) Maior risco — dia da semana (fim de semana vs dias úteis) ────────
  if (janela.length >= 7) {
    const porDia = new Map<number, number[]>();
    for (const r of janela) {
      const dow = diaSemana(r.data);
      (porDia.get(dow) ?? porDia.set(dow, []).get(dow)!).push(aderencia(r));
    }
    const fds = [...(porDia.get(0) ?? []), ...(porDia.get(6) ?? [])];
    const uteis = [1, 2, 3, 4, 5].flatMap((d) => porDia.get(d) ?? []);
    if (fds.length >= 2 && uteis.length >= 2 && media(fds) < media(uteis) * 0.8) {
      const queda = Math.round((1 - media(fds) / media(uteis)) * 100);
      out.push({ id: "dia_semana", tone: "atencao", titulo: "Maior risco", texto: `Fim de semana — adesão cai ${queda}%` });
    } else {
      // pior dia isolado, se destoa bastante da média geral
      const geral = media(janela.map(aderencia));
      let pior: { dow: number; avg: number } | null = null;
      for (const [dow, vals] of porDia) {
        if (vals.length < 2) continue;
        const avg = media(vals);
        if (!pior || avg < pior.avg) pior = { dow, avg };
      }
      if (pior && geral > 0 && pior.avg < geral * 0.75) {
        out.push({ id: "dia_semana", tone: "atencao", titulo: "Maior risco", texto: `${NOMES_DIA[pior.dow]} é o dia mais fraco` });
      }
    }
  }

  // 5) Tendência — últimos 7 dias vs 7 anteriores ──────────────────────
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ms = hoje.getTime();
  const dentro = (r: RegistroInsight, a: number, b: number) => {
    const d = diasDesde(r.data);
    return d != null && d >= a && d < b;
  };
  const rec = janela.filter((r) => dentro(r, 0, 7)).map(aderencia);
  const ant = janela.filter((r) => dentro(r, 7, 14)).map(aderencia);
  void ms;
  if (rec.length >= 2 && ant.length >= 2) {
    const delta = media(rec) - media(ant);
    if (delta <= -0.12) out.push({ id: "tendencia", tone: "atencao", titulo: "Tendência", texto: "Caindo nas últimas semanas ↓" });
    else if (delta >= 0.12) out.push({ id: "tendencia", tone: "positivo", titulo: "Tendência", texto: "Melhorando ↑" });
  }

  return out.sort((a, b) => SEVERIDADE[a.tone] - SEVERIDADE[b.tone]);
}
