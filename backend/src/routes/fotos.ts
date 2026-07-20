import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { planoMiddleware } from "../middleware/plano";
import { uploadFoto, deleteFoto, BUCKET } from "../lib/supabase";

const router = Router();
router.use(authMiddleware);
router.use(planoMiddleware);

const M = "Campos obrigatórios: data, tipo, imagem";
const fotoSchema = z.object({
  data: z.string({ error: M }).min(1, M),
  // `tipo` vai interpolado no caminho do objeto no storage, com x-upsert
  // ligado. Solto, um valor como "../../outro" era normalizado pela URL e
  // gravava fora da pasta do paciente, sobrescrevendo arquivo alheio.
  tipo: z.string({ error: M }).min(1, M).regex(/^[a-zA-Z0-9_-]+$/, "Tipo de foto inválido."),
  imagem: z.string({ error: M }).min(1, M),
});

router.get("/:pacienteId/meta", async (req: AuthRequest, res: Response) => {
  const paciente = await prisma.paciente.findFirst({
    where: { id: String(req.params.pacienteId), nutricionistaId: req.nutricionistaId! },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const fotos = await prisma.fotoEvolucao.findMany({
    where: { pacienteId: String(req.params.pacienteId) },
    select: { id: true, data: true, tipo: true, criadoEm: true, imagem: true },
    orderBy: { data: "asc" },
  });
  res.json(fotos);
});

// Mantido por compatibilidade com frontend já deployado
router.get("/:fotoId/imagem", async (req: AuthRequest, res: Response) => {
  const foto = await prisma.fotoEvolucao.findFirst({
    where: { id: String(req.params.fotoId), paciente: { nutricionistaId: req.nutricionistaId! } },
  });
  if (!foto) return res.status(404).json({ error: "Foto não encontrada" });
  res.json({ imagem: foto.imagem });
});

router.post("/:pacienteId", validateBody(fotoSchema), async (req: AuthRequest, res: Response) => {
  const { data, tipo, imagem } = req.body as { data: string; tipo: string; imagem: string };

  const pacienteId = String(req.params.pacienteId);
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId! },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const path = `evolucao/${pacienteId}/${tipo}-${Date.now()}.jpg`;
  const imagemUrl = await uploadFoto(path, imagem);

  const foto = await prisma.fotoEvolucao.create({
    data: { pacienteId, data: new Date(data), tipo, imagem: imagemUrl },
    select: { id: true, data: true, tipo: true, criadoEm: true, imagem: true },
  });
  res.json(foto);
});

router.delete("/:fotoId", async (req: AuthRequest, res: Response) => {
  const foto = await prisma.fotoEvolucao.findFirst({
    where: { id: String(req.params.fotoId), paciente: { nutricionistaId: req.nutricionistaId! } },
  });
  if (!foto) return res.status(404).json({ error: "Foto não encontrada" });

  // Delete from Supabase Storage (only for new URL-based photos, not legacy base64)
  const urlPrefix = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  if (foto.imagem?.startsWith(urlPrefix)) {
    const storagePath = foto.imagem.replace(urlPrefix, "");
    await deleteFoto(storagePath).catch(() => {});
  }

  await prisma.fotoEvolucao.delete({ where: { id: String(req.params.fotoId) } });
  res.json({ ok: true });
});

export default router;
