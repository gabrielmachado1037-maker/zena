import prisma from "../lib/prisma";
import { enviarNotificacaoPaciente } from "../routes/notificacoes";
import { deepLink } from "../lib/deepLink";

/**
 * NotificationEngine — ÚNICO caminho de envio de notificação ao paciente.
 * Toda notificação (evento, agendada, futura IA/campanha) passa por aqui.
 * Responsável por: gate de preferência, quiet hours (fuso do paciente),
 * dedup/idempotência, intervalo mínimo e log central. Extensível: novos tipos
 * entram só no mapa CATEGORIA_DO_TIPO, sem refatorar o motor.
 */
export type CategoriaNotificacao =
  | "alimentacao" | "agua" | "sono" | "treino"
  | "desafios" | "mensagens" | "medalhas" | "ranking" | "sequencia";

// tipo → categoria (para o gate de preferência do paciente).
// Liga é mapeada para "ranking" (progressão/competição) — mantém os 9 toggles do spec.
const CATEGORIA_DO_TIPO: Record<string, CategoriaNotificacao> = {
  mensagem: "mensagens",
  liga_subiu: "ranking",
  liga_promo: "ranking",
  ranking_top10: "ranking",
  ranking_top3: "ranking",
  ranking_primeiro: "ranking",
  medalha: "medalhas",
  desafio_concluido: "desafios",
  desafio_lembrete: "desafios",
  sequencia: "sequencia",
  refeicao: "alimentacao",
  agua: "agua",
  treino: "treino",
  sono: "sono",
};

// Comunicações de engajamento/retenção (base legal = consentimento, LGPD).
// Diferente das 9 categorias de progresso, estas são revogáveis pelo próprio
// titular (pref `engajamento`) — a revogação deve efetivamente parar o envio.
const TIPOS_ENGAJAMENTO = new Set(["reativacao", "positiva"]);

const QUIET_START = 22; // 22h — não envia à noite/madrugada
const QUIET_END = 7;    //  7h
const TZ_PADRAO = "America/Sao_Paulo";

interface EnviarOpts {
  titulo: string;
  corpo: string;
  /** Deep-link estruturado (preferido) — resolve a rota via lib/deepLink e viaja no payload. */
  destination?: string;
  id?: string | null;
  /** Override de rota legado; se ausente, deriva de destination (ou cai em /paciente/feed). */
  url?: string;
  /** Se informado, não reenvia se já houve um envio com a mesma chave (idempotência). */
  dedupeKey?: string;
  /** Se informado, pula caso já tenha havido QUALQUER envio nos últimos N minutos (anti-rajada). */
  minIntervalMin?: number;
}

// Hora atual (0-23) no fuso do paciente, sem depender de lib externa.
function horaNoFuso(tz: string): number {
  try {
    const s = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date());
    const h = parseInt(s, 10);
    return Number.isFinite(h) ? h % 24 : 12;
  } catch {
    return 12;
  }
}

async function registrarLog(
  pacienteId: string, tipo: string, opts: EnviarOpts, url: string,
  status: "enviado" | "pulado" | "falha", motivo?: string,
) {
  return prisma.notificacaoLog.create({
    data: { pacienteId, tipo, dedupeKey: opts.dedupeKey ?? null, titulo: opts.titulo, corpo: opts.corpo, url, status, motivo: motivo ?? null },
  });
}

/**
 * Envia (ou decide não enviar) uma notificação ao paciente, aplicando todas as regras.
 * Nunca lança — é best-effort e sempre registra o desfecho no NotificacaoLog.
 */
export async function enviar(pacienteId: string, tipo: string, opts: EnviarOpts): Promise<void> {
  const url = opts.url ?? (opts.destination ? deepLink(opts.destination, opts.id) : "/paciente/feed");
  try {
    const categoria = CATEGORIA_DO_TIPO[tipo];
    const pac = await prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { prefsNotificacao: true, timezone: true, anonimizadoEm: true },
    });
    if (!pac || pac.anonimizadoEm) return; // paciente removido: nunca notifica

    const prefs = (pac.prefsNotificacao ?? {}) as Record<string, unknown>;

    // 1) Preferência da categoria (null/undefined = ligada).
    if (categoria) {
      if (prefs[categoria] === false) { await registrarLog(pacienteId, tipo, opts, url, "pulado", "preferencia"); return; }
    }

    // 1b) Consentimento de comunicações de engajamento (LGPD, revogável). Revogado = não envia.
    if (TIPOS_ENGAJAMENTO.has(tipo) && prefs.engajamento === false) {
      await registrarLog(pacienteId, tipo, opts, url, "pulado", "consentimento");
      return;
    }

    // 2) Quiet hours (fuso do paciente) — nunca de madrugada.
    const hora = horaNoFuso(pac.timezone || TZ_PADRAO);
    if (hora >= QUIET_START || hora < QUIET_END) { await registrarLog(pacienteId, tipo, opts, url, "pulado", "quiet_hours"); return; }

    // 3) Dedup / idempotência.
    if (opts.dedupeKey) {
      const jaEnviado = await prisma.notificacaoLog.findFirst({
        where: { pacienteId, dedupeKey: opts.dedupeKey, status: "enviado" },
        select: { id: true },
      });
      if (jaEnviado) { await registrarLog(pacienteId, tipo, opts, url, "pulado", "duplicado"); return; }
    }

    // 4) Intervalo mínimo (anti-rajada) — evita várias em sequência.
    if (opts.minIntervalMin) {
      const desde = new Date(Date.now() - opts.minIntervalMin * 60 * 1000);
      const recente = await prisma.notificacaoLog.findFirst({
        where: { pacienteId, status: "enviado", enviadoEm: { gt: desde } },
        select: { id: true },
      });
      if (recente) { await registrarLog(pacienteId, tipo, opts, url, "pulado", "intervalo"); return; }
    }

    // 5) Envia e registra (com deep-link ?n=<logId> para rastrear abertura).
    // O log nasce antes do envio porque o deep-link precisa do id (?n=<logId>).
    // Se nada for entregue, corrige para "falha": sem isso o histórico mostrava
    // 100% de sucesso mesmo com o push totalmente morto (ex.: VAPID ausente).
    const log = await registrarLog(pacienteId, tipo, opts, url, "enviado");
    const sep = url.includes("?") ? "&" : "?";
    const resultado = await enviarNotificacaoPaciente(
      pacienteId, opts.titulo, opts.corpo, `${url}${sep}n=${log.id}`, opts.destination, opts.id ?? undefined,
    );
    if (resultado.entregues === 0) {
      await prisma.notificacaoLog.update({
        where: { id: log.id },
        data: { status: "falha", motivo: resultado.motivo },
      });
    }
  } catch (e) {
    console.error("[NotificationEngine]", tipo, (e as Error)?.message ?? e);
  }
}

export const NotificationEngine = { enviar };
