-- CreateEnum
CREATE TYPE "TipoCfdi" AS ENUM ('INGRESO', 'EGRESO', 'PAGO');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('TIMBRADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "folio" INTEGER NOT NULL,
    "tipo" "TipoCfdi" NOT NULL DEFAULT 'INGRESO',
    "estado" "EstadoFactura" NOT NULL DEFAULT 'TIMBRADA',
    "emisorRfc" TEXT NOT NULL,
    "emisorNombre" TEXT NOT NULL,
    "emisorRegimen" TEXT NOT NULL,
    "lugarExpedicion" TEXT NOT NULL,
    "receptorRfc" TEXT NOT NULL,
    "receptorNombre" TEXT NOT NULL,
    "receptorRegimen" TEXT NOT NULL,
    "receptorUsoCfdi" TEXT NOT NULL,
    "receptorCp" TEXT NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "iva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "formaPago" TEXT NOT NULL,
    "metodoPago" TEXT NOT NULL DEFAULT 'PUE',
    "uuid" TEXT,
    "fechaTimbrado" TIMESTAMP(3),
    "selloCfd" TEXT,
    "selloSat" TEXT,
    "noCertificadoSat" TEXT,
    "xml" TEXT,
    "pacProveedor" TEXT NOT NULL DEFAULT 'demo',
    "pacFacturaId" TEXT,
    "esDemo" BOOLEAN NOT NULL DEFAULT false,
    "motivoCancelacion" TEXT,
    "folioSustitucion" TEXT,
    "canceladaEn" TIMESTAMP(3),
    "canceladaPorId" TEXT,
    "ventaId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaLinea" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "claveProdServ" TEXT NOT NULL,
    "claveUnidad" TEXT NOT NULL,
    "noIdentificacion" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "valorUnitario" DECIMAL(12,2) NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "objetoImp" TEXT NOT NULL DEFAULT '02',
    "ivaTasa" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "ivaImporte" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "FacturaLinea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Factura_uuid_key" ON "Factura"("uuid");

-- CreateIndex
CREATE INDEX "Factura_ventaId_idx" ON "Factura"("ventaId");

-- CreateIndex
CREATE INDEX "Factura_estado_idx" ON "Factura"("estado");

-- CreateIndex
CREATE INDEX "Factura_receptorRfc_idx" ON "Factura"("receptorRfc");

-- CreateIndex
CREATE INDEX "Factura_fechaTimbrado_idx" ON "Factura"("fechaTimbrado");

-- CreateIndex
CREATE INDEX "Factura_uuid_idx" ON "Factura"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_serie_folio_key" ON "Factura"("serie", "folio");

-- CreateIndex
CREATE INDEX "FacturaLinea_facturaId_idx" ON "FacturaLinea"("facturaId");

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_canceladaPorId_fkey" FOREIGN KEY ("canceladaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaLinea" ADD CONSTRAINT "FacturaLinea_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
