-- Idempotent: ensure asaas subscription columns exist on Nutricionista
ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "asaasCustomerId" TEXT;
ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "asaasSubscriptionId" TEXT;
ALTER TABLE "Nutricionista" ADD COLUMN IF NOT EXISTS "planoVencimento" TIMESTAMP(3);

-- Idempotent: ensure FotoEvolucao table exists
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
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FotoEvolucao_pacienteId_fkey'
  ) THEN
    ALTER TABLE "FotoEvolucao" ADD CONSTRAINT "FotoEvolucao_pacienteId_fkey"
      FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
