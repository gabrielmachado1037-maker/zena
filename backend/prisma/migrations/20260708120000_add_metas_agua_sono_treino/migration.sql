-- Metas configuradas pela nutri por paciente (null = padrão do sistema).
ALTER TABLE "Paciente" ADD COLUMN "aguaMetaMl" INTEGER;
ALTER TABLE "Paciente" ADD COLUMN "sonoMetaHoras" INTEGER;
-- Dias da semana com missão de treino (0=domingo..6=sábado; vazio = todo dia).
ALTER TABLE "Paciente" ADD COLUMN "treinoDias" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- Horas dormidas informadas pelo paciente (pontua por tolerância vs sonoMetaHoras).
ALTER TABLE "Registro" ADD COLUMN "sonoHoras" DOUBLE PRECISION;
