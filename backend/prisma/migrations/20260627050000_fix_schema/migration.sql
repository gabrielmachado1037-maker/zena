-- ============================================================
-- IDEMPOTENT FIX: applies all baselined migrations that may
-- never have actually run on this database.
-- ============================================================

-- migration 000000: tipoProfissional on Nutricionista
ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "tipoProfissional" TEXT NOT NULL DEFAULT 'nutricionista';

-- migration 010000: clinical fields on Paciente
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "dataNascimento" TIMESTAMP(3);
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "sexo" TEXT;
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "altura" DOUBLE PRECISION;

-- migration 020000: financial fields
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

-- migration 030000: asaas subscription fields on Nutricionista
ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "asaasCustomerId" TEXT;
ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "asaasSubscriptionId" TEXT;
ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "planoVencimento" TIMESTAMP(3);

-- migration 040000: FotoEvolucao table
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
