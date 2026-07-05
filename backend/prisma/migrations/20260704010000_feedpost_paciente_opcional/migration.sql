-- Comunidade: permitir posts da nutri no Mural (sem paciente-alvo).
-- pacienteId passa a ser opcional. Aditivo e seguro — linhas existentes já têm valor.
ALTER TABLE "FeedPost" ALTER COLUMN "pacienteId" DROP NOT NULL;
