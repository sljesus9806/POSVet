-- DropForeignKey
ALTER TABLE "OrdenCompra" DROP CONSTRAINT "OrdenCompra_proveedorId_fkey";

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "preciosIncluyenIva" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "proveedorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
