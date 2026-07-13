-- Convite de vínculo individual por paciente (uso único).
ALTER TABLE "Paciente" ADD COLUMN "conviteCodigo" TEXT;
ALTER TABLE "Paciente" ADD COLUMN "conviteStatus" TEXT NOT NULL DEFAULT 'pendente';
ALTER TABLE "Paciente" ADD COLUMN "conviteExpiraEm" TIMESTAMP(3);
ALTER TABLE "Paciente" ADD COLUMN "conviteUsadoEm" TIMESTAMP(3);

CREATE UNIQUE INDEX "Paciente_conviteCodigo_key" ON "Paciente"("conviteCodigo");

-- Grandfather: pacientes que já têm conta = convite já utilizado (não precisam de código).
UPDATE "Paciente"
  SET "conviteStatus" = 'utilizado', "conviteUsadoEm" = NOW()
  WHERE "id" IN (SELECT "pacienteId" FROM "PacienteUser");
