import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { enviarNotificacaoPaciente } from "./notificacoes";
import { duracaoValida, recompensaDe, DURACOES_DESAFIO, MAX_DESAFIOS_ATIVOS } from "../config/desafios";

const router = Router();
router.use(authMiddleware);

/** Dado um conjunto de pacientes, retorna só os que estão abaixo do limite de desafios ativos. */
async function filtrarSobLimite(ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const grupos = await prisma.desafioProgresso.groupBy({
    by: ["pacienteId"],
    where: { pacienteId: { in: ids }, concluido: false, encerradoEm: null },
    _count: { _all: true },
  });
  const ativos = new Map(grupos.map((g) => [g.pacienteId, g._count._all]));
  return ids.filter((pid) => (ativos.get(pid) ?? 0) < MAX_DESAFIOS_ATIVOS);
}

/**
 * Centro de Desafios (nutricionista). Reutiliza os models Desafio/DesafioProgresso.
 * Vocabulário de status: rascunho | em_curso | encerrado. ("ativo" legado = em_curso.)
 * TUDO escopado por nutricionistaId (multi-tenant). Métricas só de dados reais.
 */

const EM_CURSO = ["em_curso", "ativo"];
const DIA = 86_400_000;

type ProgRow = { progresso: number; concluido: boolean };

/** Métricas de um desafio a partir das linhas de DesafioProgresso. Vazio => null (Sem dados). */
function metricas(rows: ProgRow[]) {
  const participantes = rows.length;
  if (participantes === 0) return { participantes: 0, taxaConclusao: null as number | null, adesaoMedia: null as number | null };
  const concluidos = rows.filter((r) => r.concluido).length;
  const soma = rows.reduce((s, r) => s + r.progresso, 0);
  return {
    participantes,
    taxaConclusao: Math.round((concluidos / participantes) * 100),
    adesaoMedia: Math.round(soma / participantes),
  };
}

function diasRestantes(dataFim: Date | null): number | null {
  if (!dataFim) return null;
  const hoje = new Date();
  const fim = new Date(dataFim);
  return Math.max(0, Math.ceil((fim.getTime() - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()) / DIA));
}

/** GET /api/desafios/resumo — KPIs do topo + desafios com baixa adesão. */
router.get("/resumo", async (req: AuthRequest, res: Response) => {
  const id = req.nutricionistaId!;
  const desafios = await prisma.desafio.findMany({
    where: { nutricionistaId: id, status: { in: EM_CURSO } },
    select: { id: true, titulo: true, progresso: { select: { progresso: true, concluido: true } } },
  });

  const todas: ProgRow[] = desafios.flatMap((d) => d.progresso);
  const geral = metricas(todas);

  const baixaAdesao = desafios
    .map((d) => ({ id: d.id, titulo: d.titulo, ...metricas(d.progresso) }))
    .filter((d) => d.participantes > 0 && (d.adesaoMedia ?? 100) < 40)
    .sort((a, b) => (a.adesaoMedia ?? 0) - (b.adesaoMedia ?? 0));

  res.json({
    kpis: {
      participantes: geral.participantes,
      taxaConclusao: geral.taxaConclusao,
      adesaoMedia: geral.adesaoMedia,
    },
    baixaAdesao,
  });
});

/** GET /api/desafios?status=em_curso|encerrado — lista com métricas por card. */
router.get("/", async (req: AuthRequest, res: Response) => {
  const id = req.nutricionistaId!;
  const filtro = req.query.status === "encerrado" ? ["encerrado"] : EM_CURSO;

  const desafios = await prisma.desafio.findMany({
    where: { nutricionistaId: id, status: { in: filtro } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, titulo: true, descricao: true, tipo: true, icone: true, status: true,
      metaValor: true, metaUnidade: true, dataInicio: true, dataFim: true, pontosBonus: true,
      progresso: { select: { progresso: true, concluido: true } },
    },
  });

  res.json(desafios.map((d) => ({
    id: d.id, titulo: d.titulo, descricao: d.descricao, categoria: d.tipo, icone: d.icone,
    status: d.status, metaValor: d.metaValor, metaUnidade: d.metaUnidade,
    dataInicio: d.dataInicio, dataFim: d.dataFim, pontosBonus: d.pontosBonus,
    diasRestantes: diasRestantes(d.dataFim),
    ...metricas(d.progresso),
  })));
});

