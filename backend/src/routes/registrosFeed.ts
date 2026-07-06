import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { enviarNotificacaoPaciente } from "./notificacoes";

// Tela "Registros Diários" (nutri) — feed dos check-ins diários de todos os pacientes.
const router = Router();
router.use(authMiddleware);

// Liga real (Bronze…Lendário) → chave de moldura/badge no front.
const LIGA_FRAME: Record<string, string> = {
  Bronze: "bronze",
  Prata: "silver",
  Ouro: "gold",
  Diamante: "diamond",
  Mestre: "master",
  Lendário: "legendary",
};

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const isoDia = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

// Stub = registro só de humor (sem check-in real) → não é log clínico pra revisar.
function ehStub(r: {
  alimentacaoOk: boolean; treinoOk: boolean; aguaOk: boolean; sonoOk: boolean;
  fotoUrl: string | null; pediuAjuste: boolean; pontosGanhos: number; tipoRegistro: string;
}) {
  return !r.alimentacaoOk && !r.treinoOk && !r.aguaOk && !r.sonoOk &&
    !r.fotoUrl && !r.pediuAjuste && r.pontosGanhos === 0 && r.tipoRegistro === "normal";
}

// GET /api/registros-feed?dias=7
router.get("/", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId as string;
  const dias = Math.min(30, Math.max(1, Number(req.query["dias"]) || 7));
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  desde.setDate(desde.getDate() - (dias - 1));
  const hojeIso = isoDia(new Date());

  const [registrosRaw, ativos] = await Promise.all([
    prisma.registro.findMany({
      where: { data: { gte: desde }, paciente: { nutricionistaId } },
      orderBy: { createdAt: "desc" },
      take: 120,
      include: { paciente: { select: { id: true, nome: true, fotoPerfilUrl: true, ligaAtual: true } } },
    }),
    prisma.paciente.findMany({
      where: { nutricionistaId, ativo: true },
      select: { id: true, nome: true, ultimoCheckin: true },
    }),
  ]);

  const registros = registrosRaw
    .filter((r) => !ehStub(r))
    .map((r) => {
      const ok = [r.alimentacaoOk, r.treinoOk, r.aguaOk, r.sonoOk].filter(Boolean).length;
      const ehExcecao = r.pediuAjuste || r.tipoRegistro === "excecao" || r.tipoRegistro === "ajuste_necessario";
      let tipo: string, tipoTexto: string;
      if (ehExcecao) {
        tipo = "excecao";
        tipoTexto = r.pediuAjuste ? "Pediu ajuste no plano" : "Exceção registrada";
      } else if (ok === 4) {
        tipo = "treino";
        tipoTexto = "Check-in completo • 4/4 hábitos";
      } else if (ok <= 1 && !r.fotoUrl) {
        tipo = "furtada";
        tipoTexto = `Baixa adesão • ${ok}/4 hábitos`;
      } else {
        tipo = "refeicao";
        tipoTexto = r.fotoUrl ? `Registro com foto • ${ok}/4 hábitos` : `Check-in • ${ok}/4 hábitos`;
      }

      const dt = new Date(r.createdAt);
      const hoje = isoDia(r.data) === hojeIso;
      const horario = hoje ? `${pad(dt.getHours())}:${pad(dt.getMinutes())}` : `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`;

      return {
        id: r.id,
        pacienteId: r.paciente.id,
        paciente: r.paciente.nome,
        avatar: r.paciente.fotoPerfilUrl,
        liga: LIGA_FRAME[r.paciente.ligaAtual] ?? "silver",
        ligaLabel: (r.paciente.ligaAtual ?? "").toUpperCase(),
        horario,
        hoje,
        tipo,
        tipoTexto,
        texto: r.pediuAjuste ? (r.motivoAjuste ?? r.descricao ?? null) : (r.descricao ?? null),
        imagem: r.fotoUrl,
        revisado: r.revisado,
      };
    });

  // Resumo do dia
  const registrosHoje = registros.filter((r) => r.hoje);
  const resumo = {
    registros: registrosHoje.length,
    alertas: registrosHoje.filter((r) => r.tipo === "excecao" || r.tipo === "furtada").length,
  };

  // Radar de urgência: pedidos de ajuste em aberto (error) + inativos há ≥2 dias (secondary).
  const pediramAjuste = new Map<string, string>();
  for (const r of registrosRaw) {
    if (r.pediuAjuste && !r.ajusteLido && !pediramAjuste.has(r.paciente.id)) {
      pediramAjuste.set(r.paciente.id, r.paciente.nome);
    }
  }
  const radar: { id: string; pacienteId: string; nome: string; motivo: string; cor: "error" | "secondary"; glow: boolean }[] = [];
  for (const [pacienteId, nome] of pediramAjuste) {
    radar.push({ id: `aj-${pacienteId}`, pacienteId, nome, motivo: "Pediu ajuste no plano", cor: "error", glow: true });
  }
  const agora = Date.now();
  const inativos = ativos
    .filter((p) => !pediramAjuste.has(p.id))
    .map((p) => ({ ...p, dias: p.ultimoCheckin ? Math.floor((agora - new Date(p.ultimoCheckin).getTime()) / 86_400_000) : 999 }))
    .filter((p) => p.dias >= 2)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 4);
  for (const p of inativos) {
    const motivo = p.dias >= 999 ? "Nunca registrou" : `Sem registro há ${p.dias} dias`;
    radar.push({ id: `in-${p.id}`, pacienteId: p.id, nome: p.nome, motivo, cor: "secondary", glow: false });
  }

  // Meta da comunidade: % de pacientes ativos que registraram hoje + variação 7d.
  const idsHoje = new Set(registrosRaw.filter((r) => isoDia(r.data) === hojeIso && !ehStub(r)).map((r) => r.paciente.id));
  const pct = ativos.length ? Math.round((idsHoje.size / ativos.length) * 100) : 0;

  const seteDias = new Date(); seteDias.setDate(seteDias.getDate() - 7);
  const quatorzeDias = new Date(); quatorzeDias.setDate(quatorzeDias.getDate() - 14);
  const [semAtual, semAnterior] = await Promise.all([
    prisma.registro.count({ where: { data: { gte: seteDias }, paciente: { nutricionistaId } } }),
    prisma.registro.count({ where: { data: { gte: quatorzeDias, lt: seteDias }, paciente: { nutricionistaId } } }),
  ]);
  const deltaSemana = semAnterior > 0 ? Math.round(((semAtual - semAnterior) / semAnterior) * 100) : (semAtual > 0 ? 100 : 0);

  res.json({ registros: registros.slice(0, 60), resumo, radar: radar.slice(0, 6), comunidade: { pct, deltaSemana } });
});

// POST /api/registros-feed/:id/validar — marca o registro como revisado pela nutri.
router.post("/:id/validar", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId as string;
  const id = req.params["id"] as string;
  const reg = await prisma.registro.findFirst({ where: { id, paciente: { nutricionistaId } } });
  if (!reg) return res.status(404).json({ error: "Registro não encontrado" });
  await prisma.registro.update({
    where: { id },
    data: { revisado: true, ajusteLido: reg.pediuAjuste ? true : reg.ajusteLido },
  });
  res.json({ ok: true });
});

// POST /api/registros-feed/paciente/:pacienteId/nudge — envia um incentivo (push) ao paciente.
router.post("/paciente/:pacienteId/nudge", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId as string;
  const pacienteId = req.params["pacienteId"] as string;
  const pac = await prisma.paciente.findFirst({ where: { id: pacienteId, nutricionistaId } });
  if (!pac) return res.status(404).json({ error: "Paciente não encontrada" });
  try {
    await enviarNotificacaoPaciente(
      pacienteId,
      "Sua nutri te enviou um incentivo 💪",
      "Continue firme com seus registros de hoje!",
      "/paciente/dashboard",
    );
  } catch {
    /* push é best-effort */
  }
  res.json({ ok: true });
});

export default router;
