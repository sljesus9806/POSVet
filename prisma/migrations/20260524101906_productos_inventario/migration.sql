-- CreateEnum
CREATE TYPE "TipoProducto" AS ENUM ('MEDICAMENTO', 'ALIMENTO', 'ACCESORIO', 'SERVICIO');

-- CreateEnum
CREATE TYPE "TipoPrecio" AS ENUM ('PUBLICO', 'MAYOREO', 'VETERINARIO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "MotivoMovimiento" AS ENUM ('COMPRA', 'VENTA', 'DEVOLUCION_CLIENTE', 'DEVOLUCION_PROVEEDOR', 'AJUSTE_MERMA', 'AJUSTE_CADUCIDAD', 'AJUSTE_ROBO', 'AJUSTE_CONTEO', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_ENTRADA', 'STOCK_INICIAL');

-- CreateEnum
CREATE TYPE "EstadoTransferencia" AS ENUM ('PENDIENTE', 'COMPLETADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "codigoBarras" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "marca" TEXT,
    "categoriaId" TEXT,
    "unidadMedida" TEXT NOT NULL,
    "tipo" "TipoProducto" NOT NULL,
    "especie" TEXT,
    "requiereReceta" BOOLEAN NOT NULL DEFAULT false,
    "sustanciaControlada" BOOLEAN NOT NULL DEFAULT false,
    "laboratorio" TEXT,
    "viaAdministracion" TEXT,
    "claveSAT" TEXT NOT NULL DEFAULT '01010101',
    "ivaAplicable" DECIMAL(5,4) NOT NULL DEFAULT 0.16,
    "ultimoCosto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costoPromedio" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoPrecio" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipo" "TipoPrecio" NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoPrecio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoLote" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "lote" TEXT NOT NULL,
    "caducidad" TIMESTAMP(3) NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventario" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "ubicacionId" TEXT NOT NULL,
    "stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "stockMinimo" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "stockMaximo" DECIMAL(14,3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventarioMovimiento" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "ubicacionId" TEXT NOT NULL,
    "loteId" TEXT,
    "tipo" "TipoMovimiento" NOT NULL,
    "motivo" "MotivoMovimiento" NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "costoUnitario" DECIMAL(12,2),
    "stockResultante" DECIMAL(14,3) NOT NULL,
    "referenciaTipo" TEXT,
    "referenciaId" TEXT,
    "observaciones" TEXT,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventarioMovimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transferencia" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "origenId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estado" "EstadoTransferencia" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "completadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferenciaLinea" (
    "id" TEXT NOT NULL,
    "transferenciaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "TransferenciaLinea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_sku_key" ON "Producto"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigoBarras_key" ON "Producto"("codigoBarras");

-- CreateIndex
CREATE INDEX "Producto_categoriaId_idx" ON "Producto"("categoriaId");

-- CreateIndex
CREATE INDEX "Producto_tipo_idx" ON "Producto"("tipo");

-- CreateIndex
CREATE INDEX "Producto_activo_idx" ON "Producto"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoPrecio_productoId_tipo_key" ON "ProductoPrecio"("productoId", "tipo");

-- CreateIndex
CREATE INDEX "ProductoLote_caducidad_idx" ON "ProductoLote"("caducidad");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoLote_productoId_lote_key" ON "ProductoLote"("productoId", "lote");

-- CreateIndex
CREATE INDEX "Inventario_ubicacionId_idx" ON "Inventario"("ubicacionId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventario_productoId_ubicacionId_key" ON "Inventario"("productoId", "ubicacionId");

-- CreateIndex
CREATE INDEX "InventarioMovimiento_productoId_fecha_idx" ON "InventarioMovimiento"("productoId", "fecha");

-- CreateIndex
CREATE INDEX "InventarioMovimiento_ubicacionId_fecha_idx" ON "InventarioMovimiento"("ubicacionId", "fecha");

-- CreateIndex
CREATE INDEX "InventarioMovimiento_referenciaTipo_referenciaId_idx" ON "InventarioMovimiento"("referenciaTipo", "referenciaId");

-- CreateIndex
CREATE INDEX "InventarioMovimiento_fecha_idx" ON "InventarioMovimiento"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_folio_key" ON "Transferencia"("folio");

-- CreateIndex
CREATE INDEX "Transferencia_origenId_idx" ON "Transferencia"("origenId");

-- CreateIndex
CREATE INDEX "Transferencia_destinoId_idx" ON "Transferencia"("destinoId");

-- CreateIndex
CREATE INDEX "Transferencia_estado_idx" ON "Transferencia"("estado");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoPrecio" ADD CONSTRAINT "ProductoPrecio_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoLote" ADD CONSTRAINT "ProductoLote_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioMovimiento" ADD CONSTRAINT "InventarioMovimiento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioMovimiento" ADD CONSTRAINT "InventarioMovimiento_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioMovimiento" ADD CONSTRAINT "InventarioMovimiento_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "ProductoLote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioMovimiento" ADD CONSTRAINT "InventarioMovimiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferenciaLinea" ADD CONSTRAINT "TransferenciaLinea_transferenciaId_fkey" FOREIGN KEY ("transferenciaId") REFERENCES "Transferencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferenciaLinea" ADD CONSTRAINT "TransferenciaLinea_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
