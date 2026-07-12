-- Verificação de e-mail no cadastro (soft gate)
ALTER TABLE "Nutricionista" ADD COLUMN "emailVerificado" BOOLEAN NOT NULL DEFAULT false;

-- Grandfather: contas já existentes ficam verificadas (só cadastros novos precisam verificar).
UPDATE "Nutricionista" SET "emailVerificado" = true;

CREATE TABLE "TokenVerificacaoEmail" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenVerificacaoEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TokenVerificacaoEmail_token_key" ON "TokenVerificacaoEmail"("token");
