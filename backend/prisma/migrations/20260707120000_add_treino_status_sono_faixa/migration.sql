-- Treino em 3 estados (conforme/parcial/nao) + motivo quando não treinou
ALTER TABLE "Registro" ADD COLUMN "treinoStatus" TEXT;
ALTER TABLE "Registro" ADD COLUMN "treinoMotivo" TEXT;

-- Sono por faixa de horas (menos5 / 5a7 / 7a9 / mais9)
ALTER TABLE "Registro" ADD COLUMN "sonoFaixa" TEXT;

-- Retrocompat: registros que já tinham treino/sono como booleano viram o estado "cheio".
UPDATE "Registro" SET "treinoStatus" = 'conforme' WHERE "treinoOk" = true AND "treinoStatus" IS NULL;
UPDATE "Registro" SET "sonoFaixa" = '7a9' WHERE "sonoOk" = true AND "sonoFaixa" IS NULL;
