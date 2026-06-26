-- CreateTable
CREATE TABLE "TokenRedefinicao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nutricionistaId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Nutricionista" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "crn" TEXT NOT NULL,
    "foto" TEXT,
    "plano" TEXT NOT NULL DEFAULT 'trial',
    "planoAtivo" BOOLEAN NOT NULL DEFAULT true,
    "trialEnd" DATETIME,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Nutricionista" ("createdAt", "crn", "email", "foto", "id", "nome", "senha") SELECT "createdAt", "crn", "email", "foto", "id", "nome", "senha" FROM "Nutricionista";
DROP TABLE "Nutricionista";
ALTER TABLE "new_Nutricionista" RENAME TO "Nutricionista";
CREATE UNIQUE INDEX "Nutricionista_email_key" ON "Nutricionista"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TokenRedefinicao_token_key" ON "TokenRedefinicao"("token");
