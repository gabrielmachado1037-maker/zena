-- Aderência por dias + encerramento do desafio (concluído ou não-concluído).
ALTER TABLE "DesafioProgresso" ADD COLUMN "diasCumpridos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DesafioProgresso" ADD COLUMN "encerradoEm" TIMESTAMP(3);
