-- CreateTable
CREATE TABLE "Licencia" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "instalacion" TEXT NOT NULL,
    "ultimaValidacion" TIMESTAMP(3),
    "ultimoEstado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Licencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Licencia_instalacion_key" ON "Licencia"("instalacion");
