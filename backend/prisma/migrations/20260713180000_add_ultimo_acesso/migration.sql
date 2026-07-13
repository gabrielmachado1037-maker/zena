-- Último acesso ao app (abertura), base da reativação de notificações.
ALTER TABLE "Paciente" ADD COLUMN "ultimoAcesso" TIMESTAMP(3);
