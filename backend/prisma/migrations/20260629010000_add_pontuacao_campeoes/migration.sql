-- Alterar pontosCiclo para Float (para suportar 0.5 de pontos sociais)
ALTER TABLE "CicloParticipante" ALTER COLUMN "pontosCiclo" TYPE DOUBLE PRECISION;

-- Adicionar campos de streak e pontos totais ao Paciente
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "pontosTotal"  DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "streakAtual"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "streakMaximo" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "ultimoCheckin" TIMESTAMP(3);

-- Tabela de campeões de ciclo (top 3 de cada ciclo encerrado, últimos 3 ciclos)
CREATE TABLE IF NOT EXISTS "CicloCampeao" (
  "id"                     TEXT NOT NULL,
  "cicloId"                TEXT NOT NULL,
  "pacienteId"             TEXT NOT NULL,
  "nutricionistaId"        TEXT NOT NULL,
  "posicao"                INTEGER NOT NULL,
  "pontosFinais"           DOUBLE PRECISION NOT NULL,
  "percentualConsistencia" DOUBLE PRECISION,
  "streakMaximo"           INTEGER NOT NULL DEFAULT 0,
  "fotoUrl"                TEXT,
  "nomePaciente"           TEXT NOT NULL,
  "escudoAtivo"            BOOLEAN NOT NULL DEFAULT false,
  "escudoExpiresEm"        TIMESTAMP(3),
  "cicloNumero"            INTEGER NOT NULL DEFAULT 0,
  "cicloTitulo"            TEXT,
  "cicloDataFim"           TIMESTAMP(3),
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CicloCampeao_pkey" PRIMARY KEY ("id")
);

-- Tabela de marcos de streak (7 e 21 dias, 1x por ciclo)
CREATE TABLE IF NOT EXISTS "StreakMarco" (
  "id"          TEXT NOT NULL,
  "pacienteId"  TEXT NOT NULL,
  "cicloId"     TEXT NOT NULL,
  "marco"       INTEGER NOT NULL,
  "pontosBonus" DOUBLE PRECISION NOT NULL,
  "concedidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreakMarco_pkey" PRIMARY KEY ("id")
);

-- Tabela de log de pontos sociais (para limites diários)
CREATE TABLE IF NOT EXISTS "PontosLog" (
  "id"         TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "tipo"       TEXT NOT NULL,
  "pontos"     DOUBLE PRECISION NOT NULL,
  "data"       DATE NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PontosLog_pkey" PRIMARY KEY ("id")
);

-- Unique: mesmo marco só 1x por paciente por ciclo
ALTER TABLE "StreakMarco"
  ADD CONSTRAINT "StreakMarco_pacienteId_cicloId_marco_key"
  UNIQUE ("pacienteId", "cicloId", "marco");

-- Indexes
CREATE INDEX IF NOT EXISTS "CicloCampeao_nutricionistaId_createdAt_idx"
  ON "CicloCampeao"("nutricionistaId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CicloCampeao_cicloId_idx"
  ON "CicloCampeao"("cicloId");
CREATE INDEX IF NOT EXISTS "StreakMarco_pacienteId_idx"
  ON "StreakMarco"("pacienteId");
CREATE INDEX IF NOT EXISTS "PontosLog_pacienteId_tipo_data_idx"
  ON "PontosLog"("pacienteId", "tipo", "data");

-- Foreign keys CicloCampeao
ALTER TABLE "CicloCampeao"
  ADD CONSTRAINT "CicloCampeao_cicloId_fkey"
  FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CicloCampeao"
  ADD CONSTRAINT "CicloCampeao_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CicloCampeao"
  ADD CONSTRAINT "CicloCampeao_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys StreakMarco
ALTER TABLE "StreakMarco"
  ADD CONSTRAINT "StreakMarco_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StreakMarco"
  ADD CONSTRAINT "StreakMarco_cicloId_fkey"
  FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys PontosLog
ALTER TABLE "PontosLog"
  ADD CONSTRAINT "PontosLog_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
