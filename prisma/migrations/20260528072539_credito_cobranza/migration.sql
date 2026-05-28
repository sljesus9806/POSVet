-- CreateEnum
CREATE TYPE "FormaPagoAbono" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoClienteAbono" AS ENUM ('REGISTRADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "montoCredito" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "saldoCredito" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ClienteAbono" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formaPago" "FormaPagoAbono" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "referencia" TEXT,
    "observaciones" TEXT,
    "estado" "EstadoClienteAbono" NOT NULL DEFAULT 'REGISTRADO',
    "motivoCancelacion" TEXT,
    "canceladoPorId" TEXT,
    "canceladoEn" TIMESTAMP(3),
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteAbono_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonoVentaAplicacion" (
    "id" TEXT NOT NULL,
    "abonoId" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "AbonoVentaAplicacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClienteAbono_folio_key" ON "ClienteAbono"("folio");

-- CreateIndex
CREATE INDEX "ClienteAbono_clienteId_fecha_idx" ON "ClienteAbono"("clienteId", "fecha");

-- CreateIndex
CREATE INDEX "ClienteAbono_estado_idx" ON "ClienteAbono"("estado");

-- CreateIndex
CREATE INDEX "ClienteAbono_fecha_idx" ON "ClienteAbono"("fecha");

-- CreateIndex
CREATE INDEX "AbonoVentaAplicacion_ventaId_idx" ON "AbonoVentaAplicacion"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "AbonoVentaAplicacion_abonoId_ventaId_key" ON "AbonoVentaAplicacion"("abonoId", "ventaId");

-- AddForeignKey
ALTER TABLE "ClienteAbono" ADD CONSTRAINT "ClienteAbono_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteAbono" ADD CONSTRAINT "ClienteAbono_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteAbono" ADD CONSTRAINT "ClienteAbono_canceladoPorId_fkey" FOREIGN KEY ("canceladoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonoVentaAplicacion" ADD CONSTRAINT "AbonoVentaAplicacion_abonoId_fkey" FOREIGN KEY ("abonoId") REFERENCES "ClienteAbono"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonoVentaAplicacion" ADD CONSTRAINT "AbonoVentaAplicacion_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
