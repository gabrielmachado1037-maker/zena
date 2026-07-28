-- Janela de acesso do paciente definida pela nutri (B2B). null = sem prazo.
ALTER TABLE "Paciente" ADD COLUMN "acessoExpiraEm" TIMESTAMP(3);

-- Consulta do cron de aviso "vence em N dias" e do bloqueio.
CREATE INDEX "Paciente_acessoExpiraEm_idx" ON "Paciente"("acessoExpiraEm");
