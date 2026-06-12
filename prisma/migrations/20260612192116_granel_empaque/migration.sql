-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MotivoMovimiento" ADD VALUE 'FRACCIONAMIENTO_SALIDA';
ALTER TYPE "MotivoMovimiento" ADD VALUE 'FRACCIONAMIENTO_ENTRADA';

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "contenidoGranel" DECIMAL(14,3),
ADD COLUMN     "productoGranelId" TEXT;

-- CreateIndex
CREATE INDEX "Producto_productoGranelId_idx" ON "Producto"("productoGranelId");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_productoGranelId_fkey" FOREIGN KEY ("productoGranelId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
