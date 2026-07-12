import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { uploadFoto, UploadError } from "../lib/supabase";
import { validateBody } from "../middleware/validate";

const router = Router();

const checkinSchema = z.object({
  humor: z.string({ error: "humor e adesao são obrigatórios" }).trim().min(1, "humor e adesao são obrigatórios"),
  adesao: z.number({ error: "humor e adesao são obrigatórios" }),
  peso: z.union([z.number(), z.string()]).optional().nullable(),
  foto: z.string().optional().nullable(),
  nota: z.string().optional().nullable(),
});

const agendarSchema = z.object({
  data: z.string({ error: "data e hora são obrigatórios" }).trim().min(1, "data e hora são obrigatórios"),
  hora: z.string({ error: "data e hora são obrigatórios" }).trim().min(1, "data e hora são obrigatórios"),
});

// Só os campos do modelo Anamnese; z.object descarta chaves desconhecidas (evita mass-assignment no upsert).
const anamneseSchema = z.object({
  queixaPrincipal: z.string().optional().nullable(),
  historicoDieta: z.string().optional().nullable(),
  restricoes: z.string().optional().nullable(),
  medicamentos: z.string().optional().nullable(),
  condicoesSaude: z.string().optional().nullable(),
  nivelAtividade: z.string().optional().nullable(),
  horasSono: z.number().int().optional().nullable(),
  nivelEstresse: z.number().int().optional().nullable(),
  refeicoesDia: z.number().int().optional().nullable(),
  comeCozinha: z.boolean().optional().nullable(),
  comeForaCasa: z.number().int().optional().nullable(),
  consumoAgua: z.number().optional().nullable(),
  motivacao: z.string().optional().nullable(),
  expectativas: z.string().optional().nullable(),
});

function getISOWeekData(date: Date): { semana: number; ano: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { semana, ano: d.getUTCFullYear() };
}

router.get("/paciente/:link", async (req: Request, res: Response) => {
  const link = req.params["link"] as string;
  const paciente = await prisma.paciente.findUnique({
    where: { linkUnico: link },
    include: {
      nutricionista: { select: { nome: true, nomeConsultorio: true, logoConsultorio: true } },
      medicoes: { orderBy: { data: "asc" } },
      planosAlimentares: { orderBy: { dataCriacao: "desc" }, take: 1 },
      consultas: { orderBy: { data: "asc" }, take: 5 },
      checkIns: { orderBy: { criadoEm: "desc" }, take: 20 },
      anamnese: true,
    },
  });

  if (!paciente) return res.status(404).json({ error: "Link inválido" });

  const now = new Date();
  const proximasConsultas = paciente.consultas
    .filter((c) => new Date(c.data) >= now && c.status !== "cancelada")
    .slice(0, 1);

  res.json({ ...paciente, consultas: proximasConsultas });
});

router.post("/paciente/:link/checkin", validateBody(checkinSchema), async (req: Request, res: Response) => {
  const link = req.params["link"] as string;
  const paciente = await prisma.paciente.findUnique({ where: { linkUnico: link } });
  if (!paciente) return res.status(404).json({ error: "Link inválido" });

  const { humor, adesao, peso, foto, nota } = req.body;

  if (foto && foto.length > 1100000) {
    return res.status(400).json({ error: "Foto muito grande. Tente uma foto menor." });
  }

  const { semana, ano } = getISOWeekData(new Date());

  // Upload photo to Supabase Storage; fall back to null on error (never block a check-in)
  let fotoUrl: string | null = null;
  if (foto) {
    try {
      fotoUrl = await uploadFoto(`checkins/${paciente.id}/${semana}-${ano}.jpg`, foto);
    } catch (e) {
      if (e instanceof UploadError) return res.status(400).json({ error: e.message });
      // Supabase indisponível — segue sem foto, mantém o check-in
    }
  }

  const checkIn = await prisma.checkIn.upsert({
    where: { pacienteId_semana_ano: { pacienteId: paciente.id, semana, ano } },
    update: { humor, adesao, peso: peso ? parseFloat(peso) : null, foto: fotoUrl, nota },
    create: {
      pacienteId: paciente.id,
      semana,
      ano,
      humor,
      adesao,
      peso: peso ? parseFloat(peso) : null,
      foto: fotoUrl,
      nota: nota || null,
    },
  });

  res.json(checkIn);
});

