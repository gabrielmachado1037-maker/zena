-- LGPD: consentimento (Nutricionista) + anonimização (Paciente)
ALTER TABLE "Nutricionista" ADD COLUMN "aceiteTermosEm" TIMESTAMP(3);
ALTER TABLE "Nutricionista" ADD COLUMN "aceiteTermosVersao" TEXT;
ALTER TABLE "Paciente" ADD COLUMN "anonimizadoEm" TIMESTAMP(3);
