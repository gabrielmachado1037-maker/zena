import prisma from "./prisma";
import { deleteFotoPorUrl } from "./supabase";

// LGPD — direito de eliminação. Apaga dados pessoais/biométricos, o login, as fotos
// E o prontuário clínico (dado de saúde: anamnese, medições, registros, check-ins,
// planos e consultas). O cadastro é mantido apenas como âncora anonimizada para os
// registros financeiros/fiscais (retenção legal). Usado tanto pelo próprio paciente
// (DELETE /paciente-app/conta) quanto pela nutri (DELETE /pacientes/:id).
// Irreversível por design.
export async function anonimizarPaciente(pid: string): Promise<void> {
  // 1) Remove TODAS as fotos/anexos (dado biométrico) do storage — best-effort.
  //    Inclui evolução, registro-fotos, avatar, foto do check-in semanal, foto do
  //    diário, anexos do chat e fotos do feed (os buckets são públicos → a URL
  //    continuaria baixável para sempre se não deletarmos o arquivo).
  const [fotos, regFotos, pac, checkins, registros, mensagens, posts] = await Promise.all([
    prisma.fotoEvolucao.findMany({ where: { pacienteId: pid }, select: { imagem: true } }),
    prisma.registroFotos.findMany({ where: { pacienteId: pid }, select: { frenteUrl: true, perfilUrl: true, costasUrl: true } }),
    prisma.paciente.findUnique({ where: { id: pid }, select: { fotoInicial: true, fotoPerfilUrl: true } }),
    prisma.checkIn.findMany({ where: { pacienteId: pid }, select: { foto: true } }),
    prisma.registro.findMany({ where: { pacienteId: pid }, select: { fotoUrl: true } }),
    prisma.mensagemChat.findMany({ where: { pacienteId: pid }, select: { anexoUrl: true } }),
    prisma.feedPost.findMany({ where: { pacienteId: pid }, select: { fotoUrl: true, autorAvatarUrl: true } }),
  ]);
  const urls = [
    ...fotos.map((f) => f.imagem),
    ...regFotos.flatMap((r) => [r.frenteUrl, r.perfilUrl, r.costasUrl]),
    pac?.fotoInicial, pac?.fotoPerfilUrl,
    ...checkins.map((c) => c.foto),
    ...registros.map((r) => r.fotoUrl),
    ...mensagens.map((m) => m.anexoUrl),
    ...posts.flatMap((p) => [p.fotoUrl, p.autorAvatarUrl]),
  ].filter((u): u is string => !!u);
  await Promise.allSettled(urls.map((u) => deleteFotoPorUrl(u)));

  // 2) Apaga PII/posts/mensagens/dispositivos, anonimiza cadastro + comentários e
  //    remove o login (atômico). Cancela o convite: paciente removido não vincula conta.
  await prisma.$transaction([
    prisma.fotoEvolucao.deleteMany({ where: { pacienteId: pid } }),
    prisma.registroFotos.deleteMany({ where: { pacienteId: pid } }),
    prisma.feedPost.deleteMany({ where: { pacienteId: pid } }),
    prisma.mensagemChat.deleteMany({ where: { pacienteId: pid } }),
    prisma.pushSubscriptionPaciente.deleteMany({ where: { pacienteId: pid } }),
    // Nome real do paciente em comentários que ele fez em posts de OUTROS pacientes.
    prisma.feedComentario.updateMany({ where: { autorId: pid, autorTipo: "PACIENTE" }, data: { autorNome: "Paciente removido", autorAvatarUrl: null } }),
    // Prontuário clínico / dado de saúde — eliminação plena (direito de exclusão LGPD).
    prisma.anamnese.deleteMany({ where: { pacienteId: pid } }),
    prisma.medicao.deleteMany({ where: { pacienteId: pid } }),
    prisma.planoAlimentar.deleteMany({ where: { pacienteId: pid } }),
    prisma.consulta.deleteMany({ where: { pacienteId: pid } }),
    prisma.checkIn.deleteMany({ where: { pacienteId: pid } }),
    prisma.registro.deleteMany({ where: { pacienteId: pid } }),
    prisma.paciente.update({
      where: { id: pid },
      data: {
        nome: "Paciente removido", email: null, telefone: null,
        dataNascimento: null, sexo: null, fotoInicial: null, fotoPerfilUrl: null,
        ativo: false, anonimizadoEm: new Date(),
        conviteCodigo: null, conviteStatus: "cancelado", conviteExpiraEm: null,
      },
    }),
    prisma.pacienteUser.deleteMany({ where: { pacienteId: pid } }),
  ]);
}
