-- AlterTable
ALTER TABLE "DesafioProgresso" ADD COLUMN "diasManuais" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
