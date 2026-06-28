-- Índice mais crítico: busca de pacientes por nutricionista (toda query autenticada)
CREATE INDEX IF NOT EXISTS "Paciente_nutricionistaId_idx" ON "Paciente"("nutricionistaId");

-- Cobranças: filtros por paciente, status e data de vencimento
CREATE INDEX IF NOT EXISTS "Cobranca_pacienteId_idx" ON "Cobranca"("pacienteId");
CREATE INDEX IF NOT EXISTS "Cobranca_status_idx" ON "Cobranca"("status");
CREATE INDEX IF NOT EXISTS "Cobranca_vencimento_idx" ON "Cobranca"("vencimento");

-- Consultas: join com paciente e range de datas (cron + agenda)
CREATE INDEX IF NOT EXISTS "Consulta_pacienteId_idx" ON "Consulta"("pacienteId");
CREATE INDEX IF NOT EXISTS "Consulta_data_idx" ON "Consulta"("data");

-- Lembretes: filtros por nutricionista e status
CREATE INDEX IF NOT EXISTS "Lembrete_nutricionistaId_idx" ON "Lembrete"("nutricionistaId");
CREATE INDEX IF NOT EXISTS "Lembrete_status_idx" ON "Lembrete"("status");

-- Demais modelos vinculados ao paciente
CREATE INDEX IF NOT EXISTS "CheckIn_pacienteId_idx" ON "CheckIn"("pacienteId");
CREATE INDEX IF NOT EXISTS "Medicao_pacienteId_idx" ON "Medicao"("pacienteId");
CREATE INDEX IF NOT EXISTS "MensagemWhatsApp_pacienteId_idx" ON "MensagemWhatsApp"("pacienteId");
CREATE INDEX IF NOT EXISTS "FotoEvolucao_pacienteId_idx" ON "FotoEvolucao"("pacienteId");
CREATE INDEX IF NOT EXISTS "PlanoAlimentar_pacienteId_idx" ON "PlanoAlimentar"("pacienteId");
CREATE INDEX IF NOT EXISTS "RegistroContato_pacienteId_idx" ON "RegistroContato"("pacienteId");
