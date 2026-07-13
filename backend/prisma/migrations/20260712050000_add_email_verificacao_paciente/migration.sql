-- Verificação de e-mail do paciente (soft gate).
ALTER TABLE "PacienteUser" ADD COLUMN "emailVerificado" BOOLEAN NOT NULL DEFAULT false;

-- Grandfather: contas de paciente já existentes ficam verificadas.
UPDATE "PacienteUser" SET "emailVerificado" = true;

CREATE TABLE "TokenVerificacaoEmailPaciente" (
    "id" TEXT NOT NULL,
    "pacienteUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenVerificacaoEmailPaciente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TokenVerificacaoEmailPaciente_token_key" ON "TokenVerificacaoEmailPaciente"("token");
