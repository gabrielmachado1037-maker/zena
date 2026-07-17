-- Consentimento LGPD do paciente: aceite explícito dos Termos + Política de Privacidade
-- registrado no cadastro. Aditivo: contas existentes ficam com aceiteTermos=false e
-- data/versão nulas (nunca houve fluxo de aceite quando foram criadas) — não retroage.
ALTER TABLE "PacienteUser" ADD COLUMN "aceiteTermos" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PacienteUser" ADD COLUMN "aceiteTermosEm" TIMESTAMP(3);
ALTER TABLE "PacienteUser" ADD COLUMN "aceiteTermosVersao" TEXT;
