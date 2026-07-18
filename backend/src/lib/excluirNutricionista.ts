import prisma from "./prisma";
import { deleteFotoPorUrl } from "./supabase";

// LGPD — direito de eliminação do NUTRI (titular/controlador). Apaga a conta do
// nutricionista E todos os dados dos pacientes vinculados (a nutri é controladora
// desses dados). Irreversível.
//
// A ordem importa: várias FKs NÃO são onDelete:Cascade, então as tabelas-filhas
// precisam ser apagadas antes das mães. Tudo roda numa ÚNICA transação atômica:
// se qualquer passo falhar, nada é apagado (nunca deixa estado meio-excluído).
// As fotos do storage são apagadas DEPOIS que a transação confirma (best-effort).
export async function excluirNutricionista(nutriId: string): Promise<void> {
  // IDs dos pacientes e das contas de login (para tabelas escopadas por eles).
  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId: nutriId },
    select: { id: true, fotoInicial: true, fotoPerfilUrl: true },
  });
  const pids = pacientes.map((p) => p.id);
  const users = await prisma.pacienteUser.findMany({
    where: { pacienteId: { in: pids } },
    select: { id: true, fotoUrl: true },
  });
  const uids = users.map((u) => u.id);

  // Coleta as URLs de foto/anexo ANTES de apagar (buckets públicos → arquivo órfão
  // ficaria baixável para sempre).
  const [fotos, regFotos, checkins, registros, mensagens, posts, campeoes, nutri] = await Promise.all([
    prisma.fotoEvolucao.findMany({ where: { pacienteId: { in: pids } }, select: { imagem: true } }),
    prisma.registroFotos.findMany({ where: { pacienteId: { in: pids } }, select: { frenteUrl: true, perfilUrl: true, costasUrl: true } }),
    prisma.checkIn.findMany({ where: { pacienteId: { in: pids } }, select: { foto: true } }),
    prisma.registro.findMany({ where: { pacienteId: { in: pids } }, select: { fotoUrl: true } }),
    prisma.mensagemChat.findMany({ where: { nutricionistaId: nutriId }, select: { anexoUrl: true } }),
    prisma.feedPost.findMany({ where: { nutricionistaId: nutriId }, select: { fotoUrl: true, autorAvatarUrl: true } }),
    prisma.cicloCampeao.findMany({ where: { nutricionistaId: nutriId }, select: { fotoUrl: true } }),
    prisma.nutricionista.findUnique({ where: { id: nutriId }, select: { foto: true, logoConsultorio: true } }),
  ]);
  const urls = [
    ...pacientes.flatMap((p) => [p.fotoInicial, p.fotoPerfilUrl]),
    ...users.map((u) => u.fotoUrl),
    ...fotos.map((f) => f.imagem),
    ...regFotos.flatMap((r) => [r.frenteUrl, r.perfilUrl, r.costasUrl]),
    ...checkins.map((c) => c.foto),
    ...registros.map((r) => r.fotoUrl),
    ...mensagens.map((m) => m.anexoUrl),
    ...posts.flatMap((p) => [p.fotoUrl, p.autorAvatarUrl]),
    ...campeoes.map((c) => c.fotoUrl),
    nutri?.foto, nutri?.logoConsultorio,
  ].filter((u): u is string => !!u);

  const P = { in: pids };       // escopo por paciente
  const U = { in: uids };       // escopo por conta de login do paciente
  const N = nutriId;            // escopo por nutricionista

  // Transação atômica — filhas primeiro, mães por último.
  await prisma.$transaction([
    // ── filhas de Ciclo (por pacienteId) e por nutri ──
    prisma.cicloParticipante.deleteMany({ where: { pacienteId: P } }),
    prisma.relatorioCiclo.deleteMany({ where: { pacienteId: P } }),
    prisma.checklistDiario.deleteMany({ where: { pacienteId: P } }),
    prisma.streakMarco.deleteMany({ where: { pacienteId: P } }),
    prisma.cicloCampeao.deleteMany({ where: { nutricionistaId: N } }),
    prisma.feedEncerramento.deleteMany({ where: { nutricionistaId: N } }),
    // ── filhas de Desafio + engajamento/prontuário do paciente ──
    prisma.desafioProgresso.deleteMany({ where: { pacienteId: P } }),
    prisma.conquista.deleteMany({ where: { pacienteId: P } }),
    prisma.rankingPontuacao.deleteMany({ where: { nutricionistaId: N } }),
    prisma.pontosLog.deleteMany({ where: { pacienteId: P } }),
    prisma.anamnese.deleteMany({ where: { pacienteId: P } }),
    prisma.medicao.deleteMany({ where: { pacienteId: P } }),
    prisma.planoAlimentar.deleteMany({ where: { pacienteId: P } }),
    prisma.consulta.deleteMany({ where: { pacienteId: P } }),
    prisma.checkIn.deleteMany({ where: { pacienteId: P } }),
    prisma.registro.deleteMany({ where: { pacienteId: P } }),
    prisma.mensagemWhatsApp.deleteMany({ where: { pacienteId: P } }),
    prisma.mensagemNutri.deleteMany({ where: { nutricionistaId: N } }),
    prisma.mensagemChat.deleteMany({ where: { nutricionistaId: N } }),
    prisma.planoCobranca.deleteMany({ where: { pacienteId: P } }),
    prisma.cobranca.deleteMany({ where: { pacienteId: P } }),
    prisma.lembrete.deleteMany({ where: { nutricionistaId: N } }),
    // ── filhas em cascade (explícito por clareza) + logins/tokens do paciente ──
    prisma.fotoEvolucao.deleteMany({ where: { pacienteId: P } }),
    prisma.registroFotos.deleteMany({ where: { pacienteId: P } }),
    prisma.registroContato.deleteMany({ where: { pacienteId: P } }),
    prisma.pushSubscriptionPaciente.deleteMany({ where: { pacienteId: P } }),
    prisma.notificacaoLog.deleteMany({ where: { pacienteId: P } }),
    prisma.registroEvento.deleteMany({ where: { pacienteId: P } }),
    prisma.refreshTokenPaciente.deleteMany({ where: { pacienteUserId: U } }),
    prisma.tokenVerificacaoEmailPaciente.deleteMany({ where: { pacienteUserId: U } }),
    prisma.tokenRedefinicaoPaciente.deleteMany({ where: { pacienteUserId: U } }),
    prisma.pacienteUser.deleteMany({ where: { pacienteId: P } }),
    prisma.feedPost.deleteMany({ where: { nutricionistaId: N } }),
    // ── mães intermediárias do nutri (agora sem filhas) ──
    prisma.ciclo.deleteMany({ where: { nutricionistaId: N } }),
    prisma.desafio.deleteMany({ where: { nutricionistaId: N } }),
    prisma.rankingConfig.deleteMany({ where: { nutricionistaId: N } }),
    prisma.horarioDisponivel.deleteMany({ where: { nutricionistaId: N } }),
    prisma.pushSubscription.deleteMany({ where: { nutricionistaId: N } }),
    prisma.tokenRedefinicao.deleteMany({ where: { nutricionistaId: N } }),
    prisma.tokenVerificacaoEmail.deleteMany({ where: { nutricionistaId: N } }),
    prisma.refreshToken.deleteMany({ where: { nutricionistaId: N } }),
    // ── pacientes (sem filhas) e, por fim, a conta do nutri ──
    prisma.paciente.deleteMany({ where: { nutricionistaId: N } }),
    prisma.nutricionista.delete({ where: { id: N } }),
  ]);

  // Fotos do storage — só depois que a transação confirmou (best-effort).
  await Promise.allSettled(urls.map((u) => deleteFotoPorUrl(u)));
}
