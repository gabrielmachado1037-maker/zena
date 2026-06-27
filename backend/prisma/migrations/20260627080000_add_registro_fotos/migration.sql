CREATE TABLE IF NOT EXISTS "RegistroFotos" (
  "id" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "mes" INTEGER NOT NULL,
  "ano" INTEGER NOT NULL,
  "frenteUrl" TEXT,
  "perfilUrl" TEXT,
  "costasUrl" TEXT,
  "observacoes" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistroFotos_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RegistroFotos_pacienteId_fkey') THEN
    ALTER TABLE "RegistroFotos" ADD CONSTRAINT "RegistroFotos_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "RegistroFotos_pacienteId_mes_ano_key"
  ON "RegistroFotos"("pacienteId", "mes", "ano");
