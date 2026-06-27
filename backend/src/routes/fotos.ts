import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/:pacienteId/meta", async (req: AuthRequest, res: Response) => {
  const fotos = await prisma.fotoEvolucao.findMany({
    where: { pacienteId: String(req.params.pacienteId) },
    select: { id: true, data: true, tipo: true, criadoEm: true },
    orderBy: { data: "asc" },
  });
  res.json(fotos);
});

router.get("/:fotoId/imagem", async (req: AuthRequest, res: Response) => {
  const foto = await prisma.fotoEvolucao.findUnique({ where: { id: String(req.params.fotoId) } });
  if (!foto) return res.status(404).json({ error: "Foto não encontrada" });
  res.json({ imagem: foto.imagem });
});

router.post("/:pacienteId", async (req: AuthRequest, res: Response) => {
  const { data, tipo, imagem } = req.body as { data: string; tipo: string; imagem: string };
  if (!data || !tipo || !imagem) return res.status(400).json({ error: "Campos obrigatórios: data, tipo, imagem" });

  const pacienteId = String(req.params.pacienteId);
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId! },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const foto = await prisma.fotoEvolucao.create({
    data: { pacienteId, data: new Date(data), tipo, imagem },
    select: { id: true, data: true, tipo: true, criadoEm: true },
  });
  res.json(foto);
});

router.delete("/:fotoId", async (req: AuthRequest, res: Response) => {
  await prisma.fotoEvolucao.delete({ where: { id: String(req.params.fotoId) } });
  res.json({ ok: true });
});

export default router;
