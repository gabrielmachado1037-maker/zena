ALTER TABLE "Nutricionista" ADD COLUMN "asaasApiKey" TEXT;
ALTER TABLE "Cobranca" ADD COLUMN "descricao" TEXT;
ALTER TABLE "Cobranca" ADD COLUMN "asaasChargeId" TEXT;
ALTER TABLE "Cobranca" ADD COLUMN "pixCopiaECola" TEXT;
ALTER TABLE "Cobranca" ADD COLUMN "linkPagamento" TEXT;

CREATE TABLE "PlanoCobranca" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "periodicidade" TEXT NOT NULL DEFAULT 'mensal',
    "diaVencimento" INTEGER NOT NULL DEFAULT 10,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanoCobranca_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanoCobranca_pacienteId_key" ON "PlanoCobranca"("pacienteId");

ALTER TABLE "PlanoCobranca" ADD CONSTRAINT "PlanoCobranca_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
