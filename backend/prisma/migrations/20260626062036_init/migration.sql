-- CreateTable
CREATE TABLE "Nutricionista" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "crn" TEXT NOT NULL,
    "foto" TEXT,
    "plano" TEXT NOT NULL DEFAULT 'trial',
    "planoAtivo" BOOLEAN NOT NULL DEFAULT true,
    "trialEnd" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nutricionista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenRedefinicao" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRedefinicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "objetivo" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "linkUnico" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "pesoMeta" DOUBLE PRECISION,
    "fotoInicial" TEXT,
    "nutricionistaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anamnese" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "queixaPrincipal" TEXT,
    "historicoDieta" TEXT,
    "restricoes" TEXT,
    "medicamentos" TEXT,
    "condicoesSaude" TEXT,
    "nivelAtividade" TEXT,
    "horasSono" INTEGER,
    "nivelEstresse" INTEGER,
    "refeicoesDia" INTEGER,
    "comeCozinha" BOOLEAN,
    "comeForaCasa" INTEGER,
    "consumoAgua" DOUBLE PRECISION,
    "motivacao" TEXT,
    "expectativas" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anamnese_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioDisponivel" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "hora" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "duracaoMinutos" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "HorarioDisponivel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lembrete" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "referencia" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lembrete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "semana" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "humor" INTEGER NOT NULL,
    "adesao" INTEGER NOT NULL,
    "peso" DOUBLE PRECISION,
    "foto" TEXT,
    "nota" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemWhatsApp" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "textoEnviado" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "gordura" DOUBLE PRECISION,
    "musculo" DOUBLE PRECISION,
    "cintura" DOUBLE PRECISION,
    "quadril" DOUBLE PRECISION,
    "laudo" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanoAlimentar" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cafeManha" TEXT NOT NULL,
    "lancheManha" TEXT,
    "almoco" TEXT NOT NULL,
    "lancheTarde" TEXT,
    "jantar" TEXT NOT NULL,
    "ceia" TEXT,
    "observacoes" TEXT,

    CONSTRAINT "PlanoAlimentar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'agendada',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cobranca" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "metodo" TEXT,
    "pagoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cobranca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Nutricionista_email_key" ON "Nutricionista"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TokenRedefinicao_token_key" ON "TokenRedefinicao"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_linkUnico_key" ON "Paciente"("linkUnico");

-- CreateIndex
CREATE UNIQUE INDEX "Anamnese_pacienteId_key" ON "Anamnese"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioDisponivel_nutricionistaId_diaSemana_hora_key" ON "HorarioDisponivel"("nutricionistaId", "diaSemana", "hora");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_pacienteId_semana_ano_key" ON "CheckIn"("pacienteId", "semana", "ano");

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnese" ADD CONSTRAINT "Anamnese_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioDisponivel" ADD CONSTRAINT "HorarioDisponivel_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lembrete" ADD CONSTRAINT "Lembrete_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lembrete" ADD CONSTRAINT "Lembrete_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemWhatsApp" ADD CONSTRAINT "MensagemWhatsApp_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicao" ADD CONSTRAINT "Medicao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoAlimentar" ADD CONSTRAINT "PlanoAlimentar_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
