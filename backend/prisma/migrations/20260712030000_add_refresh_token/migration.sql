-- Refresh tokens revogáveis (rotação + detecção de reuso) para a nutricionista.
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "revogado" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_nutricionistaId_idx" ON "RefreshToken"("nutricionistaId");
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
