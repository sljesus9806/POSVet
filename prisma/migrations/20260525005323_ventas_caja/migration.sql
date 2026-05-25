-- CreateEnum
CREATE TYPE "EstadoCaja" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "FormaPago" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO');

-- CreateTable
CREATE TABLE "Caja" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "ubicacionId" TEXT NOT NULL,
    "abiertaPorId" TEXT NOT NULL,
    "cerradaPorId" TEXT,
    "estado" "EstadoCaja" NOT NULL DEFAULT 'ABIERTA',
    "fondoInicial" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montoEsperadoEfectivo" DECIMAL(12,2),
    "montoContadoEfectivo" DECIMAL(12,2),
    "diferenciaEfectivo" DECIMAL(12,2),
    "totalVendido" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "observacionesApertura" TEXT,
    "observacionesCierre" TEXT,
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "cajaId" TEXT NOT NULL,
    "ubicacionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "clienteId" TEXT,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'COMPLETADA',
    "tipoPrecio" "TipoPrecio" NOT NULL DEFAULT 'PUBLICO',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descuentoLineas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descuentoGlobal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "iva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cambio" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "motivoCancelacion" TEXT,
    "canceladaPorId" TEXT,
    "canceladaEn" TIMESTAMP(3),
    "fechaVenta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaLinea" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "loteId" TEXT,
    "productoSku" TEXT NOT NULL,
    "productoNombre" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "ivaTasa" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "ivaImporte" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "VentaLinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaPago" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "forma" "FormaPago" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "referencia" TEXT,

    CONSTRAINT "VentaPago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Caja_folio_key" ON "Caja"("folio");

-- CreateIndex
CREATE INDEX "Caja_ubicacionId_estado_idx" ON "Caja"("ubicacionId", "estado");

-- CreateIndex
CREATE INDEX "Caja_abiertaPorId_estado_idx" ON "Caja"("abiertaPorId", "estado");

-- CreateIndex
CREATE INDEX "Caja_abiertaEn_idx" ON "Caja"("abiertaEn");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_folio_key" ON "Venta"("folio");

-- CreateIndex
CREATE INDEX "Venta_cajaId_idx" ON "Venta"("cajaId");

-- CreateIndex
CREATE INDEX "Venta_ubicacionId_fechaVenta_idx" ON "Venta"("ubicacionId", "fechaVenta");

-- CreateIndex
CREATE INDEX "Venta_usuarioId_fechaVenta_idx" ON "Venta"("usuarioId", "fechaVenta");

-- CreateIndex
CREATE INDEX "Venta_clienteId_idx" ON "Venta"("clienteId");

-- CreateIndex
CREATE INDEX "Venta_estado_idx" ON "Venta"("estado");

-- CreateIndex
CREATE INDEX "Venta_fechaVenta_idx" ON "Venta"("fechaVenta");

-- CreateIndex
CREATE INDEX "VentaLinea_ventaId_idx" ON "VentaLinea"("ventaId");

-- CreateIndex
CREATE INDEX "VentaLinea_productoId_idx" ON "VentaLinea"("productoId");

-- CreateIndex
CREATE INDEX "VentaPago_ventaId_idx" ON "VentaPago"("ventaId");

-- CreateIndex
CREATE INDEX "VentaPago_forma_idx" ON "VentaPago"("forma");

-- AddForeignKey
ALTER TABLE "Caja" ADD CONSTRAINT "Caja_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caja" ADD CONSTRAINT "Caja_abiertaPorId_fkey" FOREIGN KEY ("abiertaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caja" ADD CONSTRAINT "Caja_cerradaPorId_fkey" FOREIGN KEY ("cerradaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "Caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_canceladaPorId_fkey" FOREIGN KEY ("canceladaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaLinea" ADD CONSTRAINT "VentaLinea_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaLinea" ADD CONSTRAINT "VentaLinea_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaLinea" ADD CONSTRAINT "VentaLinea_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "ProductoLote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaPago" ADD CONSTRAINT "VentaPago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
