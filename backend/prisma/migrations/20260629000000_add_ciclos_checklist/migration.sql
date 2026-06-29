-- CreateTable Ciclo
CREATE TABLE "Ciclo" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "numero" INTEGER NOT NULL,
  "titulo" TEXT,
  "dataInicio" TIMESTAMP(3) NOT NULL,
  "dataFim" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ativo',
  "premioDescricao" TEXT,
  "premioTipo" TEXT NOT NULL DEFAULT 'reconhecimento',
  "relatorioGerado" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ciclo_pkey" PRIMARY KEY ("id")
);

-- CreateTable CicloParticipante
CREATE TABLE "CicloParticipante" (
  "id" TEXT NOT NULL,
  "cicloId" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "pontosCiclo" INTEGER NOT NULL DEFAULT 0,
  "posicaoAtual" INTEGER NOT NULL DEFAULT 0,
  "posicaoAnterior" INTEGER NOT NULL DEFAULT 0,
  "diasConsistente" INTEGER NOT NULL DEFAULT 0,
  "diasTotal" INTEGER NOT NULL DEFAULT 0,
  "percentualConsistencia" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "melhorCategoria" TEXT,
  "streakNoCiclo" INTEGER NOT NULL DEFAULT 0,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CicloParticipante_pkey" PRIMARY KEY ("id")
);

-- CreateTable RelatorioCiclo
CREATE TABLE "RelatorioCiclo" (
  "id" TEXT NOT NULL,
  "cicloId" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "percentualGeral" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "percentualHidratacao" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "percentualRefeicao" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "percentualTreino" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "melhorSequencia" INTEGER NOT NULL DEFAULT 0,
  "pontosTotal" INTEGER NOT NULL DEFAULT 0,
  "posicaoFinal" INTEGER NOT NULL DEFAULT 0,
  "totalParticipantes" INTEGER NOT NULL DEFAULT 0,
  "destaque" TEXT,
  "mensagemNutri" TEXT,
  "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RelatorioCiclo_pkey" PRIMARY KEY ("id")
);

-- CreateTable ChecklistDiario
CREATE TABLE "ChecklistDiario" (
  "id" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "cicloId" TEXT,
  "data" TIMESTAMP(3) NOT NULL,
  "refeicoesOk" BOOLEAN NOT NULL DEFAULT false,
  "aguaOk" BOOLEAN NOT NULL DEFAULT false,
  "treinoOk" BOOLEAN NOT NULL DEFAULT false,
  "pontosRefeicao" INTEGER NOT NULL DEFAULT 0,
  "pontosAgua" INTEGER NOT NULL DEFAULT 0,
  "pontosTreino" INTEGER NOT NULL DEFAULT 0,
  "pontosTotalDia" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChecklistDiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable FeedEncerramento
CREATE TABLE "FeedEncerramento" (
  "id" TEXT NOT NULL,
  "cicloId" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "vencedorId" TEXT,
  "top3" JSONB,
  "mensagem" TEXT,
  "publicadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedEncerramento_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "Ciclo" ADD CONSTRAINT "Ciclo_nutricionistaId_numero_key" UNIQUE ("nutricionistaId", "numero");
ALTER TABLE "CicloParticipante" ADD CONSTRAINT "CicloParticipante_cicloId_pacienteId_key" UNIQUE ("cicloId", "pacienteId");
ALTER TABLE "RelatorioCiclo" ADD CONSTRAINT "RelatorioCiclo_cicloId_pacienteId_key" UNIQUE ("cicloId", "pacienteId");
ALTER TABLE "ChecklistDiario" ADD CONSTRAINT "ChecklistDiario_pacienteId_data_key" UNIQUE ("pacienteId", "data");
ALTER TABLE "FeedEncerramento" ADD CONSTRAINT "FeedEncerramento_cicloId_key" UNIQUE ("cicloId");

-- Indexes
CREATE INDEX "Ciclo_nutricionistaId_idx" ON "Ciclo"("nutricionistaId");
CREATE INDEX "CicloParticipante_cicloId_idx" ON "CicloParticipante"("cicloId");
CREATE INDEX "CicloParticipante_pacienteId_idx" ON "CicloParticipante"("pacienteId");
CREATE INDEX "RelatorioCiclo_cicloId_idx" ON "RelatorioCiclo"("cicloId");
CREATE INDEX "RelatorioCiclo_pacienteId_idx" ON "RelatorioCiclo"("pacienteId");
CREATE INDEX "ChecklistDiario_pacienteId_idx" ON "ChecklistDiario"("pacienteId");
CREATE INDEX "ChecklistDiario_cicloId_idx" ON "ChecklistDiario"("cicloId");
CREATE INDEX "FeedEncerramento_nutricionistaId_idx" ON "FeedEncerramento"("nutricionistaId");

-- Foreign keys Ciclo
ALTER TABLE "Ciclo" ADD CONSTRAINT "Ciclo_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys CicloParticipante
ALTER TABLE "CicloParticipante" ADD CONSTRAINT "CicloParticipante_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CicloParticipante" ADD CONSTRAINT "CicloParticipante_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys RelatorioCiclo
ALTER TABLE "RelatorioCiclo" ADD CONSTRAINT "RelatorioCiclo_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RelatorioCiclo" ADD CONSTRAINT "RelatorioCiclo_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys ChecklistDiario
ALTER TABLE "ChecklistDiario" ADD CONSTRAINT "ChecklistDiario_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChecklistDiario" ADD CONSTRAINT "ChecklistDiario_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys FeedEncerramento
ALTER TABLE "FeedEncerramento" ADD CONSTRAINT "FeedEncerramento_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedEncerramento" ADD CONSTRAINT "FeedEncerramento_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedEncerramento" ADD CONSTRAINT "FeedEncerramento_vencedorId_fkey" FOREIGN KEY ("vencedorId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
