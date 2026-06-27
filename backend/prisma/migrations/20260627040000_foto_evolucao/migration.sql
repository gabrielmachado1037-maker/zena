CREATE TABLE "FotoEvolucao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "imagem" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FotoEvolucao_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FotoEvolucao" ADD CONSTRAINT "FotoEvolucao_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
