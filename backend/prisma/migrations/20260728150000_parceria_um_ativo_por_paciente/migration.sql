-- Rede de segurança de DINHEIRO: garante no banco a invariante "um acesso ativo por
-- paciente" (a aplicação já tenta em ativarConsulta; isto barra a corrida de
-- ativações concorrentes de duas consultas do mesmo paciente).
-- Índice UNIQUE PARCIAL — não é declarável no schema.prisma (Prisma não suporta WHERE
-- em @@unique). Produção usa `prisma migrate deploy` (não `migrate dev`), então não há
-- risco de o índice ser "corrigido"/removido automaticamente.
CREATE UNIQUE INDEX "ConsultaParceria_um_ativo_por_paciente"
  ON "ConsultaParceria" ("pacienteId")
  WHERE "status" = 'ativo';
