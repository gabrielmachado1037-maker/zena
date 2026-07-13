import prisma from "../lib/prisma";
import { calcularLiga, proximaLiga } from "../config/ligas";
import { NotificationEngine } from "./notificationEngine";

// Marcos de sequência e suas mensagens (spec).
const MARCOS_SEQUENCIA: Record<number, { titulo: string; corpo: string }> = {
  3:  { titulo: "🔥 3 dias de sequência", corpo: "Você já está há 3 dias mantendo sua sequência." },
  7:  { titulo: "🏆 Uma semana completa", corpo: "7 dias seguidos de evolução. Continue!" },
  15: { titulo: "🚀 15 dias!", corpo: "Continue assim." },
  30: { titulo: "🥇 Um mês inteiro", corpo: "Um mês inteiro de evolução." },
  60: { titulo: "💎 60 dias", corpo: "Sua consistência está acima da média." },
  90: { titulo: "👑 90 dias", corpo: "Você atingiu uma sequência extraordinária." },
};

// Distância (em pontos) do topo da liga atual que dispara "perto da promoção".
const PROMO_FALTA_MAX = 50;

/**
 * Dispara os eventos motivacionais do fechamento do dia (liga, sequência, ranking,
 * promoção). Ordem = prioridade; o intervalo mínimo garante NO MÁXIMO uma por
 * fechamento (anti-rajada). Best-effort — nunca quebra o fluxo do check-in.
 */
export async function notificarFechamentoDia(
  pacienteId: string,
  dados: { pontosAntes: number; pontosDepois: number; streakAtual: number; ligaAtual: string; ligaNivel: string },
): Promise<void> {
  try {
    // 1) Subiu de liga? (pontos só sobem no fechamento → qualquer mudança de tier = promoção)
    const ligaAntes = calcularLiga(dados.pontosAntes);
    if (ligaAntes.liga !== dados.ligaAtual || ligaAntes.nivel !== dados.ligaNivel) {
      await NotificationEngine.enviar(pacienteId, "liga_subiu", {
        titulo: "🏆 Você subiu de liga",
        corpo: `Agora você está na liga ${dados.ligaAtual} ${dados.ligaNivel}.`,
        url: "/paciente/ligas",
        dedupeKey: `liga_subiu:${dados.ligaAtual}:${dados.ligaNivel}`,
        minIntervalMin: 30,
      });
    }

    // 2) Marco de sequência
    const marco = MARCOS_SEQUENCIA[dados.streakAtual];
    if (marco) {
      await NotificationEngine.enviar(pacienteId, "sequencia", {
        ...marco, url: "/paciente/dashboard",
        dedupeKey: `sequencia:${dados.streakAtual}`, minIntervalMin: 30,
      });
    }

    // 3) Ranking (posição entre os pacientes ativos da mesma nutri) — notifica ao ENTRAR (dedup once)
    const me = await prisma.paciente.findUnique({ where: { id: pacienteId }, select: { nutricionistaId: true } });
    if (me) {
      const lista = await prisma.paciente.findMany({
        where: { nutricionistaId: me.nutricionistaId, ativo: true, anonimizadoEm: null },
        select: { id: true }, orderBy: { pontosTotal: "desc" },
      });
      const pos = lista.findIndex((p) => p.id === pacienteId) + 1;
      if (pos === 1) {
        await NotificationEngine.enviar(pacienteId, "ranking_primeiro", { titulo: "👑 Líder da liga", corpo: "Você é o líder da sua liga.", url: "/paciente/ranking", dedupeKey: "ranking_primeiro", minIntervalMin: 30 });
      } else if (pos >= 2 && pos <= 3) {
        await NotificationEngine.enviar(pacienteId, "ranking_top3", { titulo: "🚀 Top 3", corpo: "Agora você está entre os melhores.", url: "/paciente/ranking", dedupeKey: "ranking_top3", minIntervalMin: 30 });
      } else if (pos >= 4 && pos <= 10) {
        await NotificationEngine.enviar(pacienteId, "ranking_top10", { titulo: "🥇 Top 10", corpo: "Você entrou no Top 10.", url: "/paciente/ranking", dedupeKey: "ranking_top10", minIntervalMin: 30 });
      }
    }

    // 4) Perto da promoção
    const prox = proximaLiga(dados.pontosDepois);
    const atual = calcularLiga(dados.pontosDepois);
    if (prox && atual.ate != null) {
      const faltam = atual.ate - dados.pontosDepois;
      if (faltam > 0 && faltam <= PROMO_FALTA_MAX) {
        await NotificationEngine.enviar(pacienteId, "liga_promo", {
          titulo: "✨ Quase lá!", corpo: `Faltam poucos pontos para subir para ${prox.liga} ${prox.nivel}.`,
          url: "/paciente/ligas", dedupeKey: `liga_promo:${prox.liga}:${prox.nivel}`, minIntervalMin: 30,
        });
      }
    }
  } catch (e) {
    console.error("[notificacoesEventos] fechamento", (e as Error)?.message ?? e);
  }
}
