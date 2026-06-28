-- CreateTable: FeedPost
CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "curtidas" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedPost_nutricionistaId_idx" ON "FeedPost"("nutricionistaId");
CREATE INDEX "FeedPost_pacienteId_idx" ON "FeedPost"("pacienteId");
CREATE INDEX "FeedPost_criadoEm_idx" ON "FeedPost"("criadoEm");

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_nutricionistaId_fkey"
    FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE CASCADE ON UPDATE CASCADE;
