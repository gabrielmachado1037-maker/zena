import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// Listar fotos de um paciente (sem imagem — só metadados para o grid)
router.get("/:pacienteId/meta", async (req: AuthRequest, res: Response) => {
  const fotos = await prisma.fotoEvolucao.findMany({
    where: { pacienteId: req.params.pacienteId },
    select: { id: true, data: true, tipo: true, criadoEm: true },
    orderBy: { data: "asc" },
  });
  res.json(fotos);
});

// Buscar imagem de uma foto específica
router.get("/:fotoId/imagem", async (req: AuthRequest, res: Response) => {
  const foto = await prisma.fotoEvolucao.findUnique({ where: { id: req.params.fotoId } });
  if (!foto) return res.status(404).json({ error: "Foto não encontrada" });
  res.json({ imagem: foto.imagem });
});

// Upload de foto
router.post("/:pacienteId", async (req: AuthRequest, res: Response) => {
  const { data, tipo, imagem } = req.body as { data: string; tipo: string; imagem: string };
  if (!data || !tipo || !imagem) return res.status(400).json({ error: "Campos obrigatórios: data, tipo, imagem" });

  // Verifica que o paciente pertence ao nutricionista logado
  const paciente = await prisma.paciente.findFirst({
    where: { id: req.params.pacienteId, nutricionistaId: req.nutricionistaId! },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const foto = await prisma.fotoEvolucao.create({
    data: {
      pacienteId: req.params.pacienteId,
      data: new Date(data),
      tipo,
      imagem,
    },
    select: { id: true, data: true, tipo: true, criadoEm: true },
  });
  res.json(foto);
});

// Deletar foto
router.delete("/:fotoId", async (req: AuthRequest, res: Response) => {
  await prisma.fotoEvolucao.delete({ where: { id: req.params.fotoId } });
  res.json({ ok: true });
});

export default router;
