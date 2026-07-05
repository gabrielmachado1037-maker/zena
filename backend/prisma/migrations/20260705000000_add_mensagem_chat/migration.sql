-- CreateTable
CREATE TABLE "MensagemChat" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MensagemChat_nutricionistaId_idx" ON "MensagemChat"("nutricionistaId");

-- CreateIndex
CREATE INDEX "MensagemChat_pacienteId_idx" ON "MensagemChat"("pacienteId");

-- AddForeignKey
ALTER TABLE "MensagemChat" ADD CONSTRAINT "MensagemChat_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemChat" ADD CONSTRAINT "MensagemChat_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
