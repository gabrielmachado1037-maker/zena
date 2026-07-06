-- Detalhe por refeição no Registro diário (nullable = sem dado para registros antigos)
ALTER TABLE "Registro" ADD COLUMN "cafeOk" BOOLEAN;
ALTER TABLE "Registro" ADD COLUMN "almocoOk" BOOLEAN;
ALTER TABLE "Registro" ADD COLUMN "lancheOk" BOOLEAN;
ALTER TABLE "Registro" ADD COLUMN "jantarOk" BOOLEAN;
