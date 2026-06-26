-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN "fotoInicial" TEXT;

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "semana" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "humor" INTEGER NOT NULL,
    "adesao" INTEGER NOT NULL,
    "peso" REAL,
    "foto" TEXT,
    "nota" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckIn_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MensagemWhatsApp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "textoEnviado" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MensagemWhatsApp_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_pacienteId_semana_ano_key" ON "CheckIn"("pacienteId", "semana", "ano");
