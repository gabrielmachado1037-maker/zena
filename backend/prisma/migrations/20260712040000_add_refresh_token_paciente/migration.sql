-- Refresh tokens revogáveis (rotação + detecção de reuso) para o paciente.
CREATE TABLE "RefreshTokenPaciente" (
    "id" TEXT NOT NULL,
    "pacienteUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "revogado" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshTokenPaciente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshTokenPaciente_tokenHash_key" ON "RefreshTokenPaciente"("tokenHash");
CREATE INDEX "RefreshTokenPaciente_pacienteUserId_idx" ON "RefreshTokenPaciente"("pacienteUserId");
CREATE INDEX "RefreshTokenPaciente_familyId_idx" ON "RefreshTokenPaciente"("familyId");
