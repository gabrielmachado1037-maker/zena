import prisma from "./prisma";
import { enviarNotificacao } from "../routes/notificacoes";

/**
 * Chamada após salvar uma nova Medicao.
 * Gera FeedPost automaticamente para dois eventos:
 *  - PESO_ALCANCADO: novo peso <= pesoMeta e ainda não gerou post nos últimos 30 dias
 *  - META_BATIDA:    CheckIn da semana atual com adesao >= 7 e ainda não gerou post essa semana
 */
export async function gerarFeedAutomatico(
  pacienteId: string,
  nutricionistaId: string,
  novoPeso: number
): Promise<void> {
  const paciente = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    select: { nome: true, pesoMeta: true },
  });
  if (!paciente) return;

  const agora = new Date();
  const ha30dias = new Date(agora.getTime() - 30 * 86400_000);
  const ha7dias  = new Date(agora.getTime() -  7 * 86400_000);

  const criacoes: Promise<unknown>[] = [];
  let addedPeso   = false;
  let addedHabito = false;

  // ── 1. Meta de peso ────────────────────────────────────────────────────────
  if (paciente.pesoMeta !== null && novoPeso <= paciente.pesoMeta) {
    const jaExistePeso = await prisma.feedPost.findFirst({
      where: { pacienteId, tipo: "PESO_ALCANCADO", criadoEm: { gte: ha30dias } },
      select: { id: true },
    });

    if (!jaExistePeso) {
      addedPeso = true;
      criacoes.push(
        prisma.feedPost.create({
          data: {
            tipo: "PESO_ALCANCADO",
            pacienteId,
            nutricionistaId,
            mensagem: `${paciente.nome} alcançou a meta de peso de ${paciente.pesoMeta} kg! 🎉`,
          },
        })
      );
    }
  }

  // ── 2. Hábitos — adesão ≥ 7 no check-in mais recente (até 7 dias atrás) ──
  const checkIn = await prisma.checkIn.findFirst({
    where: { pacienteId, criadoEm: { gte: ha7dias } },
    orderBy: { criadoEm: "desc" },
    select: { adesao: true },
  });

  if (checkIn && checkIn.adesao >= 7) {
    const jaExisteHabito = await prisma.feedPost.findFirst({
      where: { pacienteId, tipo: "META_BATIDA", criadoEm: { gte: ha7dias } },
      select: { id: true },
    });

    if (!jaExisteHabito) {
      addedHabito = true;
      criacoes.push(
        prisma.feedPost.create({
          data: {
            tipo: "META_BATIDA",
            pacienteId,
            nutricionistaId,
            mensagem: `${paciente.nome} manteve os hábitos por 7 dias consecutivos! 🎯`,
          },
        })
      );
    }
  }

  await Promise.all(criacoes);

  // Notificações push — somente para posts que foram realmente criados
  if (addedPeso) {
    enviarNotificacao(nutricionistaId, "Conquista do paciente", `${paciente.nome} alcançou a meta de peso! 🎉`, "/app/feed")
      .catch(console.error);
  }
  if (addedHabito) {
    enviarNotificacao(nutricionistaId, "Conquista do paciente", `${paciente.nome} manteve 7 dias de hábitos! 🎯`, "/app/feed")
      .catch(console.error);
  }
}
