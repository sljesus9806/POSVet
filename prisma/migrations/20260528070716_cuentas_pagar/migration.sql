-- CreateEnum
CREATE TYPE "EstadoFacturaProveedor" AS ENUM ('PENDIENTE', 'PAGADA_PARCIAL', 'PAGADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "FormaPagoProveedor" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoProveedorPago" AS ENUM ('REGISTRADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "FacturaProveedor" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "folioProveedor" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "ordenCompraId" TEXT,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "iva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoFacturaProveedor" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "motivoCancelacion" TEXT,
    "canceladaPorId" TEXT,
    "canceladaEn" TIMESTAMP(3),
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacturaProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProveedorPago" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formaPago" "FormaPagoProveedor" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "referencia" TEXT,
    "observaciones" TEXT,
    "estado" "EstadoProveedorPago" NOT NULL DEFAULT 'REGISTRADO',
    "motivoCancelacion" TEXT,
    "canceladoPorId" TEXT,
    "canceladoEn" TIMESTAMP(3),
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProveedorPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoFacturaAplicacion" (
    "id" TEXT NOT NULL,
    "pagoId" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PagoFacturaAplicacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacturaProveedor_folio_key" ON "FacturaProveedor"("folio");

-- CreateIndex
CREATE INDEX "FacturaProveedor_proveedorId_estado_idx" ON "FacturaProveedor"("proveedorId", "estado");

-- CreateIndex
CREATE INDEX "FacturaProveedor_estado_idx" ON "FacturaProveedor"("estado");

-- CreateIndex
CREATE INDEX "FacturaProveedor_fechaVencimiento_idx" ON "FacturaProveedor"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "FacturaProveedor_ordenCompraId_idx" ON "FacturaProveedor"("ordenCompraId");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaProveedor_proveedorId_folioProveedor_key" ON "FacturaProveedor"("proveedorId", "folioProveedor");

-- CreateIndex
CREATE UNIQUE INDEX "ProveedorPago_folio_key" ON "ProveedorPago"("folio");

-- CreateIndex
CREATE INDEX "ProveedorPago_proveedorId_fecha_idx" ON "ProveedorPago"("proveedorId", "fecha");

-- CreateIndex
CREATE INDEX "ProveedorPago_estado_idx" ON "ProveedorPago"("estado");

-- CreateIndex
CREATE INDEX "ProveedorPago_fecha_idx" ON "ProveedorPago"("fecha");

-- CreateIndex
CREATE INDEX "PagoFacturaAplicacion_facturaId_idx" ON "PagoFacturaAplicacion"("facturaId");

-- CreateIndex
CREATE UNIQUE INDEX "PagoFacturaAplicacion_pagoId_facturaId_key" ON "PagoFacturaAplicacion"("pagoId", "facturaId");

-- AddForeignKey
ALTER TABLE "FacturaProveedor" ADD CONSTRAINT "FacturaProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaProveedor" ADD CONSTRAINT "FacturaProveedor_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaProveedor" ADD CONSTRAINT "FacturaProveedor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaProveedor" ADD CONSTRAINT "FacturaProveedor_canceladaPorId_fkey" FOREIGN KEY ("canceladaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorPago" ADD CONSTRAINT "ProveedorPago_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorPago" ADD CONSTRAINT "ProveedorPago_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorPago" ADD CONSTRAINT "ProveedorPago_canceladoPorId_fkey" FOREIGN KEY ("canceladoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoFacturaAplicacion" ADD CONSTRAINT "PagoFacturaAplicacion_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "ProveedorPago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoFacturaAplicacion" ADD CONSTRAINT "PagoFacturaAplicacion_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "FacturaProveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
