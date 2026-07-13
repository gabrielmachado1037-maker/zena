import prisma from "../lib/prisma";
import { enviarNotificacaoPaciente } from "../routes/notificacoes";

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

const QUIET_START = 22; // 22h — não envia à noite/madrugada
const QUIET_END = 7;    //  7h
const TZ_PADRAO = "America/Sao_Paulo";

interface EnviarOpts {
  titulo: string;
  corpo: string;
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
  const url = opts.url ?? "/paciente/feed";
  try {
    const categoria = CATEGORIA_DO_TIPO[tipo];
    const pac = await prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { prefsNotificacao: true, timezone: true, anonimizadoEm: true },
    });
    if (!pac || pac.anonimizadoEm) return; // paciente removido: nunca notifica

    // 1) Preferência da categoria (null/undefined = ligada).
    if (categoria) {
      const prefs = (pac.prefsNotificacao ?? {}) as Record<string, unknown>;
      if (prefs[categoria] === false) { await registrarLog(pacienteId, tipo, opts, url, "pulado", "preferencia"); return; }
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
    const log = await registrarLog(pacienteId, tipo, opts, url, "enviado");
    const sep = url.includes("?") ? "&" : "?";
    await enviarNotificacaoPaciente(pacienteId, opts.titulo, opts.corpo, `${url}${sep}n=${log.id}`);
  } catch (e) {
    console.error("[NotificationEngine]", tipo, (e as Error)?.message ?? e);
  }
}

export const NotificationEngine = { enviar };
