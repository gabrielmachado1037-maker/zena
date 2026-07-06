-- Marca de "registro revisado pela nutricionista" na tela Registros Diários
ALTER TABLE "Registro" ADD COLUMN "revisado" BOOLEAN NOT NULL DEFAULT false;
