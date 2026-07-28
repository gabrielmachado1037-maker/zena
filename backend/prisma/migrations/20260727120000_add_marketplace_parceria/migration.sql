-- Marketplace de Nutricionistas Parceiros (feature isolada do fluxo B2B).
-- Parceiros in-house + consultas avulsas de 30 dias (Pix/Asaas com split) + chat da consulta.

-- CreateTable
CREATE TABLE "NutricionistaParceiro" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "foto" TEXT,
  "especialidade" TEXT NOT NULL,
  "avaliacao" DOUBLE PRECISION NOT NULL DEFAULT 5,
  "bio" TEXT,
  "walletIdAsaas" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NutricionistaParceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultaParceria" (
  "id" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "parceiroId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pendente',
  "valor" DOUBLE PRECISION NOT NULL DEFAULT 200,
  "asaasCustomerId" TEXT,
  "asaasChargeId" TEXT,
  "pixCopiaECola" TEXT,
  "iniciaEm" TIMESTAMP(3),
  "expiraEm" TIMESTAMP(3),
  "pagoEm" TIMESTAMP(3),
  "videoRoom" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsultaParceria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemParceria" (
  "id" TEXT NOT NULL,
  "consultaId" TEXT NOT NULL,
  "autor" TEXT NOT NULL,
  "conteudo" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MensagemParceria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NutricionistaParceiro_ativo_idx" ON "NutricionistaParceiro"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultaParceria_videoRoom_key" ON "ConsultaParceria"("videoRoom");

-- CreateIndex
CREATE INDEX "ConsultaParceria_pacienteId_idx" ON "ConsultaParceria"("pacienteId");

-- CreateIndex
CREATE INDEX "ConsultaParceria_parceiroId_idx" ON "ConsultaParceria"("parceiroId");

-- CreateIndex
CREATE INDEX "ConsultaParceria_pacienteId_status_idx" ON "ConsultaParceria"("pacienteId", "status");

-- CreateIndex
CREATE INDEX "ConsultaParceria_status_expiraEm_idx" ON "ConsultaParceria"("status", "expiraEm");

-- CreateIndex
CREATE INDEX "MensagemParceria_consultaId_criadoEm_idx" ON "MensagemParceria"("consultaId", "criadoEm");

-- AddForeignKey
ALTER TABLE "ConsultaParceria" ADD CONSTRAINT "ConsultaParceria_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaParceria" ADD CONSTRAINT "ConsultaParceria_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "NutricionistaParceiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemParceria" ADD CONSTRAINT "MensagemParceria_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "ConsultaParceria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
