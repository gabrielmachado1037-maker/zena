-- Rebranding Nexvel: sistema de Ligas, Registros, Desafios, Conquistas, Mensagens do nutri

-- Campos de liga no Paciente
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "ligaAtual" TEXT NOT NULL DEFAULT 'Bronze';
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "ligaNivel" TEXT NOT NULL DEFAULT 'III';
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "diasInativo" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "barraCongelada" BOOLEAN NOT NULL DEFAULT false;

-- Diário de bordo / missões diárias do paciente (substitui o Feed na navegação)
CREATE TABLE IF NOT EXISTS "Registro" (
  "id"             TEXT NOT NULL,
  "pacienteId"     TEXT NOT NULL,
  "data"           DATE NOT NULL,
  "alimentacaoOk"  BOOLEAN NOT NULL DEFAULT false,
  "treinoOk"       BOOLEAN NOT NULL DEFAULT false,
  "aguaOk"         BOOLEAN NOT NULL DEFAULT false,
  "sonoOk"         BOOLEAN NOT NULL DEFAULT false,
  "tipoRegistro"   TEXT NOT NULL DEFAULT 'normal',
  "fotoUrl"        TEXT,
  "descricao"      TEXT,
  "humor"          TEXT,
  "tags"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "pontosGanhos"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pontosDetalhes" JSONB,
  "pediuAjuste"    BOOLEAN NOT NULL DEFAULT false,
  "motivoAjuste"   TEXT,
  "ajusteLido"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Registro_pkey" PRIMARY KEY ("id")
);

-- Desafios criados pelo nutricionista
CREATE TABLE IF NOT EXISTS "Desafio" (
  "id"              TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "titulo"          TEXT NOT NULL,
  "descricao"       TEXT,
  "tipo"            TEXT NOT NULL DEFAULT 'custom',
  "metaValor"       DOUBLE PRECISION,
  "metaUnidade"     TEXT,
  "duracaoDias"     INTEGER NOT NULL DEFAULT 7,
  "dataInicio"      DATE,
  "dataFim"         DATE,
  "icone"           TEXT NOT NULL DEFAULT '🎯',
  "pontosBonus"     INTEGER NOT NULL DEFAULT 0,
  "status"          TEXT NOT NULL DEFAULT 'ativo',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Desafio_pkey" PRIMARY KEY ("id")
);

-- Progresso de cada paciente em cada desafio
CREATE TABLE IF NOT EXISTS "DesafioProgresso" (
  "id"         TEXT NOT NULL,
  "desafioId"  TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "progresso"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "concluido"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesafioProgresso_pkey" PRIMARY KEY ("id")
);

-- Conquistas do paciente
CREATE TABLE IF NOT EXISTS "Conquista" (
  "id"          TEXT NOT NULL,
  "pacienteId"  TEXT NOT NULL,
  "tipo"        TEXT NOT NULL,
  "titulo"      TEXT NOT NULL,
  "descricao"   TEXT,
  "icone"       TEXT,
  "pontosBonus" INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Conquista_pkey" PRIMARY KEY ("id")
);

-- Mensagens do nutricionista para o paciente (motivacional, ajuste, alerta...)
CREATE TABLE IF NOT EXISTS "MensagemNutri" (
  "id"              TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "pacienteId"      TEXT NOT NULL,
  "tipo"            TEXT NOT NULL DEFAULT 'motivacional',
  "conteudo"        TEXT NOT NULL,
  "lida"            BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MensagemNutri_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "Registro"
  ADD CONSTRAINT "Registro_pacienteId_data_key"
  UNIQUE ("pacienteId", "data");

ALTER TABLE "DesafioProgresso"
  ADD CONSTRAINT "DesafioProgresso_desafioId_pacienteId_key"
  UNIQUE ("desafioId", "pacienteId");

-- Indexes
CREATE INDEX IF NOT EXISTS "Registro_pacienteId_idx" ON "Registro"("pacienteId");
CREATE INDEX IF NOT EXISTS "Registro_pediuAjuste_idx" ON "Registro"("pediuAjuste");
CREATE INDEX IF NOT EXISTS "Desafio_nutricionistaId_idx" ON "Desafio"("nutricionistaId");
CREATE INDEX IF NOT EXISTS "DesafioProgresso_pacienteId_idx" ON "DesafioProgresso"("pacienteId");
CREATE INDEX IF NOT EXISTS "Conquista_pacienteId_idx" ON "Conquista"("pacienteId");
CREATE INDEX IF NOT EXISTS "MensagemNutri_nutricionistaId_idx" ON "MensagemNutri"("nutricionistaId");
CREATE INDEX IF NOT EXISTS "MensagemNutri_pacienteId_idx" ON "MensagemNutri"("pacienteId");

-- Foreign keys
ALTER TABLE "Registro"
  ADD CONSTRAINT "Registro_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Desafio"
  ADD CONSTRAINT "Desafio_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DesafioProgresso"
  ADD CONSTRAINT "DesafioProgresso_desafioId_fkey"
  FOREIGN KEY ("desafioId") REFERENCES "Desafio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DesafioProgresso"
  ADD CONSTRAINT "DesafioProgresso_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Conquista"
  ADD CONSTRAINT "Conquista_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MensagemNutri"
  ADD CONSTRAINT "MensagemNutri_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MensagemNutri"
  ADD CONSTRAINT "MensagemNutri_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
