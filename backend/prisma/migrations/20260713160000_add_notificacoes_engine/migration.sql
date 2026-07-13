-- NotificationEngine: preferências, fuso, log central e captura de horário das ações.
ALTER TABLE "Paciente" ADD COLUMN "prefsNotificacao" JSONB;
ALTER TABLE "Paciente" ADD COLUMN "timezone" TEXT;

CREATE TABLE "NotificacaoLog" (
  "id" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "dedupeKey" TEXT,
  "titulo" TEXT NOT NULL,
  "corpo" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "motivo" TEXT,
  "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "abertaEm" TIMESTAMP(3),
  CONSTRAINT "NotificacaoLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NotificacaoLog_pacienteId_enviadoEm_idx" ON "NotificacaoLog"("pacienteId", "enviadoEm");
CREATE INDEX "NotificacaoLog_pacienteId_dedupeKey_idx" ON "NotificacaoLog"("pacienteId", "dedupeKey");
ALTER TABLE "NotificacaoLog" ADD CONSTRAINT "NotificacaoLog_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RegistroEvento" (
  "id" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "ocorridoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistroEvento_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RegistroEvento_pacienteId_tipo_idx" ON "RegistroEvento"("pacienteId", "tipo");
ALTER TABLE "RegistroEvento" ADD CONSTRAINT "RegistroEvento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
