-- CreateTable
CREATE TABLE "Anamnese" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "consumoAgua" REAL,
    "motivacao" TEXT,
    "expectativas" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Anamnese_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HorarioDisponivel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nutricionistaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "hora" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "duracaoMinutos" INTEGER NOT NULL DEFAULT 60,
    CONSTRAINT "HorarioDisponivel_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lembrete" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nutricionistaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "referencia" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Lembrete_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lembrete_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Anamnese_pacienteId_key" ON "Anamnese"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioDisponivel_nutricionistaId_diaSemana_hora_key" ON "HorarioDisponivel"("nutricionistaId", "diaSemana", "hora");
