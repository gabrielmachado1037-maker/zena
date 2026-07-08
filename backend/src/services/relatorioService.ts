import prisma from "../lib/prisma";
import { resolverAguaMetaMl, resolverSonoMetaHoras } from "../config/ligas";

// ─────────────────────────────────────────────────────────────────────────────
// Relatório do paciente por intervalo livre (ex.: ciclo 15→15 escolhido pela nutri).
// Motor 100% determinístico (grátis, offline, nunca erra número) + camada de IA
// OPCIONAL que só reescreve os mesmos dados em "voz de nutricionista". Nunca inventa
// dado: a IA recebe as métricas já calculadas; se falhar, cai nos insights por regra.
// Somente LEITURA — nenhuma migration, nenhuma escrita.
// ─────────────────────────────────────────────────────────────────────────────

const DIA = 86_400_000;
const STATUS_REF = ["seguiu", "adaptou", "comeu_mal", "pulou"] as const;
type StatusRef = (typeof STATUS_REF)[number];

const PLANO_PADRAO = [
  { key: "cafe", label: "Café da manhã" },
  { key: "almoco", label: "Almoço" },
  { key: "lanche", label: "Lanche" },
  { key: "jantar", label: "Jantar" },
];

interface RegistroLite {
  data: Date;
  refeicoesStatus: unknown;
  cafeStatus: string | null; almocoStatus: string | null;
  lancheStatus: string | null; jantarStatus: string | null;
  refeicoesNotas: unknown;
  treinoStatus: string | null; treinoMotivo: string | null;
  sonoHoras: number | null;
  aguaMl: number | null; aguaMetaMl: number | null;
  humor: string | null;
  descricao: string | null;
}

const primeiroNome = (nome: string) => nome.split(" ")[0] || nome;
const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

/** Estado das refeições de um registro (refeicoesStatus como fonte da verdade, com
 *  fallback para as colunas legadas cafeStatus…jantarStatus de registros antigos). */
function statusDasRefeicoes(reg: RegistroLite, planoKeys: string[]): Record<string, StatusRef | null> {
  const rs =
    reg.refeicoesStatus && typeof reg.refeicoesStatus === "object"
      ? (reg.refeicoesStatus as Record<string, unknown>)
      : { cafe: reg.cafeStatus, almoco: reg.almocoStatus, lanche: reg.lancheStatus, jantar: reg.jantarStatus };
  const out: Record<string, StatusRef | null> = {};
  for (const k of planoKeys) {
    const v = rs[k];
    out[k] = typeof v === "string" && (STATUS_REF as readonly string[]).includes(v) ? (v as StatusRef) : null;
  }
  return out;
}

/** Agrupa textos livres (motivos) por forma normalizada, retornando os mais frequentes. */
function agruparMotivos(textos: string[], limite = 4): Array<{ motivo: string; vezes: number }> {
  const mapa = new Map<string, { motivo: string; vezes: number }>();
  for (const t of textos) {
    const limpo = t.trim();
    if (!limpo) continue;
    const chave = limpo.toLowerCase();
    const atual = mapa.get(chave);
    if (atual) atual.vezes += 1;
    else mapa.set(chave, { motivo: limpo, vezes: 1 });
  }
  return [...mapa.values()].sort((a, b) => b.vezes - a.vezes).slice(0, limite);
}

export interface RelatorioMensal {
  paciente: { id: string; nome: string; telefone: string | null };
  periodo: { inicio: string; fim: string; dias: number };
  resumo: { diasRegistrados: number; aderenciaPct: number; xpPeriodo: number; ligaAtual: string; streakMaximo: number };
  refeicoes: Array<{ key: string; label: string; total: number; seguiu: number; adaptou: number; comeuMal: number; pulou: number; problemaPct: number }>;
  treino: { conforme: number; parcial: number; nao: number; faltas: number; motivos: Array<{ motivo: string; vezes: number }> };
  sono: { meta: number; diasComDado: number; mediaHoras: number; diasAbaixoMeta: number };
  agua: { meta: number; diasComDado: number; mediaMl: number; diasAbaixoMeta: number };
  humor: Record<string, number>;
  finaisDeSemana: { totalFds: number; registradosFds: number; aderenciaFdsPct: number; aderenciaUteisPct: number };
  peso: { inicial: number; final: number; delta: number } | null;
  conquistas: Array<{ titulo: string; icone: string | null; data: string }>;
  motivosRefeicoes: Array<{ refeicao: string; texto: string }>;
  insightsRegras: string[];
  insightsIA: string[] | null;
}