/** GET /api/desafios/:id — detalhe + participantes. */
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const id = req.nutricionistaId!;
  const d = await prisma.desafio.findFirst({
    where: { id: (req.params.id as string), nutricionistaId: id },
    include: {
      progresso: {
        include: { paciente: { select: { id: true, nome: true, fotoPerfilUrl: true } } },
        orderBy: { progresso: "desc" },
      },
    },
  });
  if (!d) return res.status(404).json({ error: "Desafio não encontrado" });

  const rows = d.progresso.map((p) => ({ progresso: p.progresso, concluido: p.concluido }));
  res.json({
    id: d.id, titulo: d.titulo, descricao: d.descricao, categoria: d.tipo, icone: d.icone,
    status: d.status, metaValor: d.metaValor, metaUnidade: d.metaUnidade,
    dataInicio: d.dataInicio, dataFim: d.dataFim, pontosBonus: d.pontosBonus,
    diasRestantes: diasRestantes(d.dataFim),
    ...metricas(rows), // participantes (contagem), taxaConclusao, adesaoMedia
    lista: d.progresso.map((p) => ({
      pacienteId: p.pacienteId, nome: p.paciente.nome, foto: p.paciente.fotoPerfilUrl,
      progresso: p.progresso, concluido: p.concluido, atualizadoEm: p.atualizadoEm,
    })),
  });
});

/** POST /api/desafios — cria desafio. Opcional: inscrever todos os pacientes ativos. */
router.post("/", async (req: AuthRequest, res: Response) => {
  const id = req.nutricionistaId!;
  const {
    titulo, descricao, categoria, tipo, metaValor, metaUnidade,
    dataInicio, duracaoDias, icone, status,
    inscreverTodos, pacienteIds,
  } = req.body;

  if (!titulo?.trim()) return res.status(400).json({ error: "Título é obrigatório" });

  // Duração restrita a 7/14/21; recompensa derivada da duração (nunca manual).
  const dur = Number(duracaoDias);
  if (!duracaoValida(dur)) {
    return res.status(400).json({ error: `Duração deve ser ${DURACOES_DESAFIO.join(", ")} dias.` });
  }
  const inicio = dataInicio ? new Date(dataInicio) : new Date();
  // Fim sempre derivado da duração — janela e duracaoDias nunca divergem.
  const fim = new Date(inicio.getTime() + dur * DIA);

  const desafio = await prisma.desafio.create({
    data: {
      nutricionistaId: id,
      titulo: titulo.trim(),
      descricao: descricao?.trim() || null,
      tipo: categoria || tipo || "custom",
      metaValor: metaValor != null ? Number(metaValor) : null,
      metaUnidade: metaUnidade?.trim() || null,
      duracaoDias: dur,
      dataInicio: inicio,
      dataFim: fim,
      icone: icone || "🎯",
      pontosBonus: recompensaDe(dur),
      status: status || "rascunho",
    },
  });

  // Inscrição inicial (opcional), respeitando o limite de desafios ativos por paciente.
  let ids: string[] = Array.isArray(pacienteIds) ? pacienteIds : [];
  if (inscreverTodos) {
    const ativos = await prisma.paciente.findMany({ where: { nutricionistaId: id, ativo: true }, select: { id: true } });
    ids = ativos.map((p) => p.id);
  }
  const elegiveis = await filtrarSobLimite(ids);
  if (elegiveis.length) {
    await prisma.desafioProgresso.createMany({
      data: elegiveis.map((pid) => ({ desafioId: desafio.id, pacienteId: pid })),
      skipDuplicates: true,
    });
  }

  res.status(201).json({ id: desafio.id, inscritos: elegiveis.length, ignoradosLimite: ids.length - elegiveis.length });
});

/** PATCH /api/desafios/:id — atualiza campos ou executa ação (ativar|encerrar). */
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  const id = req.nutricionistaId!;
  const dono = await prisma.desafio.findFirst({ where: { id: (req.params.id as string), nutricionistaId: id }, select: { id: true, dataInicio: true } });
  if (!dono) return res.status(404).json({ error: "Desafio não encontrado" });

  const { acao, titulo, descricao, categoria, metaValor, metaUnidade, dataInicio, dataFim, icone, pontosBonus, status } = req.body;
  const data: Record<string, unknown> = {};

  if (acao === "ativar") { data.status = "em_curso"; if (!dono.dataInicio) data.dataInicio = new Date(); }
  else if (acao === "encerrar") { data.status = "encerrado"; data.dataFim = new Date(); }
  else if (status) data.status = status;

  if (titulo !== undefined) data.titulo = String(titulo).trim();
  if (descricao !== undefined) data.descricao = descricao?.trim() || null;
  if (categoria !== undefined) data.tipo = categoria;
  if (metaValor !== undefined) data.metaValor = metaValor != null ? Number(metaValor) : null;
  if (metaUnidade !== undefined) data.metaUnidade = metaUnidade?.trim() || null;
  if (dataInicio !== undefined) data.dataInicio = dataInicio ? new Date(dataInicio) : null;
  if (dataFim !== undefined) data.dataFim = dataFim ? new Date(dataFim) : null;
  if (icone !== undefined) data.icone = icone;
  if (pontosBonus !== undefined) data.pontosBonus = Number(pontosBonus);

  await prisma.desafio.update({ where: { id: dono.id }, data });
  res.json({ ok: true });
});