router.patch("/paciente/:link/consulta/:consultaId/confirmar", async (req: Request, res: Response) => {
  const link = req.params["link"] as string;
  const consultaId = req.params["consultaId"] as string;
  const paciente = await prisma.paciente.findUnique({ where: { linkUnico: link } });
  if (!paciente) return res.status(404).json({ error: "Link inválido" });

  // Escopo: a consulta precisa ser do próprio paciente do link (evita IDOR por id de consulta).
  const alvo = await prisma.consulta.findFirst({ where: { id: consultaId, pacienteId: paciente.id } });
  if (!alvo) return res.status(404).json({ error: "Consulta não encontrada" });

  const consulta = await prisma.consulta.update({
    where: { id: consultaId },
    data: { status: "confirmada" },
  });
  res.json(consulta);
});

router.patch("/paciente/:link/consulta/:consultaId/remarcar", async (req: Request, res: Response) => {
  const link = req.params["link"] as string;
  const consultaId = req.params["consultaId"] as string;
  const paciente = await prisma.paciente.findUnique({ where: { linkUnico: link } });
  if (!paciente) return res.status(404).json({ error: "Link inválido" });

  // Escopo: a consulta precisa ser do próprio paciente do link (evita IDOR por id de consulta).
  const alvo = await prisma.consulta.findFirst({ where: { id: consultaId, pacienteId: paciente.id } });
  if (!alvo) return res.status(404).json({ error: "Consulta não encontrada" });

  const consulta = await prisma.consulta.update({
    where: { id: consultaId },
    data: { status: "remarcacao_solicitada" },
  });
  res.json(consulta);
});

router.get("/paciente/:link/anamnese", async (req: Request, res: Response) => {
  const link = req.params["link"] as string;
  const paciente = await prisma.paciente.findUnique({ where: { linkUnico: link } });
  if (!paciente) return res.status(404).json({ error: "Link inválido" });

  const anamnese = await prisma.anamnese.findUnique({ where: { pacienteId: paciente.id } });
  res.json(anamnese || null);
});

router.post("/paciente/:link/anamnese", async (req: Request, res: Response) => {
  const link = req.params["link"] as string;
  const paciente = await prisma.paciente.findUnique({ where: { linkUnico: link } });
  if (!paciente) return res.status(404).json({ error: "Link inválido" });

  // Valida + descarta chaves fora do modelo (defense-in-depth contra mass-assignment no spread).
  const parsed = anamneseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }
  const data = parsed.data;
  const anamnese = await prisma.anamnese.upsert({
    where: { pacienteId: paciente.id },
    update: data,
    create: { pacienteId: paciente.id, ...data },
  });
  res.json(anamnese);
});

router.get("/paciente/:link/horarios-disponiveis", async (req: Request, res: Response) => {
  const link = req.params["link"] as string;
  const paciente = await prisma.paciente.findUnique({
    where: { linkUnico: link },
    include: { nutricionista: true },
  });
  if (!paciente) return res.status(404).json({ error: "Link inválido" });

  const horarios = await prisma.horarioDisponivel.findMany({
    where: { nutricionistaId: paciente.nutricionistaId, ativo: true },
    orderBy: [{ diaSemana: "asc" }, { hora: "asc" }],
  });

  const slots: Array<{ data: string; hora: string; diaSemana: number }> = [];
  const now = new Date();

  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const diaSemana = d.getDay();
    const dataStr = d.toISOString().split("T")[0];

    const horariosNoDia = horarios.filter((h) => h.diaSemana === diaSemana);
    for (const h of horariosNoDia) {
      const dataHora = new Date(`${dataStr}T${h.hora}:00`);
      if (dataHora > now) {
        slots.push({ data: dataStr, hora: h.hora, diaSemana });
      }
    }
  }

  const consultasJaAgendadas = await prisma.consulta.findMany({
    where: {
      paciente: { nutricionistaId: paciente.nutricionistaId },
      data: { gte: now },
      status: { notIn: ["cancelada"] },
    },
    select: { data: true },
  });

  const ocupados = new Set(
    consultasJaAgendadas.map((c) => {
      const d = new Date(c.data);
      return `${d.toISOString().split("T")[0]}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    })
  );

  const slotsLivres = slots.filter((s) => !ocupados.has(`${s.data}T${s.hora}`));
  res.json(slotsLivres);
});

router.post("/paciente/:link/agendar", validateBody(agendarSchema), async (req: Request, res: Response) => {
  const link = req.params["link"] as string;
  const paciente = await prisma.paciente.findUnique({ where: { linkUnico: link } });
  if (!paciente) return res.status(404).json({ error: "Link inválido" });

  const { data, hora } = req.body;

  const dataHora = new Date(`${data}T${hora}:00`);
  if (isNaN(dataHora.getTime())) return res.status(400).json({ error: "Data inválida" });

  const consulta = await prisma.consulta.create({
    data: {
      pacienteId: paciente.id,
      data: dataHora,
      status: "aguardando_confirmacao",
    },
  });
  res.json(consulta);
});

export default router;
