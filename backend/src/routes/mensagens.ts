import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { NotificationEngine } from "../services/notificationEngine";
import { uploadImagemChat, UploadError } from "../lib/supabase";
import { parseMsgPaginacao, buscarPaginaMensagens } from "../lib/mensagensPaginacao";

const router = Router();
router.use(authMiddleware);

const enviarMensagemSchema = z.object({
  conteudo: z.string().optional().nullable(),
  anexoBase64: z.string().optional().nullable(),
});
const mensagemLegadoSchema = z.object({
  pacienteId: z.string({ error: "pacienteId é obrigatório" }).min(1, "pacienteId é obrigatório"),
  template: z.string().optional().nullable(),
  textoEnviado: z.string().optional().nullable(),
});

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

  // Escala: em vez de carregar TODAS as mensagens do nutri, derivamos por paciente
  // direto no banco — 1 linha por paciente (última mensagem) + contagem de não-lidas.
  const ultimasMsgs = await prisma.$queryRaw<
    Array<{ pacienteId: string; conteudo: string; criadoEm: Date }>
  >`
    SELECT DISTINCT ON ("pacienteId") "pacienteId", "conteudo", "criadoEm"
    FROM "MensagemChat"
    WHERE "nutricionistaId" = ${nutricionistaId}
    ORDER BY "pacienteId", "criadoEm" DESC
  `;
  const ultima = new Map(ultimasMsgs.map((m) => [m.pacienteId, m]));

  const naoLidasGrp = await prisma.mensagemChat.groupBy({
    by: ["pacienteId"],
    where: { nutricionistaId, autor: "paciente", lida: false },
    _count: { _all: true },
  });
  const naoLidas = new Map(naoLidasGrp.map((g) => [g.pacienteId, g._count._all]));

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

// GET /api/mensagens/thread/:pacienteId — página de mensagens (asc), mais recentes primeiro.
// 1ª página (sem ?before): inclui contexto do paciente e marca as do paciente como lidas.
// Páginas anteriores (?before=<cursor>): só as mensagens + cursor (nada de contexto/marcar).
router.get("/thread/:pacienteId", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId as string;
  const pacienteId = req.params["pacienteId"] as string;

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  const { limit, before } = parseMsgPaginacao(req.query as Record<string, unknown>);
  const { pagina, hasMore, nextCursor } = await buscarPaginaMensagens(
    { nutricionistaId, pacienteId }, limit, before,
  );
  const mensagens = pagina.map((m) => ({
    id: m.id, autor: m.autor, conteudo: m.conteudo, anexoUrl: m.anexoUrl, criadoEm: m.criadoEm,
  }));

  // Página anterior (scroll pra cima): só o histórico, sem recomputar contexto/marcar lida.
  if (before) {
    return res.json({ mensagens, hasMore, nextCursor });
  }

  const nutri = await prisma.nutricionista.findUnique({
    where: { id: nutricionistaId },
    select: { foto: true },
  });

  // Marca como lidas as mensagens que o paciente mandou (só ao abrir a conversa).
  await prisma.mensagemChat.updateMany({
    where: { nutricionistaId, pacienteId, autor: "paciente", lida: false },
    data: { lida: true },
  });

  // Contexto do paciente para o cabeçalho do chat (liga/score/sequência/último check-in).
  const agora = new Date();
  const ini30 = new Date(agora);
  ini30.setDate(ini30.getDate() - 29);
  ini30.setHours(0, 0, 0, 0);
  const checkins30 = await prisma.registro.count({
    where: { pacienteId, finalizado: true, data: { gte: ini30 } },
  });

  res.json({
    pacienteAvatarUrl: paciente.fotoPerfilUrl ?? null,
    nutriAvatarUrl: nutri?.foto ?? null,
    paciente: {
      id: paciente.id,
      nome: paciente.nome,
      avatarUrl: paciente.fotoPerfilUrl ?? null,
      objetivo: paciente.objetivo,
      ligaAtual: `${paciente.ligaAtual} ${paciente.ligaNivel}`,
      streak: paciente.streakAtual,
      ultimoCheckin: paciente.ultimoCheckin ?? null,
      online: paciente.ultimoCheckin ? mesmoDia(paciente.ultimoCheckin, agora) : false,
      score: Math.min(100, Math.round((checkins30 / 30) * 100)),
    },
    mensagens,
    hasMore,
    nextCursor,
  });
});

// GET /api/mensagens/nao-lidas — total de mensagens de pacientes ainda não lidas (badge da barra).
router.get("/nao-lidas", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId as string;
  const total = await prisma.mensagemChat.count({
    where: { nutricionistaId, autor: "paciente", lida: false },
  });
  res.json({ total });
});

// POST /api/mensagens/thread/:pacienteId — nutri envia uma mensagem (persiste + notifica paciente).
router.post("/thread/:pacienteId", validateBody(enviarMensagemSchema), async (req: AuthRequest, res: Response) => {
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

  // Notificação push via NotificationEngine (respeita preferência/quiet-hours/log).
  {
    const previa = conteudo || "📷 Enviou uma imagem";
    NotificationEngine.enviar(pacienteId, "mensagem", {
      titulo: "💬 Sua nutricionista enviou uma nova mensagem",
      corpo: previa.length > 80 ? previa.slice(0, 77) + "..." : previa,
      destination: "conversation_paciente",
    }).catch(() => {});
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

router.post("/", validateBody(mensagemLegadoSchema), async (req: AuthRequest, res: Response) => {
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