/** DELETE /api/desafios/:id — remove desafio (e seus progressos). */
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const id = req.nutricionistaId!;
  const dono = await prisma.desafio.findFirst({ where: { id: (req.params.id as string), nutricionistaId: id }, select: { id: true } });
  if (!dono) return res.status(404).json({ error: "Desafio não encontrado" });
  await prisma.desafioProgresso.deleteMany({ where: { desafioId: dono.id } });
  await prisma.desafio.delete({ where: { id: dono.id } });
  res.json({ ok: true });
});

/** POST /api/desafios/:id/participantes — inscreve pacientes (lista ou todos os ativos). */
router.post("/:id/participantes", async (req: AuthRequest, res: Response) => {
  const id = req.nutricionistaId!;
  const dono = await prisma.desafio.findFirst({ where: { id: (req.params.id as string), nutricionistaId: id }, select: { id: true } });
  if (!dono) return res.status(404).json({ error: "Desafio não encontrado" });

  let ids: string[] = Array.isArray(req.body.pacienteIds) ? req.body.pacienteIds : [];
  if (req.body.todos) {
    const ativos = await prisma.paciente.findMany({ where: { nutricionistaId: id, ativo: true }, select: { id: true } });
    ids = ativos.map((p) => p.id);
  }
  if (!ids.length) return res.status(400).json({ error: "Nenhum paciente informado" });

  // Só pacientes desta nutri (multi-tenant) e abaixo do limite de desafios ativos.
  const validos = await prisma.paciente.findMany({ where: { id: { in: ids }, nutricionistaId: id }, select: { id: true } });
  const elegiveis = await filtrarSobLimite(validos.map((p) => p.id));
  const r = await prisma.desafioProgresso.createMany({
    data: elegiveis.map((pid) => ({ desafioId: dono.id, pacienteId: pid })),
    skipDuplicates: true,
  });
  res.json({ inscritos: r.count, ignoradosLimite: validos.length - elegiveis.length });
});

/** PUT /api/desafios/:id/progresso — atualiza o progresso de um participante. */
router.put("/:id/progresso", async (req: AuthRequest, res: Response) => {
  const id = req.nutricionistaId!;
  const { pacienteId, progresso, concluido } = req.body;
  if (!pacienteId || progresso == null) return res.status(400).json({ error: "pacienteId e progresso são obrigatórios" });

  // Garante que desafio e paciente pertencem à nutri
  const dono = await prisma.desafio.findFirst({ where: { id: (req.params.id as string), nutricionistaId: id }, select: { id: true } });
  if (!dono) return res.status(404).json({ error: "Desafio não encontrado" });
  const pac = await prisma.paciente.findFirst({ where: { id: pacienteId, nutricionistaId: id }, select: { id: true } });
  if (!pac) return res.status(404).json({ error: "Paciente não encontrado" });

  const pct = Math.max(0, Math.min(100, Number(progresso)));
  const done = concluido != null ? Boolean(concluido) : pct >= 100;
  await prisma.desafioProgresso.upsert({
    where: { desafioId_pacienteId: { desafioId: dono.id, pacienteId } },
    update: { progresso: pct, concluido: done },
    create: { desafioId: dono.id, pacienteId, progresso: pct, concluido: done },
  });
  res.json({ ok: true });
});

/** POST /api/desafios/:id/lembrete — envia push a todos os participantes. */
router.post("/:id/lembrete", async (req: AuthRequest, res: Response) => {
  const id = req.nutricionistaId!;
  const d = await prisma.desafio.findFirst({
    where: { id: (req.params.id as string), nutricionistaId: id },
    select: { id: true, titulo: true, progresso: { select: { pacienteId: true } } },
  });
  if (!d) return res.status(404).json({ error: "Desafio não encontrado" });

  const alvo = d.progresso.map((p) => p.pacienteId);
  await Promise.all(alvo.map((pid) =>
    enviarNotificacaoPaciente(pid, "Vamos nessa! 💪", `Continue firme no desafio "${d.titulo}".`, "/paciente/desafios").catch(() => {})
  ));
  res.json({ enviados: alvo.length });
});

export default router;