/** Monta o relatório determinístico do paciente no intervalo [inicio, fim] (inclusive). */
export async function gerarRelatorioMensal(
  pacienteId: string,
  inicio: Date,
  fim: Date,
): Promise<RelatorioMensal | null> {
  const ini = new Date(inicio); ini.setUTCHours(0, 0, 0, 0);
  const end = new Date(fim); end.setUTCHours(0, 0, 0, 0);
  const fimExclusivo = new Date(end.getTime() + DIA);

  const paciente = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    select: {
      id: true, nome: true, telefone: true, planoRefeicoes: true,
      aguaMetaMl: true, sonoMetaHoras: true, ligaAtual: true, streakMaximo: true,
    },
  });
  if (!paciente) return null;

  const [registros, conquistas, medicoes] = await Promise.all([
    prisma.registro.findMany({
      where: { pacienteId, finalizado: true, data: { gte: ini, lte: end } },
      orderBy: { data: "asc" },
      select: {
        data: true, refeicoesStatus: true, refeicoesNotas: true,
        cafeStatus: true, almocoStatus: true, lancheStatus: true, jantarStatus: true,
        treinoStatus: true, treinoMotivo: true, sonoHoras: true,
        aguaMl: true, aguaMetaMl: true, humor: true, descricao: true, pontosGanhos: true,
      },
    }),
    prisma.conquista.findMany({
      where: { pacienteId, createdAt: { gte: ini, lt: fimExclusivo } },
      orderBy: { createdAt: "asc" },
      select: { titulo: true, icone: true, createdAt: true },
    }),
    prisma.medicao.findMany({
      where: { pacienteId, data: { gte: ini, lte: end } },
      orderBy: { data: "asc" },
      select: { data: true, peso: true },
    }),
  ]);

  const plano = Array.isArray(paciente.planoRefeicoes) && paciente.planoRefeicoes.length
    ? (paciente.planoRefeicoes as Array<{ key: string; label: string }>)
    : PLANO_PADRAO;
  const planoKeys = plano.map((r) => r.key);
  const metaSono = resolverSonoMetaHoras(paciente.sonoMetaHoras);
  const metaAgua = resolverAguaMetaMl(paciente.aguaMetaMl);

  // ─── Dias do período (calendário) e recorte útil × fim de semana ─────────────
  let diasPeriodo = 0, totalFds = 0;
  for (let t = ini.getTime(); t <= end.getTime(); t += DIA) {
    diasPeriodo += 1;
    const d = new Date(t).getUTCDay();
    if (d === 0 || d === 6) totalFds += 1;
  }
  const totalUteis = diasPeriodo - totalFds;

  let registradosFds = 0, registradosUteis = 0;
  // ─── Refeições ───────────────────────────────────────────────────────────────
  const refAgg = plano.map((r) => ({ ...r, total: 0, seguiu: 0, adaptou: 0, comeuMal: 0, pulou: 0 }));
  const refIndex = new Map(refAgg.map((r) => [r.key, r]));
  const motivosRefeicoes: Array<{ refeicao: string; texto: string }> = [];

  // ─── Treino / sono / água / humor / xp ──────────────────────────────────────
  let tConforme = 0, tParcial = 0, tNao = 0;
  const treinoMotivos: string[] = [];
  let sonoSoma = 0, sonoDias = 0, sonoAbaixo = 0;
  let aguaSoma = 0, aguaDias = 0, aguaAbaixo = 0;
  const humor: Record<string, number> = {};
  let xpPeriodo = 0;

  for (const reg of registros as (RegistroLite & { pontosGanhos: number })[]) {
    xpPeriodo += reg.pontosGanhos || 0;
    const fds = reg.data.getUTCDay() === 0 || reg.data.getUTCDay() === 6;
    if (fds) registradosFds += 1; else registradosUteis += 1;

    const status = statusDasRefeicoes(reg, planoKeys);
    for (const k of planoKeys) {
      const st = status[k];
      if (!st) continue;
      const bucket = refIndex.get(k)!;
      bucket.total += 1;
      if (st === "seguiu") bucket.seguiu += 1;
      else if (st === "adaptou") bucket.adaptou += 1;
      else if (st === "comeu_mal") bucket.comeuMal += 1;
      else if (st === "pulou") bucket.pulou += 1;
    }
    // Motivos livres por refeição (o "o que mudou / por que pulou")
    if (reg.refeicoesNotas && typeof reg.refeicoesNotas === "object") {
      const notas = reg.refeicoesNotas as Record<string, { nota?: unknown; motivo?: unknown }>;
      for (const r of plano) {
        const n = notas[r.key];
        const txt = [n?.motivo, n?.nota].find((v) => typeof v === "string" && v.trim());
        if (typeof txt === "string" && txt.trim()) motivosRefeicoes.push({ refeicao: r.label, texto: txt.trim() });
      }
    }

    if (reg.treinoStatus === "conforme") tConforme += 1;
    else if (reg.treinoStatus === "parcial") tParcial += 1;
    else if (reg.treinoStatus === "nao") { tNao += 1; if (reg.treinoMotivo?.trim()) treinoMotivos.push(reg.treinoMotivo.trim()); }

    if (typeof reg.sonoHoras === "number") {
      sonoDias += 1; sonoSoma += reg.sonoHoras;
      if (reg.sonoHoras < metaSono) sonoAbaixo += 1;
    }
    if (typeof reg.aguaMl === "number") {
      const metaDia = reg.aguaMetaMl ?? metaAgua;
      aguaDias += 1; aguaSoma += reg.aguaMl;
      if (reg.aguaMl < metaDia) aguaAbaixo += 1;
    }
    if (reg.humor) humor[reg.humor] = (humor[reg.humor] ?? 0) + 1;
  }

  const diasRegistrados = registros.length;
  const peso = medicoes.length
    ? { inicial: medicoes[0].peso, final: medicoes[medicoes.length - 1].peso, delta: Math.round((medicoes[medicoes.length - 1].peso - medicoes[0].peso) * 10) / 10 }
    : null;

  const relatorio: RelatorioMensal = {
    paciente: { id: paciente.id, nome: paciente.nome, telefone: paciente.telefone },
    periodo: { inicio: ini.toISOString().slice(0, 10), fim: end.toISOString().slice(0, 10), dias: diasPeriodo },
    resumo: {
      diasRegistrados,
      aderenciaPct: pct(diasRegistrados, diasPeriodo),
      xpPeriodo: Math.round(xpPeriodo),
      ligaAtual: paciente.ligaAtual,
      streakMaximo: paciente.streakMaximo,
    },
    refeicoes: refAgg.map((r) => ({
      key: r.key, label: r.label, total: r.total,
      seguiu: r.seguiu, adaptou: r.adaptou, comeuMal: r.comeuMal, pulou: r.pulou,
      problemaPct: pct(r.comeuMal + r.pulou, r.total),
    })),
    treino: { conforme: tConforme, parcial: tParcial, nao: tNao, faltas: tNao, motivos: agruparMotivos(treinoMotivos) },
    sono: { meta: metaSono, diasComDado: sonoDias, mediaHoras: sonoDias ? Math.round((sonoSoma / sonoDias) * 10) / 10 : 0, diasAbaixoMeta: sonoAbaixo },
    agua: { meta: metaAgua, diasComDado: aguaDias, mediaMl: aguaDias ? Math.round(aguaSoma / aguaDias) : 0, diasAbaixoMeta: aguaAbaixo },
    humor,
    finaisDeSemana: {
      totalFds, registradosFds,
      aderenciaFdsPct: pct(registradosFds, totalFds),
      aderenciaUteisPct: pct(registradosUteis, totalUteis),
    },
    peso,
    conquistas: conquistas.map((c) => ({ titulo: c.titulo, icone: c.icone, data: c.createdAt.toISOString().slice(0, 10) })),
    motivosRefeicoes,
    insightsRegras: [],
    insightsIA: null,
  };

  relatorio.insightsRegras = gerarInsightsRegras(relatorio, primeiroNome(paciente.nome));
  return relatorio;
}

