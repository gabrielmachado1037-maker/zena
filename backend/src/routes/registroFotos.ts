import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import crypto from "crypto";
import { uploadFoto, deleteFotoPorUrl } from "../lib/supabase";

const router = Router();
router.use(authMiddleware);

const registroFotoSchema = z.object({
  mes: z.union([z.string(), z.number()], { error: "mes e ano são obrigatórios" }),
  ano: z.union([z.string(), z.number()], { error: "mes e ano são obrigatórios" }),
  frente: z.string().optional().nullable(),
  perfil: z.string().optional().nullable(),
  costas: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

router.get("/:pacienteId", async (req: AuthRequest, res: Response) => {
  const { pacienteId } = req.params as { pacienteId: string };
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId! },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const registros = await prisma.registroFotos.findMany({
    where: { pacienteId },
    orderBy: [{ ano: "desc" }, { mes: "desc" }],
  });
  res.json(registros);
});

router.post("/:pacienteId", validateBody(registroFotoSchema), async (req: AuthRequest, res: Response) => {
  const { pacienteId } = req.params as { pacienteId: string };
  const { mes, ano, frente, perfil, costas, observacoes } = req.body as {
    mes: number; ano: number;
    frente?: string; perfil?: string; costas?: string;
    observacoes?: string;
  };

  if (!mes || !ano) return res.status(400).json({ error: "mes e ano são obrigatórios" });
  if (!frente && !perfil && !costas) return res.status(400).json({ error: "Envie ao menos uma foto" });

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId! },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const existing = await prisma.registroFotos.findUnique({
    where: { pacienteId_mes_ano: { pacienteId, mes: Number(mes), ano: Number(ano) } },
  });

  // O caminho era previsível: <pacienteId>/<ano>/<mes>/frente.jpg. Como o
  // bucket é público e o id do paciente circula em payloads do app (ranking,
  // feed), qualquer paciente logado podia montar a URL das fotos de corpo dos
  // colegas e baixá-las sem autenticação nenhuma. O sufixo aleatório tira a
  // adivinhação; a correção completa é bucket privado com URL assinada.
  const base = `${pacienteId}/${ano}/${mes}/${crypto.randomBytes(8).toString("hex")}`;
  const urls: { frenteUrl?: string; perfilUrl?: string; costasUrl?: string } = {};

  if (frente) urls.frenteUrl = await uploadFoto(`${base}/frente.jpg`, frente);
  if (perfil) urls.perfilUrl = await uploadFoto(`${base}/perfil.jpg`, perfil);
  if (costas) urls.costasUrl = await uploadFoto(`${base}/costas.jpg`, costas);

  let registro;
  if (existing) {
    registro = await prisma.registroFotos.update({
      where: { id: existing.id },
      data: { ...urls, observacoes: observacoes ?? existing.observacoes },
    });
    // Com caminho aleatório o upload não sobrescreve mais o anterior (antes o
    // nome era fixo e o x-upsert cuidava disso). Sem apagar, cada reenvio
    // deixaria a foto antiga viva no bucket público, fora do alcance do
    // DELETE — que só conhece as URLs atuais do registro.
    await Promise.all(
      ([
        urls.frenteUrl && existing.frenteUrl,
        urls.perfilUrl && existing.perfilUrl,
        urls.costasUrl && existing.costasUrl,
      ].filter((u): u is string => !!u)).map((u) => deleteFotoPorUrl(u)),
    );
  } else {
    registro = await prisma.registroFotos.create({
      data: { pacienteId, mes: Number(mes), ano: Number(ano), ...urls, observacoes },
    });
  }

  res.json(registro);
});

router.delete("/:registroId", async (req: AuthRequest, res: Response) => {
  const { registroId } = req.params as { registroId: string };
  // Escopo por nutri (evita IDOR: apagar registro/fotos de outra clínica por id).
  const registro = await prisma.registroFotos.findFirst({
    where: { id: registroId, paciente: { nutricionistaId: req.nutricionistaId! } },
  });
  if (!registro) return res.status(404).json({ error: "Registro não encontrado" });

  // Apaga pela URL gravada, não por caminho reconstruído: o caminho agora tem
  // um segmento aleatório (anti-adivinhação), então remontá-lo apagaria um
  // objeto inexistente e deixaria a foto órfã no bucket público para sempre.
  // Também cobre os registros antigos, de caminho previsível.
  await Promise.all(
    [registro.frenteUrl, registro.perfilUrl, registro.costasUrl]
      .filter((u): u is string => !!u)
      .map((u) => deleteFotoPorUrl(u)),
  );

  await prisma.registroFotos.delete({ where: { id: registroId } });
  res.json({ ok: true });
});

export default router;
