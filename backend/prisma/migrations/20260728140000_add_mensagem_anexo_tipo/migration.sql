-- Distingue o tipo do anexo do chat (imagem vs áudio). null = mensagem de texto.
ALTER TABLE "MensagemChat" ADD COLUMN "anexoTipo" TEXT;