/** Insights determinísticos — a base confiável (sempre presente, custo zero). */
function gerarInsightsRegras(r: RelatorioMensal, nome: string): string[] {
  const out: string[] = [];

  out.push(`${nome} registrou ${r.resumo.diasRegistrados} de ${r.periodo.dias} dias (${r.resumo.aderenciaPct}% de adesão).`);

  // Refeição-problema (maior % de "comeu mal / pulou", com amostra mínima)
  const problema = [...r.refeicoes].filter((m) => m.total >= 3).sort((a, b) => b.problemaPct - a.problemaPct)[0];
  if (problema && problema.problemaPct >= 30) {
    out.push(`Ponto fraco na alimentação: no ${problema.label.toLowerCase()}, pulou ou comeu mal em ${problema.comeuMal + problema.pulou} de ${problema.total} dias (${problema.problemaPct}%).`);
  }

  // Fim de semana
  if (r.finaisDeSemana.totalFds > 0 && (r.finaisDeSemana.aderenciaFdsPct <= 50 || r.finaisDeSemana.aderenciaUteisPct - r.finaisDeSemana.aderenciaFdsPct >= 25)) {
    out.push(`Tende a sumir nos fins de semana: registrou só ${r.finaisDeSemana.registradosFds} de ${r.finaisDeSemana.totalFds} dias de fim de semana (${r.finaisDeSemana.aderenciaFdsPct}%, contra ${r.finaisDeSemana.aderenciaUteisPct}% nos dias úteis).`);
  }

  // Sono
  if (r.sono.diasAbaixoMeta >= 3) {
    out.push(`Dormiu abaixo da meta de ${r.sono.meta}h em ${r.sono.diasAbaixoMeta} dias (média de ${r.sono.mediaHoras}h).`);
  }

  // Treino
  if (r.treino.faltas > 0) {
    const motivos = r.treino.motivos.length ? ` Principais motivos: ${r.treino.motivos.map((m) => `${m.motivo}${m.vezes > 1 ? ` (${m.vezes}×)` : ""}`).join(", ")}.` : "";
    out.push(`Faltou ${r.treino.faltas} ${r.treino.faltas === 1 ? "dia" : "dias"} de treino.${motivos}`);
  }

  // Água
  if (r.agua.diasAbaixoMeta >= 3) {
    out.push(`Bebeu menos água que a meta (${(r.agua.meta / 1000).toFixed(1)}L) em ${r.agua.diasAbaixoMeta} dias.`);
  }

  // Peso
  if (r.peso && Math.abs(r.peso.delta) >= 0.3) {
    const sinal = r.peso.delta < 0 ? "−" : "+";
    out.push(`Peso: ${r.peso.inicial}kg → ${r.peso.final}kg (${sinal}${Math.abs(r.peso.delta)}kg no período).`);
  }

  // Conquistas
  if (r.conquistas.length) {
    out.push(`Desbloqueou ${r.conquistas.length} ${r.conquistas.length === 1 ? "conquista" : "conquistas"} no período.`);
  }

  return out;
}

