-- ============================================================
-- IDEMPOTENT FIX v2: ensures all schema columns actually exist.
-- The previous fix migration (050000) ran but was incomplete.
-- ============================================================

ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "tipoProfissional" TEXT NOT NULL DEFAULT 'nutricionista';
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "dataNascimento" TIMESTAMP(3);
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "sexo" TEXT;
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "altura" DOUBLE PRECISION;
ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "asaasApiKey" TEXT;
ALTER TABLE "Cobranca" ADD COLUMN IF NOT EXISTS "descricao" TEXT;
ALTER TABLE "Cobranca" ADD COLUMN IF NOT EXISTS "asaasChargeId" TEXT;
ALTER TABLE "Cobranca" ADD COLUMN IF NOT EXISTS "pixCopiaECola" TEXT;
ALTER TABLE "Cobranca" ADD COLUMN IF NOT EXISTS "linkPagamento" TEXT;

CREATE TABLE IF NOT EXISTS "PlanoCobranca" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "periodicidade" TEXT NOT NULL DEFAULT 'mensal',
    "diaVencimento" INTEGER NOT NULL DEFAULT 10,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanoCobranca_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlanoCobranca_pacienteId_key" ON "PlanoCobranca"("pacienteId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanoCobranca_pacienteId_fkey') THEN
    ALTER TABLE "PlanoCobranca" ADD CONSTRAINT "PlanoCobranca_pacienteId_fkey"
      FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "asaasCustomerId" TEXT;
ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "asaasSubscriptionId" TEXT;
ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "planoVencimento" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "FotoEvolucao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "imagem" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FotoEvolucao_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FotoEvolucao_pacienteId_fkey') THEN
    ALTER TABLE "FotoEvolucao" ADD CONSTRAINT "FotoEvolucao_pacienteId_fkey"
      FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
