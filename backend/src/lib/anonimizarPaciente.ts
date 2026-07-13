import prisma from "./prisma";
import { deleteFotoPorUrl } from "./supabase";

// LGPD — direito de exclusão. Anonimiza os dados pessoais/biométricos do paciente,
// remove o login e as fotos, e preserva o prontuário clínico anonimizado.
// Usado tanto pelo próprio paciente (DELETE /paciente-app/conta) quanto pela nutri
// (DELETE /pacientes/:id). Irreversível por design.
export async function anonimizarPaciente(pid: string): Promise<void> {
  // 1) Remove as fotos (dado biométrico) do storage — best-effort.
  const [fotos, regFotos, pac] = await Promise.all([
    prisma.fotoEvolucao.findMany({ where: { pacienteId: pid }, select: { imagem: true } }),
    prisma.registroFotos.findMany({ where: { pacienteId: pid }, select: { frenteUrl: true, perfilUrl: true, costasUrl: true } }),
    prisma.paciente.findUnique({ where: { id: pid }, select: { fotoInicial: true, fotoPerfilUrl: true } }),
  ]);
  const urls = [
    ...fotos.map((f) => f.imagem),
    ...regFotos.flatMap((r) => [r.frenteUrl, r.perfilUrl, r.costasUrl]),
    pac?.fotoInicial, pac?.fotoPerfilUrl,
  ].filter((u): u is string => !!u);
  await Promise.allSettled(urls.map((u) => deleteFotoPorUrl(u)));

  // 2) Apaga fotos/posts/dispositivos e anonimiza o cadastro + remove o login (atômico).
  //    Cancela o convite: um paciente removido não pode mais vincular conta.
  await prisma.$transaction([
    prisma.fotoEvolucao.deleteMany({ where: { pacienteId: pid } }),
    prisma.registroFotos.deleteMany({ where: { pacienteId: pid } }),
    prisma.feedPost.deleteMany({ where: { pacienteId: pid } }),
    prisma.pushSubscriptionPaciente.deleteMany({ where: { pacienteId: pid } }),
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