/** Camada de IA (opcional): reescreve as métricas em "voz de nutricionista".
 *  Só usa os dados recebidos; em qualquer falha retorna null (o front usa as regras). */
export async function gerarInsightsIA(r: RelatorioMensal): Promise<string[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const dados = {
    paciente: primeiroNome(r.paciente.nome),
    periodo: r.periodo,
    resumo: r.resumo,
    refeicoes: r.refeicoes,
    treino: r.treino,
    sono: r.sono,
    agua: r.agua,
    humor: r.humor,
    finaisDeSemana: r.finaisDeSemana,
    peso: r.peso,
    conquistas: r.conquistas.length,
    motivosRefeicoes: r.motivosRefeicoes.slice(0, 20),
  };

  const prompt =
    `Você é um(a) nutricionista experiente escrevendo um resumo do mês de um paciente para o próprio prontuário. ` +
    `Use SOMENTE os dados fornecidos (não invente números nem fatos). Escreva de 4 a 6 frases curtas, em português, ` +
    `tom profissional e humano. Destaque padrões de comportamento (ex.: refeição em que mais falha, sumiço em fins de semana, ` +
    `motivos recorrentes de faltar treino agrupados por tema, qualidade do sono). Seja específico com os números. ` +
    `Responda APENAS JSON no formato {"insights": ["frase 1", "frase 2", ...]}.\n\nDADOS:\n` +
    JSON.stringify(dados);

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = (await resp.json()) as { content?: Array<{ text?: string }> };
    const text = data?.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { insights?: unknown };
    if (Array.isArray(parsed.insights)) {
      const frases = parsed.insights.filter((f): f is string => typeof f === "string" && f.trim().length > 0);
      return frases.length ? frases : null;
    }
    return null;
  } catch (e) {
    console.error("[relatorio] IA indisponível, usando regras", e);
    return null;
  }
}
