-- CreateEnum
CREATE TYPE "EstadoOrdenCompra" AS ENUM ('BORRADOR', 'ENVIADA', 'RECIBIDA_PARCIAL', 'RECIBIDA_TOTAL', 'CANCELADA');

-- CreateTable
CREATE TABLE "OrdenCompra" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "ubicacionDestinoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estado" "EstadoOrdenCompra" NOT NULL DEFAULT 'BORRADOR',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "iva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fechaEsperada" TIMESTAMP(3),
    "observaciones" TEXT,
    "enviadaEn" TIMESTAMP(3),
    "cerradaEn" TIMESTAMP(3),
    "motivoCancelacion" TEXT,
    "canceladaPorId" TEXT,
    "canceladaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcLinea" (
    "id" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "productoSku" TEXT NOT NULL,
    "productoNombre" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "codigoProveedor" TEXT,
    "cantidadSolicitada" DECIMAL(14,3) NOT NULL,
    "cantidadRecibida" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(12,4) NOT NULL,
    "ivaTasa" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "ivaImporte" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "OcLinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecepcionMercancia" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "ubicacionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "observaciones" TEXT,
    "fechaRecepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecepcionMercancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecepcionLinea" (
    "id" TEXT NOT NULL,
    "recepcionId" TEXT NOT NULL,
    "ocLineaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "costoUnitario" DECIMAL(12,4) NOT NULL,
    "lote" TEXT,
    "caducidad" TIMESTAMP(3),
    "loteId" TEXT,

    CONSTRAINT "RecepcionLinea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_folio_key" ON "OrdenCompra"("folio");

-- CreateIndex
CREATE INDEX "OrdenCompra_proveedorId_idx" ON "OrdenCompra"("proveedorId");

-- CreateIndex
CREATE INDEX "OrdenCompra_estado_idx" ON "OrdenCompra"("estado");

-- CreateIndex
CREATE INDEX "OrdenCompra_ubicacionDestinoId_estado_idx" ON "OrdenCompra"("ubicacionDestinoId", "estado");

-- CreateIndex
CREATE INDEX "OrdenCompra_createdAt_idx" ON "OrdenCompra"("createdAt");

-- CreateIndex
CREATE INDEX "OcLinea_ordenCompraId_idx" ON "OcLinea"("ordenCompraId");

-- CreateIndex
CREATE INDEX "OcLinea_productoId_idx" ON "OcLinea"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "RecepcionMercancia_folio_key" ON "RecepcionMercancia"("folio");

-- CreateIndex
CREATE INDEX "RecepcionMercancia_ordenCompraId_idx" ON "RecepcionMercancia"("ordenCompraId");

-- CreateIndex
CREATE INDEX "RecepcionMercancia_ubicacionId_fechaRecepcion_idx" ON "RecepcionMercancia"("ubicacionId", "fechaRecepcion");

-- CreateIndex
CREATE INDEX "RecepcionLinea_recepcionId_idx" ON "RecepcionLinea"("recepcionId");

-- CreateIndex
CREATE INDEX "RecepcionLinea_ocLineaId_idx" ON "RecepcionLinea"("ocLineaId");

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_ubicacionDestinoId_fkey" FOREIGN KEY ("ubicacionDestinoId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_canceladaPorId_fkey" FOREIGN KEY ("canceladaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcLinea" ADD CONSTRAINT "OcLinea_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcLinea" ADD CONSTRAINT "OcLinea_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecepcionMercancia" ADD CONSTRAINT "RecepcionMercancia_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecepcionMercancia" ADD CONSTRAINT "RecepcionMercancia_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecepcionMercancia" ADD CONSTRAINT "RecepcionMercancia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecepcionLinea" ADD CONSTRAINT "RecepcionLinea_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "RecepcionMercancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecepcionLinea" ADD CONSTRAINT "RecepcionLinea_ocLineaId_fkey" FOREIGN KEY ("ocLineaId") REFERENCES "OcLinea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecepcionLinea" ADD CONSTRAINT "RecepcionLinea_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecepcionLinea" ADD CONSTRAINT "RecepcionLinea_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "ProductoLote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
