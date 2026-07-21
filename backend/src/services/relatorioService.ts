import * as Sentry from "@sentry/node";
import prisma from "../lib/prisma";
import { resolverAguaMetaMl, resolverSonoMetaHoras, calcularLiga, LIGAS } from "../config/ligas";

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

const HUMOR_SCORE_MAP: Record<string, number> = { otimo: 5, bom: 4, neutro: 3, dificil: 2, pessimo: 1 };

/** % de adesão por dimensão num conjunto de registros — usado para comparar o
 *  período atual com o anterior (evolução). Usa só um subconjunto dos campos. */
type RegDim = Pick<RegistroLite, "refeicoesStatus" | "cafeStatus" | "almocoStatus" | "lancheStatus" | "jantarStatus" | "treinoStatus" | "sonoHoras" | "aguaMl" | "aguaMetaMl" | "humor">;
function dimensoesPeriodo(regs: RegDim[], planoKeys: string[], metaSono: number, metaAgua: number) {
  let refTot = 0, refOk = 0, aguaD = 0, aguaOk = 0, sonoD = 0, sonoOk = 0, tCon = 0, tPar = 0, tNao = 0, humorTot = 0, humorSoma = 0;
  for (const reg of regs) {
    const st = statusDasRefeicoes(reg as RegistroLite, planoKeys);
    for (const k of planoKeys) { const s = st[k]; if (!s) continue; refTot++; if (s === "seguiu" || s === "adaptou") refOk++; }
    if (reg.treinoStatus === "conforme") tCon++; else if (reg.treinoStatus === "parcial") tPar++; else if (reg.treinoStatus === "nao") tNao++;
    if (typeof reg.sonoHoras === "number") { sonoD++; if (reg.sonoHoras >= metaSono) sonoOk++; }
    if (typeof reg.aguaMl === "number") { const m = reg.aguaMetaMl ?? metaAgua; aguaD++; if (reg.aguaMl >= m) aguaOk++; }
    if (reg.humor) { humorTot++; humorSoma += HUMOR_SCORE_MAP[reg.humor] ?? 3; }
  }
  const tDen = tCon + tPar + tNao;
  return {
    alimentacao: refTot > 0 ? pct(refOk, refTot) : null,
    hidratacao: aguaD > 0 ? pct(aguaOk, aguaD) : null,
    sono: sonoD > 0 ? pct(sonoOk, sonoD) : null,
    treino: tDen > 0 ? pct(tCon + tPar, tDen) : null,
    humor: humorTot > 0 ? Math.round((humorSoma / humorTot) * 10) / 10 : null, // média 1–5
  };
}

/** Uma linha da tabela dia-a-dia (roll-up por dia; null = sem dado nesse dia). */
export interface DiaRelatorio {
  data: string;                                          // ISO AAAA-MM-DD
  alimentacao: "seguiu" | "adaptou" | "pulou" | null;    // roll-up do dia
  aguaMl: number | null;
  sonoHoras: number | null;
  treino: "sim" | "nao" | null;
  humor: string | null;
  checkin: boolean;                                      // dia teve check-in finalizado
}

