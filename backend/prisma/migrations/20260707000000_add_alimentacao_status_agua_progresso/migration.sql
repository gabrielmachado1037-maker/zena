-- Estado por refeição (3 estados: seguiu | adaptou | pulou) + notas por refeição
ALTER TABLE "Registro" ADD COLUMN "cafeStatus" TEXT;
ALTER TABLE "Registro" ADD COLUMN "almocoStatus" TEXT;
ALTER TABLE "Registro" ADD COLUMN "lancheStatus" TEXT;
ALTER TABLE "Registro" ADD COLUMN "jantarStatus" TEXT;
ALTER TABLE "Registro" ADD COLUMN "refeicoesNotas" JSONB;

-- Água como progresso (ml) em vez de booleano
ALTER TABLE "Registro" ADD COLUMN "aguaMl" INTEGER;
ALTER TABLE "Registro" ADD COLUMN "aguaMetaMl" INTEGER;

-- Dia finalizado (fechado) — controla quando o registro credita pontos/streak
ALTER TABLE "Registro" ADD COLUMN "finalizado" BOOLEAN NOT NULL DEFAULT false;

-- Registros antigos que já pontuaram são considerados finalizados (retrocompat).
UPDATE "Registro" SET "finalizado" = true WHERE "pontosGanhos" > 0;
