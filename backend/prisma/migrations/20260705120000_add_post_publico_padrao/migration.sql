-- Preferência de privacidade padrão dos posts do paciente
ALTER TABLE "PacienteUser" ADD COLUMN "postPublicoPadrao" BOOLEAN NOT NULL DEFAULT true;
