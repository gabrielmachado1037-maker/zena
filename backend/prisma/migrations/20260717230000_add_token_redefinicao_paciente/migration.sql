-- Redefinição de senha do paciente ("esqueci a senha"). Espelha TokenRedefinicao (nutri).
CREATE TABLE "TokenRedefinicaoPaciente" (
    "id" TEXT NOT NULL,
    "pacienteUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRedefinicaoPaciente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TokenRedefinicaoPaciente_token_key" ON "TokenRedefinicaoPaciente"("token");
