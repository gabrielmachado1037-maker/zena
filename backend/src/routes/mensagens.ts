import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { enviarNotificacaoPaciente } from "./notificacoes";
import { uploadImagemChat, UploadError } from "../lib/supabase";

const router = Router();
router.use(authMiddleware);

/* ───────────────────────── Chat bidirecional (tela Mensagens) ───────────────────────── */

function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// GET /api/mensagens/conversas — Inbox: pacientes do nutri + última mensagem + não lidos + contexto.
router.get("/conversas", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId as string;

  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId, ativo: true },
    include: { consultas: { orderBy: { data: "desc" }, take: 1 } },
  });

  const msgs = await prisma.mensagemChat.findMany({
    where: { nutricionistaId },
    orderBy: { criadoEm: "asc" },
  });

  // Agrupa por paciente: última mensagem + contagem de não lidas (autor=paciente).
  const ultima = new Map<string, (typeof msgs)[number]>();
  const naoLidas = new Map<string, number>();
  for (const m of msgs) {
    ultima.set(m.pacienteId, m); // asc → sobrescreve com a mais recente
    if (m.autor === "paciente" && !m.lida) {
      naoLidas.set(m.pacienteId, (naoLidas.get(m.pacienteId) ?? 0) + 1);
    }
  }

  const agora = new Date();
  const conversas = pacientes.map((p) => {
    const last = ultima.get(p.id);
    const consulta = p.consultas[0];
    return {
      id: p.id,
      nome: p.nome,
      avatarUrl: p.fotoPerfilUrl ?? null,
      canal: p.telefone ? "whatsapp" : "app",
      previa: last?.conteudo ?? "Nenhuma mensagem ainda",
      ultimaAtividade: last?.criadoEm ?? null,
      naoLidoCount: naoLidas.get(p.id) ?? 0,
      online: p.ultimoCheckin ? mesmoDia(p.ultimoCheckin, agora) : false,
      objetivo: p.objetivo,
      ligaAtual: `${p.ligaAtual} ${p.ligaNivel}`,
      streak: `${p.streakAtual} ${p.streakAtual === 1 ? "Dia" : "Dias"}`,
      ultimaConsulta: consulta?.data ?? null,
    };
  });

  // Ordena: quem tem atividade mais recente primeiro; sem mensagem vai pro fim (por nome).
  conversas.sort((a, b) => {
    const ta = a.ultimaAtividade ? new Date(a.ultimaAtividade).getTime() : 0;
    const tb = b.ultimaAtividade ? new Date(b.ultimaAtividade).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return a.nome.localeCompare(b.nome);
  });

  res.json(conversas);
});

// GET /api/mensagens/thread/:pacienteId — mensagens da conversa (asc) + marca as do paciente como lidas.
router.get("/thread/:pacienteId", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId as string;
  const pacienteId = req.params["pacienteId"] as string;

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  const nutri = await prisma.nutricionista.findUnique({
    where: { id: nutricionistaId },
    select: { foto: true },
  });

  const mensagens = await prisma.mensagemChat.findMany({
    where: { nutricionistaId, pacienteId },
    orderBy: { criadoEm: "asc" },
  });

  // Marca como lidas as mensagens que o paciente mandou.
  await prisma.mensagemChat.updateMany({
    where: { nutricionistaId, pacienteId, autor: "paciente", lida: false },
    data: { lida: true },
  });

  res.json({
    pacienteAvatarUrl: paciente.fotoPerfilUrl ?? null,
    nutriAvatarUrl: nutri?.foto ?? null,
    mensagens: mensagens.map((m) => ({
      id: m.id,
      autor: m.autor,
      conteudo: m.conteudo,
      anexoUrl: m.anexoUrl,
      criadoEm: m.criadoEm,
    })),
  });
});

// POST /api/mensagens/thread/:pacienteId — nutri envia uma mensagem (persiste + notifica paciente).
router.post("/thread/:pacienteId", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId as string;
  const pacienteId = req.params["pacienteId"] as string;
  const conteudo = String(req.body?.conteudo ?? "").trim();
  const anexoBase64 = typeof req.body?.anexoBase64 === "string" ? req.body.anexoBase64 : "";

  if (!conteudo && !anexoBase64) return res.status(400).json({ error: "Mensagem vazia" });

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  let anexoUrl: string | null = null;
  if (anexoBase64) {
    if (!anexoBase64.startsWith("data:image/")) {
      return res.status(400).json({ error: "Anexo inválido (apenas imagens)" });
    }
    try {
      anexoUrl = await uploadImagemChat(`chat/${nutricionistaId}/${pacienteId}/${Date.now()}.jpg`, anexoBase64);
    } catch (e) {
      if (e instanceof UploadError) return res.status(400).json({ error: e.message });
      return res.status(502).json({ error: "Falha ao enviar o anexo. Tente novamente." });
    }
  }

  const msg = await prisma.mensagemChat.create({
    data: { nutricionistaId, pacienteId, autor: "nutri", conteudo, anexoUrl, lida: true },
  });

  // Notificação push (best-effort; helper já ignora se não houver VAPID/subscription).
  try {
    const previa = conteudo || "📷 Enviou uma imagem";
    await enviarNotificacaoPaciente(
      pacienteId,
      "Nova mensagem da sua nutri",
      previa.length > 80 ? previa.slice(0, 77) + "..." : previa,
      "/paciente/dashboard",
    );
  } catch {
    /* silencioso */
  }

  res.json({ id: msg.id, autor: msg.autor, conteudo: msg.conteudo, anexoUrl: msg.anexoUrl, criadoEm: msg.criadoEm });
});

// PATCH /api/mensagens/thread/:pacienteId/lida — marca conversa como lida.
router.patch("/thread/:pacienteId/lida", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId as string;
  const pacienteId = req.params["pacienteId"] as string;

  await prisma.mensagemChat.updateMany({
    where: { nutricionistaId, pacienteId, autor: "paciente", lida: false },
    data: { lida: true },
  });
  res.json({ ok: true });
});

/* ───────────────────────── Legado: log de WhatsApp (mantido, não usado pelo front novo) ───────────────────────── */

router.post("/", async (req: AuthRequest, res: Response) => {
  const { pacienteId, template, textoEnviado } = req.body;

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId as string },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  const msg = await prisma.mensagemWhatsApp.create({
    data: { pacienteId, template, textoEnviado },
  });
  res.json(msg);
});

router.get("/paciente/:pacienteId", async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["pacienteId"] as string;

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId as string },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  const msgs = await prisma.mensagemWhatsApp.findMany({
    where: { pacienteId },
    orderBy: { criadoEm: "desc" },
    take: 30,
  });
  res.json(msgs);
});

export default router;
