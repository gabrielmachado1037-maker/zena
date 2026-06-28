CREATE TABLE IF NOT EXISTS "RegistroContato" (
  "id" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'whatsapp',
  "resumo" TEXT NOT NULL,
  "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistroContato_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RegistroContato_pacienteId_fkey') THEN
    ALTER TABLE "RegistroContato" ADD CONSTRAINT "RegistroContato_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
