-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('PUBLICO', 'MAYOREO', 'VETERINARIO', 'GRANJA');

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rfc" TEXT,
    "regimenFiscal" TEXT,
    "usoCFDI" TEXT,
    "codigoPostal" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "notas" TEXT,
    "tipoCliente" "TipoCliente" NOT NULL DEFAULT 'PUBLICO',
    "tipoPrecio" "TipoPrecio",
    "lineaCredito" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "diasCredito" INTEGER NOT NULL DEFAULT 0,
    "saldoActual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_codigo_key" ON "Cliente"("codigo");

-- CreateIndex
CREATE INDEX "Cliente_nombre_idx" ON "Cliente"("nombre");

-- CreateIndex
CREATE INDEX "Cliente_rfc_idx" ON "Cliente"("rfc");

-- CreateIndex
CREATE INDEX "Cliente_tipoCliente_idx" ON "Cliente"("tipoCliente");

-- CreateIndex
CREATE INDEX "Cliente_activo_idx" ON "Cliente"("activo");
