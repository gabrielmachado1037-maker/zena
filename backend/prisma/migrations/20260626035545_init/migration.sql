-- CreateTable
CREATE TABLE "Nutricionista" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "crn" TEXT NOT NULL,
    "foto" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "objetivo" TEXT NOT NULL,
    "dataInicio" DATETIME NOT NULL,
    "linkUnico" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "pesoMeta" REAL,
    "nutricionistaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Paciente_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "Nutricionista" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medicao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "peso" REAL NOT NULL,
    "gordura" REAL,
    "musculo" REAL,
    "cintura" REAL,
    "quadril" REAL,
    "laudo" TEXT,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Medicao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanoAlimentar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "dataCriacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cafeManha" TEXT NOT NULL,
    "lancheManha" TEXT,
    "almoco" TEXT NOT NULL,
    "lancheTarde" TEXT,
    "jantar" TEXT NOT NULL,
    "ceia" TEXT,
    "observacoes" TEXT,
    CONSTRAINT "PlanoAlimentar_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'agendada',
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Consulta_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cobranca" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "vencimento" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "metodo" TEXT,
    "pagoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cobranca_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Nutricionista_email_key" ON "Nutricionista"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_linkUnico_key" ON "Paciente"("linkUnico");