export interface RelatorioMensal {
  paciente: { id: string; nome: string; telefone: string | null; foto: string | null; objetivo: string | null; nutricionista: string | null };
  periodo: { inicio: string; fim: string; dias: number };
  resumo: {
    diasRegistrados: number; aderenciaPct: number; desafiosCumpridos: number; xpPeriodo: number;
    ligaAtual: string; ligaNivel: string; streakMaximo: number; streakAtual: number;
    pontosTotal: number; xpParaProxima: number; proximaLiga: string | null;
  };
  dias: DiaRelatorio[];
  diasAtencao: Array<{ data: string; motivo: string }>;
  mesAnterior: { aderenciaPct: number } | null;
  evolucao: Array<{ dim: string; atual: number | null; anterior: number | null; delta: number | null; unidade: "%" | "nivel" }>;
  refeicoes: Array<{ key: string; label: string; total: number; seguiu: number; adaptou: number; comeuMal: number; pulou: number; problemaPct: number }>;
  treino: { conforme: number; parcial: number; nao: number; faltas: number; motivos: Array<{ motivo: string; vezes: number }> };
  sono: { meta: number; diasComDado: number; mediaHoras: number; diasAbaixoMeta: number };
  agua: { meta: number; diasComDado: number; mediaMl: number; diasAbaixoMeta: number };
  humor: Record<string, number>;
  finaisDeSemana: { totalFds: number; registradosFds: number; aderenciaFdsPct: number; aderenciaUteisPct: number };
  peso: { inicial: number; final: number; delta: number } | null;
  conquistas: Array<{ titulo: string; icone: string | null; data: string }>;
  motivosRefeicoes: Array<{ refeicao: string; texto: string }>;
  scoreGeral: { valor: number; status: string; base: { dimensoes: number; total: number } };
  dificuldades: Array<{ texto: string; vezes: number }>;
  evolucaoFisica: {
    peso: { inicial: number; final: number; delta: number } | null;
    medidas: Record<string, { inicial: number; final: number; delta: number } | null>;
    laudo: string | null;
    observacoes: string | null;
    fotos: Array<{ data: string; tipo: string; imagem: string }>;
  };
  insightsRegras: string[];
  insightsIA: string[] | null;
  focoRegras: string[];
  focoIA: string[] | null;
  chamaAtencao: string[];         // "O que mais chama atenção" — eventos concretos
  padroes: string[];              // "Padrões identificados" — correlações comprovadas
  metas: string[];                // "Metas para o próximo ciclo"
  maiorSequenciaPeriodo: number;  // maior sequência de check-ins DENTRO do período
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
      aguaMetaMl: true, sonoMetaHoras: true, ligaAtual: true, ligaNivel: true, streakMaximo: true,
      objetivo: true, fotoPerfilUrl: true, pontosTotal: true, streakAtual: true,
      nutricionista: { select: { nome: true } },
    },
  });
  if (!paciente) return null;

  const [registros, conquistas, medicoes, desafiosCumpridos, fotos] = await Promise.all([
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
      select: {
        data: true, peso: true, gordura: true, musculo: true,
        cintura: true, quadril: true, braco: true, coxa: true, laudo: true, observacoes: true,
      },
    }),
    prisma.desafioProgresso.count({
      where: { pacienteId, concluido: true, encerradoEm: { gte: ini, lt: fimExclusivo } },
    }),
    prisma.fotoEvolucao.findMany({
      where: { pacienteId, data: { gte: ini, lte: end } },
      orderBy: { data: "asc" },
      select: { data: true, tipo: true, imagem: true },
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

  // ─── Tabela dia-a-dia (uma linha por dia do período, inclusive dias sem check-in) ──
  const regByDay = new Map<string, RegistroLite>();
  for (const reg of registros as RegistroLite[]) regByDay.set(reg.data.toISOString().slice(0, 10), reg);

  const dias: DiaRelatorio[] = [];
  for (let t = ini.getTime(); t <= end.getTime(); t += DIA) {
    const iso = new Date(t).toISOString().slice(0, 10);
    const reg = regByDay.get(iso);
    if (!reg) { dias.push({ data: iso, alimentacao: null, aguaMl: null, sonoHoras: null, treino: null, humor: null, checkin: false }); continue; }
    // Roll-up da alimentação do dia: qualquer pulou/comeu mal → "pulou"; só adaptações → "adaptou"; tudo ok → "seguiu".
    const st = statusDasRefeicoes(reg, planoKeys);
    let comDado = 0, adaptouN = 0, ruimN = 0;
    for (const k of planoKeys) { const s = st[k]; if (!s) continue; comDado++; if (s === "adaptou") adaptouN++; else if (s === "comeu_mal" || s === "pulou") ruimN++; }
    const alimentacao: DiaRelatorio["alimentacao"] = comDado === 0 ? null : ruimN > 0 ? "pulou" : adaptouN > 0 ? "adaptou" : "seguiu";
    const treino: DiaRelatorio["treino"] = reg.treinoStatus == null ? null : reg.treinoStatus === "nao" ? "nao" : "sim";
    dias.push({ data: iso, alimentacao, aguaMl: reg.aguaMl ?? null, sonoHoras: reg.sonoHoras ?? null, treino, humor: reg.humor ?? null, checkin: true });
  }

  // ─── Dias que merecem atenção (Data | Motivo) — os mais críticos, máx 6 ───────
  const diasAtencaoRaw: Array<{ data: string; motivo: string; sev: number }> = [];
  for (const d of dias) {
    if (!d.checkin) continue;
    const probs: string[] = [];
    if (d.alimentacao === "pulou") probs.push("Pulou refeição");
    if (d.treino === "nao") probs.push("Não treinou");
    if (d.sonoHoras != null && d.sonoHoras < metaSono) probs.push("Dormiu pouco");
    if (d.aguaMl != null && d.aguaMl < metaAgua) probs.push("Água abaixo da meta");
    const humorRuim = d.humor === "dificil" || d.humor === "pessimo";
    if (humorRuim) probs.push("Humor ruim");
    if (probs.length >= 2 || humorRuim) diasAtencaoRaw.push({ data: d.data, motivo: probs[0], sev: probs.length });
  }
  const diasAtencao = diasAtencaoRaw
    .sort((a, b) => b.sev - a.sev || a.data.localeCompare(b.data))
    .slice(0, 6)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map(({ data, motivo }) => ({ data, motivo }));

  // ─── XP para a próxima LIGA (topo da liga atual) e nome dela ──────────────────
  const tierAtual = calcularLiga(paciente.pontosTotal);
  const ligaTiers = LIGAS.filter((t) => t.liga === tierAtual.liga);
  const ligaAte = ligaTiers[ligaTiers.length - 1].ate;
  const xpParaProxima = ligaAte != null ? Math.max(0, Math.round(ligaAte - paciente.pontosTotal)) : 0;
  const proximaLiga = ligaAte != null ? (LIGAS.find((t) => t.de === ligaAte)?.liga ?? null) : null;

  // ─── Período ANTERIOR (mesma duração): adesão + evolução POR DIMENSÃO ─────────
  const prevEnd = new Date(ini.getTime() - DIA);
  const prevIni = new Date(prevEnd.getTime() - (diasPeriodo - 1) * DIA);
  const prevRegistros = await prisma.registro.findMany({
    where: { pacienteId, finalizado: true, data: { gte: prevIni, lte: prevEnd } },
    select: {
      refeicoesStatus: true, cafeStatus: true, almocoStatus: true, lancheStatus: true, jantarStatus: true,
      treinoStatus: true, sonoHoras: true, aguaMl: true, aguaMetaMl: true, humor: true,
    },
  });
  const mesAnterior = prevRegistros.length > 0 ? { aderenciaPct: pct(prevRegistros.length, diasPeriodo) } : null;

  const dimAtual = dimensoesPeriodo(registros as unknown as RegDim[], planoKeys, metaSono, metaAgua);
  const dimPrev = prevRegistros.length > 0 ? dimensoesPeriodo(prevRegistros as RegDim[], planoKeys, metaSono, metaAgua) : null;
  const evoPct = (dim: string, atual: number | null, anterior: number | null) =>
    ({ dim, atual, anterior, delta: atual != null && anterior != null ? atual - anterior : null, unidade: "%" as const });
  const evolucao = [
    evoPct("Alimentação", dimAtual.alimentacao, dimPrev?.alimentacao ?? null),
    evoPct("Hidratação", dimAtual.hidratacao, dimPrev?.hidratacao ?? null),
    evoPct("Sono", dimAtual.sono, dimPrev?.sono ?? null),
    evoPct("Treino", dimAtual.treino, dimPrev?.treino ?? null),
    { dim: "Humor", atual: dimAtual.humor, anterior: dimPrev?.humor ?? null,
      delta: dimAtual.humor != null && dimPrev?.humor != null ? Math.round((dimAtual.humor - dimPrev.humor) * 10) / 10 : null,
      unidade: "nivel" as const },
  ];

  // ─── Score Geral de Adesão (0–100) = média das dimensões COM dado no período ──
  const aderenciaPct = pct(diasRegistrados, diasPeriodo);
  const totRef = refAgg.reduce((s, r) => s + r.total, 0);
  const treinoDen = tConforme + tParcial + tNao;
  const dims: number[] = [aderenciaPct];
  if (totRef > 0) dims.push(pct(refAgg.reduce((s, r) => s + r.seguiu + r.adaptou, 0), totRef));
  if (aguaDias > 0) dims.push(pct(aguaDias - aguaAbaixo, aguaDias));
  if (sonoDias > 0) dims.push(pct(sonoDias - sonoAbaixo, sonoDias));
  if (treinoDen > 0) dims.push(pct(tConforme + tParcial, treinoDen));
  const scoreValor = Math.round(dims.reduce((s, n) => s + n, 0) / dims.length);
  const scoreStatus = scoreValor >= 85 ? "Excelente" : scoreValor >= 70 ? "Bom" : scoreValor >= 55 ? "Regular" : "Abaixo do esperado";
  // Quantas das 5 dimensões possíveis entraram na média. Sem isto o relatório
  // mostra "70/100 · Bom" sem revelar que a nota veio de 2 dimensões — o que
  // faz um paciente que só marcou treino parecer um paciente bem avaliado.
  const scoreBase = { dimensoes: dims.length, total: 5 };

  // ─── Principais dificuldades (automático, ordenado maior→menor, sem zerados) ──
  const plural = (n: number) => (n === 1 ? "dia" : "dias");
  const dificuldades: Array<{ texto: string; vezes: number }> = [];
  for (const r of refAgg) {
    const vezes = r.pulou + r.comeuMal;
    if (vezes > 0) dificuldades.push({ texto: `Pulou ou comeu fora do plano no ${r.label.toLowerCase()} em ${vezes} ${plural(vezes)}`, vezes });
  }
  if (tNao > 0) dificuldades.push({ texto: `Faltou ao treino em ${tNao} ${plural(tNao)}`, vezes: tNao });
  if (sonoAbaixo > 0) dificuldades.push({ texto: `Dormiu abaixo da meta de ${metaSono}h em ${sonoAbaixo} ${plural(sonoAbaixo)}`, vezes: sonoAbaixo });
  if (aguaAbaixo > 0) dificuldades.push({ texto: `Bebeu menos água que a meta em ${aguaAbaixo} ${plural(aguaAbaixo)}`, vezes: aguaAbaixo });
  const fdsNaoReg = totalFds - registradosFds;
  if (totalFds > 0 && fdsNaoReg > 0 && pct(registradosFds, totalFds) <= 60) {
    dificuldades.push({ texto: `Sem registro em ${fdsNaoReg} ${plural(fdsNaoReg)} de fim de semana`, vezes: fdsNaoReg });
  }
  dificuldades.sort((a, b) => b.vezes - a.vezes);

  // ─── Foco da próxima consulta (plano de ação determinístico; a IA pode reescrever) ──
  const focoRegras: string[] = [];
  const piorRef = [...refAgg].filter((r) => r.total >= 3).sort((a, b) => (b.pulou + b.comeuMal) - (a.pulou + a.comeuMal))[0];
  if (piorRef && piorRef.pulou + piorRef.comeuMal > 0) focoRegras.push(`Revisar o ${piorRef.label.toLowerCase()}: combinar opções práticas para os dias de maior dificuldade.`);
  if (tNao >= 2) focoRegras.push("Retomar a regularidade do treino e investigar as principais barreiras.");
  if (sonoAbaixo >= 3) focoRegras.push(`Trabalhar a higiene do sono para aproximar da meta de ${metaSono}h.`);
  if (aguaAbaixo >= 3) focoRegras.push("Reforçar a hidratação ao longo do dia.");
  if (totalFds > 0 && pct(registradosFds, totalFds) <= 60) focoRegras.push("Definir uma estratégia para manter os registros nos fins de semana.");
  if (!focoRegras.length) focoRegras.push("Manter a consistência atual e seguir acompanhando os indicadores.");

  // ─── Sequências de check-in DENTRO do período (perdas, maior sequência, lacunas) ──
  let perdasSeq = 0, runAtual = 0, maiorRun = 0;
  const gapsAposPerda: number[] = [];
  let jaTeveCheckin = false, gapCorrente = 0;
  for (const d of dias) {
    if (d.checkin) {
      if (gapCorrente > 0 && jaTeveCheckin) gapsAposPerda.push(gapCorrente);
      gapCorrente = 0;
      runAtual += 1; if (runAtual > maiorRun) maiorRun = runAtual;
      jaTeveCheckin = true;
    } else {
      if (runAtual > 0) perdasSeq += 1;
      runAtual = 0;
      if (jaTeveCheckin) gapCorrente += 1;
    }
  }

  // ─── Treino por dia da semana (faltas concentradas em um dia específico) ─────
  const NOMES_DOW_EXT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const treinoDow = Array.from({ length: 7 }, () => ({ nao: 0, tot: 0 }));
  for (const d of dias) {
    if (d.treino == null) continue;
    const dow = new Date(`${d.data}T00:00:00Z`).getUTCDay();
    treinoDow[dow]!.tot += 1;
    if (d.treino === "nao") treinoDow[dow]!.nao += 1;
  }
  const piorDowTreino = treinoDow
    .map((v, dow) => ({ dow, ...v }))
    .filter((v) => v.tot >= 2 && v.nao >= 2 && v.nao / v.tot >= 0.6)
    .sort((a, b) => b.nao - a.nao)[0];

  const humorNeg = (humor["dificil"] ?? 0) + (humor["pessimo"] ?? 0);

  // ─── O QUE MAIS CHAMA ATENÇÃO — eventos concretos (negativos + positivos) ────
  const atencaoRaw: Array<{ t: string; p: number }> = [];
  for (const r of refAgg) {
    if (r.pulou >= 2) atencaoRaw.push({ t: `Pulou o ${r.label.toLowerCase()} em ${r.pulou} ${plural(r.pulou)}`, p: r.pulou * 3 });
    if (r.adaptou >= 3) atencaoRaw.push({ t: `Adaptou o ${r.label.toLowerCase()} em ${r.adaptou} ${plural(r.adaptou)}`, p: r.adaptou });
  }
  if (piorDowTreino) atencaoRaw.push({ t: `Não treinou em ${piorDowTreino.nao} de ${piorDowTreino.tot} ${NOMES_DOW_EXT[piorDowTreino.dow]}s`, p: piorDowTreino.nao * 3 });
  else if (tNao >= 2) atencaoRaw.push({ t: `Não treinou em ${tNao} ${plural(tNao)}`, p: tNao * 2 });
  if (aguaAbaixo >= 3) atencaoRaw.push({ t: `Ficou abaixo da meta de água em ${aguaAbaixo} ${plural(aguaAbaixo)}`, p: aguaAbaixo * 2 });
  if (sonoAbaixo >= 3) atencaoRaw.push({ t: `Dormiu menos de ${metaSono}h em ${sonoAbaixo} ${plural(sonoAbaixo)}`, p: sonoAbaixo * 2 });
  if (humorNeg >= 2) atencaoRaw.push({ t: `Registrou humor negativo em ${humorNeg} ${plural(humorNeg)}`, p: humorNeg * 2 });
  if (perdasSeq >= 2) atencaoRaw.push({ t: `Perdeu a sequência ${perdasSeq} vezes`, p: perdasSeq * 2 });
  if (maiorRun >= 5) atencaoRaw.push({ t: `Registrou tudo por ${maiorRun} dias consecutivos`, p: maiorRun });
  const chamaAtencao = atencaoRaw.sort((a, b) => b.p - a.p).slice(0, 8).map((a) => a.t);

  // ─── PADRÕES IDENTIFICADOS — correlações só quando os dados comprovam ─────────
  const padroes: string[] = [];
  const ehFds = (iso: string) => { const wd = new Date(`${iso}T00:00:00Z`).getUTCDay(); return wd === 0 || wd === 6; };
  // 1) Alimentação piora no fim de semana
  { let fp = 0, ft = 0, up = 0, ut = 0;
    for (const d of dias) { if (d.alimentacao == null) continue; if (ehFds(d.data)) { ft++; if (d.alimentacao === "pulou") fp++; } else { ut++; if (d.alimentacao === "pulou") up++; } }
    if (ft >= 3 && ut >= 3 && pct(fp, ft) - pct(up, ut) >= 20) padroes.push("A alimentação tende a piorar nos fins de semana."); }
  // 2) Esquece o café da manhã (café é a refeição mais pulada, com amostra)
  { const cafe = refAgg.find((r) => r.key === "cafe");
    const piorPulo = [...refAgg].filter((r) => r.total >= 3).sort((a, b) => b.pulou - a.pulou)[0];
    if (cafe && cafe.total >= 4 && cafe.pulou >= 3 && piorPulo?.key === "cafe") padroes.push("Costuma pular o café da manhã com frequência."); }
  // 3) Humor piora com pouco sono
  { let bs = 0, bn = 0, as = 0, an = 0;
    for (const d of dias) { if (!d.checkin || d.sonoHoras == null || d.humor == null) continue; const hs = HUMOR_SCORE_MAP[d.humor] ?? 3; if (d.sonoHoras < metaSono) { bs += hs; bn++; } else { as += hs; an++; } }
    if (bn >= 3 && an >= 3 && (as / an) - (bs / bn) >= 0.7) padroes.push(`O humor tende a piorar nos dias em que dorme menos de ${metaSono}h.`); }
  // 4) Hidratação melhora nos dias de treino
  { let to = 0, tn = 0, no = 0, nn = 0;
    for (const d of dias) { if (d.aguaMl == null || d.treino == null) continue; const bateu = d.aguaMl >= metaAgua; if (d.treino === "sim") { tn++; if (bateu) to++; } else { nn++; if (bateu) no++; } }
    if (tn >= 3 && nn >= 3 && pct(to, tn) - pct(no, nn) >= 20) padroes.push("A hidratação melhora nos dias em que treina."); }
  // 5) Some por dias após perder a sequência
  { const avg = gapsAposPerda.length ? gapsAposPerda.reduce((a, b) => a + b, 0) / gapsAposPerda.length : 0;
    if (gapsAposPerda.length >= 2 && avg >= 2) padroes.push("Costuma ficar dois ou mais dias sem registrar após perder a sequência."); }

  // ─── METAS PARA O PRÓXIMO CICLO — objetivos concretos derivados do desempenho ──
  const semanas = Math.max(1, Math.round(diasPeriodo / 7));
  const metas: string[] = [];
  if (aguaDias >= 3) {
    const alvoAgua = Math.min(diasPeriodo, Math.max(aguaDias - aguaAbaixo + Math.ceil(aguaAbaixo / 2), Math.round(diasPeriodo * 0.8)));
    metas.push(`Bater a meta de água em pelo menos ${alvoAgua} dias.`);
  }
  const foraPlano = refAgg.reduce((s, r) => s + r.adaptou + r.pulou + r.comeuMal, 0);
  if (foraPlano > 0) metas.push(`Manter no máximo ${Math.max(1, Math.floor((foraPlano / semanas) * 0.6))} refeições fora do plano por semana.`);
  if (tConforme + tParcial + tNao > 0) metas.push(`Completar ${Math.min(6, Math.max(3, Math.ceil((tConforme + tParcial) / semanas) + 1))} treinos por semana.`);
  metas.push(`Manter uma sequência de registros superior a ${Math.max(15, Math.ceil((maiorRun || paciente.streakMaximo || 7) / 5) * 5)} dias.`);

  // ─── Evolução física: medidas (primeira→última leitura), laudo/obs recentes, fotos ──
  const MEDIDAS_KEYS = ["gordura", "musculo", "cintura", "quadril", "braco", "coxa"] as const;
  const medidas: Record<string, { inicial: number; final: number; delta: number } | null> = {};
  for (const k of MEDIDAS_KEYS) {
    const pts = medicoes
      .map((m) => (m as Record<string, unknown>)[k])
      .filter((v): v is number => typeof v === "number");
    medidas[k] = pts.length
      ? { inicial: pts[0], final: pts[pts.length - 1], delta: Math.round((pts[pts.length - 1] - pts[0]) * 10) / 10 }
      : null;
  }
  const laudo = [...medicoes].reverse().map((m) => m.laudo).find((v) => v?.trim()) ?? null;
  const observacoesMed = [...medicoes].reverse().map((m) => m.observacoes).find((v) => v?.trim()) ?? null;
  const fotosEvolucao = fotos.map((f) => ({ data: f.data.toISOString().slice(0, 10), tipo: f.tipo, imagem: f.imagem }));

  const relatorio: RelatorioMensal = {
    paciente: {
      id: paciente.id, nome: paciente.nome, telefone: paciente.telefone,
      foto: paciente.fotoPerfilUrl, objetivo: paciente.objetivo, nutricionista: paciente.nutricionista?.nome ?? null,
    },
    periodo: { inicio: ini.toISOString().slice(0, 10), fim: end.toISOString().slice(0, 10), dias: diasPeriodo },
    resumo: {
      diasRegistrados,
      aderenciaPct,
      desafiosCumpridos,
      xpPeriodo: Math.round(xpPeriodo),
      ligaAtual: paciente.ligaAtual,
      ligaNivel: paciente.ligaNivel,
      streakMaximo: paciente.streakMaximo,
      streakAtual: paciente.streakAtual,
      pontosTotal: Math.round(paciente.pontosTotal),
      xpParaProxima,
      proximaLiga,
    },
    dias,
    diasAtencao,
    mesAnterior,
    evolucao,
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
    scoreGeral: { valor: scoreValor, status: scoreStatus, base: scoreBase },
    dificuldades,
    evolucaoFisica: { peso, medidas, laudo, observacoes: observacoesMed, fotos: fotosEvolucao },
    insightsRegras: [],
    insightsIA: null,
    focoRegras: focoRegras.slice(0, 3),
    focoIA: null,
    chamaAtencao,
    padroes,
    metas: metas.slice(0, 4),
    maiorSequenciaPeriodo: maiorRun,
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

  // (Conquistas/gamificação NÃO entram no relatório clínico — removido de propósito.)

  return out;
}

/** Camada de IA (opcional): reescreve as métricas em "voz de nutricionista".
 *  Retorna o Resumo Inteligente (resumo) + o Foco da próxima consulta (foco), numa
 *  única chamada. Só usa os dados recebidos; em qualquer falha retorna null (fallback: regras). */
export async function gerarInsightsIA(r: RelatorioMensal): Promise<{ resumo: string[]; foco: string[] } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const dados = {
    paciente: primeiroNome(r.paciente.nome),
    objetivo: r.paciente.objetivo,
    periodo: r.periodo,
    scoreGeral: r.scoreGeral,
    resumoNums: r.resumo,
    refeicoes: r.refeicoes,
    treino: r.treino,
    sono: r.sono,
    agua: r.agua,
    humor: r.humor,
    finaisDeSemana: r.finaisDeSemana,
    peso: r.peso,
    dificuldades: r.dificuldades,
    chamaAtencao: r.chamaAtencao,
    padroes: r.padroes,
    evolucao: r.evolucao,
    maiorSequenciaPeriodo: r.maiorSequenciaPeriodo,
    mesAnterior: r.mesAnterior,
    conquistas: r.conquistas.length,
    motivosRefeicoes: r.motivosRefeicoes.slice(0, 20),
  };

  const prompt =
    `Você é um(a) nutricionista experiente escrevendo a ficha clínica de um paciente para consulta rápida. ` +
    `Use SOMENTE os dados fornecidos (NUNCA invente números nem fatos; se um dado não existe, não cite). ` +
    `Português, tom profissional, humano e específico — nada de frases genéricas. ` +
    `Produza DOIS blocos:\n` +
    `1) "resumo": um RESUMO INTELIGENTE do mês em 4 a 6 frases corridas e específicas, no espírito do exemplo ` +
    `"apresentou boa consistência nos dias úteis, mas houve queda importante nos fins de semana; a alimentação ` +
    `permaneceu estável enquanto os treinos reduziram; o humor caiu após dias com menos sono". Baseie-se nos números, ` +
    `nos padrões (campo "padroes") e no que chama atenção (campo "chamaAtencao"), citando comportamentos concretos.\n` +
    `2) "foco": 3 a 5 PRINCIPAIS PONTOS PARA A CONSULTA — assuntos que o nutricionista deveria abordar, ` +
    `priorizando as maiores dificuldades. Cada item é uma frase curta e acionável.\n` +
    `Responda APENAS JSON no formato {"resumo": ["frase 1", "frase 2", ...], "foco": ["...", "..."]}.\n\nDADOS:\n` +
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
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    // Sem checar resp.ok, chave revogada (401), crédito esgotado ou 429 caíam
    // no catch genérico e viravam "IA indisponível" — indistinguível de um
    // JSON malformado. A nutri seguia vendo o relatório montado por regras,
    // sem saber que a IA está fora há semanas.
    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      const msg = `[relatorio] IA retornou ${resp.status} — caindo para regras. ${detalhe.slice(0, 200)}`;
      console.error(msg);
      Sentry.captureMessage(msg, "warning");
      return null;
    }
    const data = (await resp.json()) as { content?: Array<{ text?: string }> };
    let text = data?.content?.[0]?.text ?? "";
    const bloco = text.match(/\{[\s\S]*\}/); // tolera cercas de código / texto ao redor
    if (bloco) text = bloco[0];
    const parsed = JSON.parse(text) as { resumo?: unknown; foco?: unknown };
    const limpa = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((f): f is string => typeof f === "string" && f.trim().length > 0) : [];
    const resumo = limpa(parsed.resumo);
    const foco = limpa(parsed.foco);
    return resumo.length || foco.length ? { resumo, foco } : null;
  } catch (e) {
    console.error("[relatorio] IA indisponível, usando regras", e);
    return null;
  }
}
