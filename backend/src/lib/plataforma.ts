import crypto from "crypto";
import prisma from "./prisma";
import { hashSenha } from "./senha";

// A "nutri-plataforma" é uma conta Nutricionista interna (a própria Nexvel) que
// serve de dono para os pacientes B2C do marketplace (cadastro avulso, sem
// clínica). Assim o FK obrigatório `Paciente.nutricionistaId` continua válido e
// NADA do fluxo B2B precisa mudar. Ela nunca faz login (senha aleatória) e é
// marcada com plano/status "ativo" para ficar fora dos crons de trial/cobrança.
const PLATAFORMA_EMAIL = "plataforma@nexvel.tech";
let cacheId: string | null = null;

export async function getPlataformaNutriId(): Promise<string> {
  if (cacheId) return cacheId;

  const existente = await prisma.nutricionista.findUnique({
    where: { email: PLATAFORMA_EMAIL },
    select: { id: true },
  });
  if (existente) return (cacheId = existente.id);

  const senha = await hashSenha(crypto.randomBytes(24).toString("hex"));
  try {
    const criada = await prisma.nutricionista.create({
      data: {
        nome: "Nexvel",
        email: PLATAFORMA_EMAIL,
        senha,
        crn: "PLATAFORMA",
        tipoProfissional: "plataforma",
        plano: "plataforma",
        planoAtivo: true,
        subscriptionStatus: "ativo",
        emailVerificado: true,
      },
      select: { id: true },
    });
    return (cacheId = criada.id);
  } catch (e: unknown) {
    // Corrida: outro signup criou a conta primeiro → rebusca.
    if ((e as { code?: string })?.code === "P2002") {
      const nutri = await prisma.nutricionista.findUnique({ where: { email: PLATAFORMA_EMAIL }, select: { id: true } });
      if (nutri) return (cacheId = nutri.id);
    }
    throw e;
  }
}
