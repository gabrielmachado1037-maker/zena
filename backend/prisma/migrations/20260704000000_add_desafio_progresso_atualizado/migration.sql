-- Centro de Desafios: rastrear última atualização de progresso do participante.
-- Aditivo e seguro (coluna com default) — reutiliza os models Desafio/DesafioProgresso já existentes.
ALTER TABLE "DesafioProgresso" ADD COLUMN "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
