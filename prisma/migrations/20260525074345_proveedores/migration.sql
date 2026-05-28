-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rfc" TEXT,
    "regimenFiscal" TEXT,
    "codigoPostal" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "contacto" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "diasCredito" INTEGER NOT NULL DEFAULT 0,
    "saldoActual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProveedorProducto" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "codigoProveedor" TEXT,
    "costoUnitario" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "esPreferido" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProveedorProducto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_codigo_key" ON "Proveedor"("codigo");

-- CreateIndex
CREATE INDEX "Proveedor_nombre_idx" ON "Proveedor"("nombre");

-- CreateIndex
CREATE INDEX "Proveedor_rfc_idx" ON "Proveedor"("rfc");

-- CreateIndex
CREATE INDEX "Proveedor_activo_idx" ON "Proveedor"("activo");

-- CreateIndex
CREATE INDEX "ProveedorProducto_productoId_idx" ON "ProveedorProducto"("productoId");

-- CreateIndex
CREATE INDEX "ProveedorProducto_proveedorId_esPreferido_idx" ON "ProveedorProducto"("proveedorId", "esPreferido");

-- CreateIndex
CREATE UNIQUE INDEX "ProveedorProducto_proveedorId_productoId_key" ON "ProveedorProducto"("proveedorId", "productoId");

-- AddForeignKey
ALTER TABLE "ProveedorProducto" ADD CONSTRAINT "ProveedorProducto_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorProducto" ADD CONSTRAINT "ProveedorProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
