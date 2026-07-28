-- Paciente B2C do marketplace: cadastro avulso, sem clínica/nutri cliente do SaaS.
ALTER TABLE "Paciente" ADD COLUMN "avulso" BOOLEAN NOT NULL DEFAULT false;
