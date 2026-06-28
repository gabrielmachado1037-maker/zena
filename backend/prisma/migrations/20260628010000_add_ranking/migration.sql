-- CreateTable: RankingConfig
CREATE TABLE "RankingConfig" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "pesoPesoMeta" INTEGER NOT NULL DEFAULT 40,
    "pesoHabitosConsecutivos" INTEGER NOT NULL DEFAULT 30,
    "pesoMetasSemanais" INTEGER NOT NULL DEFAULT 30,
    "diasConsecutivosAlvo" INTEGER NOT NULL DEFAULT 7,
    "metasSemanaisAlvo" INTEGER NOT NULL DEFAULT 4,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RankingPontuacao
CREATE TABLE "RankingPontuacao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL DEFAULT 'semanal',
    "semana" INTEGER,
    "mes" INTEGER,
    "ano" INTEGER NOT NULL,
    "pctObjetivoPeso" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diasConsecutivosHabitos" INTEGER NOT NULL DEFAULT 0,
    "metasSemanaisBatidas" INTEGER NOT NULL DEFAULT 0,
    "pontuacaoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posicaoRanking" INTEGER,
    "calculadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingPontuacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RankingConfig_nutricionistaId_key" ON "RankingConfig"("nutricionistaId");

CREATE UNIQUE INDEX "RankingPontuacao_pacienteId_periodo_semana_mes_ano_key"
    ON "RankingPontuacao"("pacienteId", "periodo", "semana", "mes", "ano");

CREATE INDEX "RankingPontuacao_nutricionistaId_idx" ON "RankingPontuacao"("nutricionistaId");
CREATE INDEX "RankingPontuacao_nutricionistaId_ano_semana_idx" ON "RankingPontuacao"("nutricionistaId", "ano", "semana");
CREATE INDEX "RankingPontuacao_nutricionistaId_ano_mes_idx" ON "RankingPontuacao"("nutricionistaId", "ano", "mes");
CREATE INDEX "RankingPontuacao_pacienteId_idx" ON "RankingPontuacao"("pacienteId");

-- AddForeignKey
ALTER TABLE "RankingConfig" ADD CONSTRAINT "RankingConfig_nutricionistaId_fkey"
    FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RankingPontuacao" ADD CONSTRAINT "RankingPontuacao_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RankingPontuacao" ADD CONSTRAINT "RankingPontuacao_nutricionistaId_fkey"
    FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
