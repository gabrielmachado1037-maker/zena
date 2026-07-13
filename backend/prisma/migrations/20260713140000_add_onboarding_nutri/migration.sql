-- Onboarding de 1º acesso da nutricionista (guia de configuração da clínica).
ALTER TABLE "Nutricionista" ADD COLUMN "onboardingStatus" TEXT NOT NULL DEFAULT 'pendente';
ALTER TABLE "Nutricionista" ADD COLUMN "onboardingConviteEnviado" BOOLEAN NOT NULL DEFAULT false;

-- Grandfather: contas já existentes NÃO veem o onboarding (só cadastros novos).
UPDATE "Nutricionista" SET "onboardingStatus" = 'concluido';
